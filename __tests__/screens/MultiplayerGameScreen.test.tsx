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
  const mockCard: Card = { suit: 'hearts', rank: '5' };
  const mockCard2: Card = { suit: 'hearts', rank: '6' };
  
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
      { playerId: 'player-1', handCount: 5, connected: true, isBot: false },
      { playerId: 'player-2', handCount: 5, connected: true, isBot: false },
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

    it('should show alert on game over', async () => {
      render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
          onPlayAgain={mockOnPlayAgain}
        />
      );

      capturedCallbacks.onGameOver?.('player-1', 'You win!');

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Game Over',
          'You win!',
          expect.any(Array)
        );
      });
    });

    it('should show alert on error', async () => {
      render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      capturedCallbacks.onError?.('Something went wrong');

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Something went wrong');
      });
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
    it('should show quit confirmation when close button pressed', async () => {
      const { getByText } = render(
        <MultiplayerGameScreen
          transport={mockTransport}
          initialState={mockInitialState}
          initialHand={mockInitialHand}
          onBack={mockOnBack}
        />
      );

      fireEvent.press(getByText('✕'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Quit Game?',
          expect.any(String),
          expect.any(Array)
        );
      });
    });
  });
});
