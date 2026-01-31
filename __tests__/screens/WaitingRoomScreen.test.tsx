/**
 * @fileoverview Tests for WaitingRoomScreen component.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import WaitingRoomScreen from '../../screens/WaitingRoomScreen';
import { useSessionStore } from '../../stores/sessionStore';
import type { RoomInfo } from '../../networking/types';

// Mock Share
jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });

describe('WaitingRoomScreen', () => {
  const mockRoom: RoomInfo = {
    roomId: 'ABC123',
    hostId: 'player-1',
    players: [
      { playerId: 'player-1', handCount: 0, connected: true, isBot: false },
      { playerId: 'player-2', handCount: 0, connected: true, isBot: false },
    ],
  };

  const mockTransport = {
    setCallbacks: jest.fn(),
    leaveRoom: jest.fn(),
    startGame: jest.fn(),
  };

  const mockOnBack = jest.fn();
  const mockOnGameStart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();
    useSessionStore.getState().setPlayerId('player-1');
  });

  describe('rendering', () => {
    it('should render the waiting room screen', () => {
      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      expect(getByText('Waiting Room')).toBeTruthy();
    });

    it('should display the room code', () => {
      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      expect(getByText('ABC123')).toBeTruthy();
    });

    it('should display the room code label', () => {
      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      expect(getByText('Room Code')).toBeTruthy();
    });

    it('should display share button', () => {
      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      expect(getByText('📤 Share')).toBeTruthy();
    });
  });

  describe('player list', () => {
    it('should display players from session store', async () => {
      useSessionStore.getState().updatePlayers(mockRoom.players);

      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      await waitFor(() => {
        expect(getByText(/player-1/)).toBeTruthy();
        expect(getByText(/player-2/)).toBeTruthy();
      });
    });

    it('should indicate host player', async () => {
      useSessionStore.getState().updatePlayers(mockRoom.players);

      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      await waitFor(() => {
        expect(getByText(/\(Host\)/)).toBeTruthy();
      });
    });
  });

  describe('host controls', () => {
    it('should show start button for host', async () => {
      useSessionStore.getState().setRoom(mockRoom);
      useSessionStore.getState().updatePlayers(mockRoom.players);

      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      await waitFor(() => {
        expect(getByText('Start Game')).toBeTruthy();
      });
    });

    it('should call startGame when start button pressed with 2+ players', async () => {
      useSessionStore.getState().setRoom(mockRoom);
      useSessionStore.getState().updatePlayers(mockRoom.players);

      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      await waitFor(() => {
        fireEvent.press(getByText('Start Game'));
        expect(mockTransport.startGame).toHaveBeenCalled();
      });
    });
  });

  describe('share functionality', () => {
    it('should call Share.share when share button pressed', async () => {
      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      fireEvent.press(getByText('📤 Share'));

      await waitFor(() => {
        expect(Share.share).toHaveBeenCalledWith({
          message: 'Join my card game! Room code: ABC123',
        });
      });
    });
  });

  describe('navigation', () => {
    it('should call leaveRoom and onBack when back button pressed', () => {
      const { getByText } = render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      fireEvent.press(getByText('←'));

      expect(mockTransport.leaveRoom).toHaveBeenCalled();
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('transport callbacks', () => {
    it('should set up transport callbacks on mount', () => {
      render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      expect(mockTransport.setCallbacks).toHaveBeenCalledWith(
        expect.objectContaining({
          onRoomUpdated: expect.any(Function),
          onGameStart: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('should call onGameStart when game_start event received', async () => {
      render(
        <WaitingRoomScreen
          room={mockRoom}
          transport={mockTransport as any}
          onBack={mockOnBack}
          onGameStart={mockOnGameStart}
        />
      );

      // Get the callback that was set
      const { onGameStart } = mockTransport.setCallbacks.mock.calls[0][0];
      
      const mockState = { roomId: 'ABC123', currentPlayer: 0 };
      const mockHand = { roomId: 'ABC123', playerId: 'player-1', hand: [] };
      
      onGameStart(mockState, mockHand);

      expect(mockOnGameStart).toHaveBeenCalledWith(mockState, mockHand);
    });
  });
});
