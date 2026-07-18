/**
 * @fileoverview Tests for MultiplayerGameScreen component.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MultiplayerGameScreen from '../../screens/MultiplayerGameScreen';
import type { PublicGameView, PrivateHandPayload, Card } from '../../game/types';
import type { GameTransport, TransportCallbacks } from '../../networking/types';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

// Mock getValidMoves
jest.mock('../../game', () => ({
  getValidMoves: jest.fn(() => ({
    singles: [{ id: 'card-1', suit: 'hearts', rank: '5' }],
    runs: [],
  })),
}));

describe('MultiplayerGameScreen', () => {
  const mockCard: Card = { id: '5♥', suit: '♥', rank: '5' };
  const mockCard2: Card = { id: '6♥', suit: '♥', rank: '6' };
  
  const mockInitialState: PublicGameView = {
    roomId: 'ABC123',
    deckCount: 40,
    discardPile: [mockCard],
    currentPlayer: 0,
    direction: 1,
    message: 'Your turn',
    lastCardCalled: [false, false],
    drawPressure: 0,
    hasPlayed: [false, false],
    players: [
      { playerId: 'player-1', displayName: 'Alice', handCount: 5, connected: true, isBot: false },
      { playerId: 'player-2', displayName: 'Bob', handCount: 5, connected: true, isBot: false },
    ],
  };

  const mockInitialHand: PrivateHandPayload = {
    roomId: 'ABC123',
    playerId: 'player-1',
    hand: [
      { ...mockCard, id: 'card-1' },
      { ...mockCard2, id: 'card-2' },
    ] as Card[],
  };

  let mockTransport: jest.Mocked<GameTransport>;
  let capturedCallbacks: Partial<TransportCallbacks>;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallbacks = {};

    mockTransport = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      getConnectionStatus: jest.fn().mockReturnValue('connected'),
      sendAction: jest.fn(),
      setCallbacks: jest.fn((callbacks) => {
        capturedCallbacks = callbacks;
      }),
    };
  });

  const mockOnBack = jest.fn();
  const mockOnPlayAgain = jest.fn();

  describe('rendering', () => {
    it('should render the game screen', () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      expect(getByText('Your turn')).toBeTruthy();
    });

    it('should display deck count', () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      expect(getByText(/40/)).toBeTruthy();
    });

    it('should render the local player and exactly one opponent (MFP-11)', () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      // Local player and the single opponent (by display name) are shown.
      expect(getByText('👤 You')).toBeTruthy();
      expect(getByText('👤 Bob')).toBeTruthy();
    });

    it('should display action buttons', () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      expect(getByText('DRAW')).toBeTruthy();
    });
  });

  describe('transport callbacks', () => {
    it('should set up transport callbacks on mount', () => {
      render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      expect(mockTransport.setCallbacks).toHaveBeenCalledWith(
        expect.objectContaining({
          onStateUpdate: expect.any(Function),
          onHandUpdate: expect.any(Function),
          onGameOver: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('should update game state on state update', async () => {
      const { getByText, rerender } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      // Trigger state update
      capturedCallbacks.onStateUpdate?.({
        ...mockInitialState,
        message: 'Card played!',
      });

      await waitFor(() => {
        expect(getByText('Card played!')).toBeTruthy();
      });
    });

    it('shows the victory overlay when the local player wins', async () => {
      // myPlayerId is 'player-1' (from mockInitialHand)
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      capturedCallbacks.onGameOver?.('player-1', 'You win!', 'win', []);

      await waitFor(() => {
        expect(getByText('🎉 Victory!')).toBeTruthy();
      });
      expect(getByText('Congratulations! You won!')).toBeTruthy();
      // The win/lose screen is a rendered overlay, not Alert (a no-op on web).
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('shows the defeat overlay when the opponent wins', async () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      capturedCallbacks.onGameOver?.('player-2', 'Bob wins!', 'win', []);

      await waitFor(() => {
        expect(getByText('😔 Defeat')).toBeTruthy();
      });
    });

    it('shows a forfeit victory when the opponent leaves an active game', async () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      // Winner is the local player (player-1); reason distinguishes it from a
      // natural win without parsing the message.
      capturedCallbacks.onGameOver?.('player-1', 'Alice wins by forfeit!', 'forfeit', []);

      await waitFor(() => {
        expect(getByText('🎉 Victory!')).toBeTruthy();
      });
      expect(getByText('Your opponent left — you win by forfeit!')).toBeTruthy();
    });

    it('shows a toast on error', async () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      capturedCallbacks.onError?.('Something went wrong');

      await waitFor(() => {
        expect(getByText('Something went wrong')).toBeTruthy();
      });
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    it('should send DRAW_CARD action when draw button pressed', async () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      fireEvent.press(getByText('DRAW'));

      await waitFor(() => {
        expect(mockTransport.sendAction).toHaveBeenCalledWith({ type: 'DRAW_CARD' });
      });
    });
  });

  describe('quit confirmation', () => {
    it('shows an in-app confirmation dialog when close button pressed', async () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      fireEvent.press(getByText('✕'));

      // Rendered dialog (works on web), not Alert (a no-op there).
      await waitFor(() => {
        expect(getByText('Quit Game?')).toBeTruthy();
      });
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('disconnects and navigates back when quit is confirmed', async () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      fireEvent.press(getByText('✕'));
      await waitFor(() => expect(getByText('Quit Game?')).toBeTruthy());
      fireEvent.press(getByText('Quit'));

      expect(mockTransport.disconnect).toHaveBeenCalled();
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('multi-opponent rendering (3-4 players)', () => {
    const fourPlayerState: PublicGameView = {
      ...mockInitialState,
      currentPlayer: 0,
      lastCardCalled: [false, false, false, false],
      hasPlayed: [true, true, true, true],
      players: [
        { playerId: 'player-1', displayName: 'Alice', handCount: 5, connected: true, isBot: false },
        { playerId: 'player-2', displayName: 'Bob', handCount: 0, connected: true, isBot: false, status: 'finished' },
        { playerId: 'player-3', displayName: 'Carol', handCount: 0, connected: true, isBot: false, status: 'eliminated' },
        { playerId: 'player-4', displayName: 'Dave', handCount: 4, connected: false, isBot: false, status: 'active' },
      ],
    };

    it('renders every opponent with name and hand count', () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={fourPlayerState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );
      expect(getByText('Bob')).toBeTruthy();
      expect(getByText('Carol')).toBeTruthy();
      expect(getByText('Dave')).toBeTruthy();
      expect(getByText('4 cards')).toBeTruthy();
    });

    it('distinguishes finished, eliminated, and reconnecting opponents (R16)', () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={fourPlayerState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );
      expect(getByText('🏁 Finished')).toBeTruthy();
      expect(getByText('🚪 Left')).toBeTruthy();
      expect(getByText('📵 Reconnecting')).toBeTruthy();
    });
  });

  describe('game over and finishing order (3-4 players)', () => {
    const fourPlayerState: PublicGameView = {
      ...mockInitialState,
      currentPlayer: 3,
      lastCardCalled: [false, false, false, false],
      hasPlayed: [true, true, true, true],
      players: [
        { playerId: 'player-1', displayName: 'Alice', handCount: 2, connected: true, isBot: false },
        { playerId: 'player-2', displayName: 'Bob', handCount: 0, connected: true, isBot: false, status: 'finished' },
        { playerId: 'player-3', displayName: 'Carol', handCount: 4, connected: true, isBot: false },
        { playerId: 'player-4', displayName: 'Dave', handCount: 3, connected: true, isBot: false },
      ],
    };

    it('renders the finishing order on game over (U9)', async () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={fourPlayerState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      capturedCallbacks.onGameOver?.('player-2', 'Bob wins!', 'last_standing', [
        { playerId: 'player-2', place: 1, outcome: 'finished' },
        { playerId: 'player-1', place: 2, outcome: 'finished' },
        { playerId: 'player-3', place: 3, outcome: 'survivor' },
        { playerId: 'player-4', place: 4, outcome: 'eliminated' },
      ]);

      await waitFor(() => {
        expect(getByText('1. Bob')).toBeTruthy();
        expect(getByText('2. Alice (You)')).toBeTruthy();
        expect(getByText('4. Dave — left')).toBeTruthy();
      });
    });

    it('shows the interim finished banner when the local player has gone out (R6)', () => {
      const finishedState: PublicGameView = {
        ...fourPlayerState,
        players: fourPlayerState.players.map((p) =>
          p.playerId === 'player-1'
            ? { ...p, handCount: 0, status: 'finished' as const }
            : p,
        ),
      };
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={finishedState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      expect(getByText('🏁 You finished — waiting for the match to end')).toBeTruthy();
    });
  });
});
