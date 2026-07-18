/**
 * @fileoverview Tests for LobbyScreen component.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LobbyScreen from '../../screens/LobbyScreen';
import { useSessionStore } from '../../stores/sessionStore';
import { SocketTransport } from '../../networking';

// Mock SocketTransport
jest.mock('../../networking', () => ({
  SocketTransport: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    setCallbacks: jest.fn(),
    createRoom: jest.fn(),
    joinRoom: jest.fn(),
  })),
}));

describe('LobbyScreen', () => {
  const mockOnBack = jest.fn();
  const mockOnRoomJoined = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();

    // Reset SocketTransport mock
    (SocketTransport as jest.MockedClass<typeof SocketTransport>).mockClear();
  });

  describe('rendering', () => {
    it('should render the lobby screen', () => {
      const { getByText, getByPlaceholderText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      expect(getByText('Multiplayer')).toBeTruthy();
      expect(getByPlaceholderText('Enter your name')).toBeTruthy();
      expect(getByPlaceholderText('Enter room code')).toBeTruthy();
    });

    it('should render create and join buttons', () => {
      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      expect(getByText('Create Room')).toBeTruthy();
      expect(getByText('Join Room')).toBeTruthy();
    });

    it('should render back button', () => {
      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      expect(getByText('←')).toBeTruthy();
    });
  });

  describe('connection status', () => {
    it('should show connecting status initially', () => {
      useSessionStore.getState().setConnectionStatus('connecting');

      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      expect(getByText('Connecting...')).toBeTruthy();
    });

    it('should show connected status', async () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      expect(getByText('Connected')).toBeTruthy();
    });

    it('should show disconnected status', () => {
      useSessionStore.getState().setConnectionStatus('disconnected');

      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      expect(getByText('Disconnected')).toBeTruthy();
    });
  });

  describe('input handling', () => {
    it('should update player name input', () => {
      const { getByPlaceholderText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      const nameInput = getByPlaceholderText('Enter your name');
      fireEvent.changeText(nameInput, 'Alice');

      expect(nameInput.props.value).toBe('Alice');
    });

    it('should update room code input', () => {
      const { getByPlaceholderText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      const codeInput = getByPlaceholderText('Enter room code');
      fireEvent.changeText(codeInput, 'ABC123');

      expect(codeInput.props.value).toBe('ABC123');
    });
  });

  describe('create room', () => {
    it('should show an inline error when name is empty', async () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      fireEvent.press(getByText('Create Room'));

      await waitFor(() => {
        expect(getByText('Please enter your name to create a room.')).toBeTruthy();
      });
    });

    it('should disable button when not connected', () => {
      useSessionStore.getState().setConnectionStatus('disconnected');

      const { getByText, queryByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      // When disconnected the button is disabled, so pressing it does nothing —
      // no validation error should appear.
      fireEvent.press(getByText('Create Room'));

      expect(queryByText('Please enter your name to create a room.')).toBeNull();
    });

    it('should call createRoom when connected with valid name', async () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const mockSession = {
        room: { roomId: 'ABC123', hostId: 'id-1', players: [], maxPlayers: 4, isStarted: false },
        playerId: 'id-1',
        reconnectToken: 'token-abc',
        expiresAt: '2099-01-01T00:00:00.000Z',
      };
      const mockTransportInstance = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        setCallbacks: jest.fn(),
        createRoom: jest.fn().mockResolvedValue(mockSession),
        joinRoom: jest.fn(),
      };

      (SocketTransport as jest.MockedClass<typeof SocketTransport>)
        .mockImplementation(() => mockTransportInstance as unknown as SocketTransport);

      const { getByText, getByPlaceholderText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Alice');
      fireEvent.press(getByText('Create Room'));

      await waitFor(() => {
        expect(mockTransportInstance.createRoom).toHaveBeenCalledWith({
          playerName: 'Alice',
          maxPlayers: 2,
        });
      });
    });

    it('hides the endgame-mode selector at 2 players and shows it at 3-4', () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const { getByText, queryByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      // Default is a 2-player room — no endgame-mode choice.
      expect(queryByText('First out wins')).toBeNull();
      expect(queryByText('Play to ranking')).toBeNull();

      fireEvent.press(getByText('4'));

      expect(getByText('First out wins')).toBeTruthy();
      expect(getByText('Play to ranking')).toBeTruthy();
    });

    it('sends the chosen size and mode for a 4-player ranking room', async () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const mockSession = {
        room: { roomId: 'ABC123', hostId: 'id-1', players: [], maxPlayers: 4, endgameMode: 'ranking', isStarted: false },
        playerId: 'id-1',
        reconnectToken: 'token-abc',
        expiresAt: '2099-01-01T00:00:00.000Z',
      };
      const mockTransportInstance = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        setCallbacks: jest.fn(),
        createRoom: jest.fn().mockResolvedValue(mockSession),
        joinRoom: jest.fn(),
      };
      (SocketTransport as jest.MockedClass<typeof SocketTransport>)
        .mockImplementation(() => mockTransportInstance as unknown as SocketTransport);

      const { getByText, getByPlaceholderText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Alice');
      fireEvent.press(getByText('4'));
      fireEvent.press(getByText('Play to ranking'));
      fireEvent.press(getByText('Create Room'));

      await waitFor(() => {
        expect(mockTransportInstance.createRoom).toHaveBeenCalledWith({
          playerName: 'Alice',
          maxPlayers: 4,
          endgameMode: 'ranking',
        });
      });
    });
  });

  describe('join room', () => {
    it('should show an inline error when name is empty', async () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const { getByText, getByPlaceholderText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter room code'), 'ABC123');
      fireEvent.press(getByText('Join Room'));

      await waitFor(() => {
        expect(getByText('Please enter your name to join a room.')).toBeTruthy();
      });
    });

    it('should show an inline error when room code is empty', async () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const { getByText, getByPlaceholderText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Alice');
      fireEvent.press(getByText('Join Room'));

      await waitFor(() => {
        expect(getByText('Please enter the room code to join.')).toBeTruthy();
      });
    });

    it('should disable button when not connected', () => {
      useSessionStore.getState().setConnectionStatus('disconnected');

      const { getByText, queryByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      // When disconnected the button is disabled, so pressing it does nothing —
      // no validation error should appear.
      fireEvent.press(getByText('Join Room'));

      expect(queryByText('Please enter the room code to join.')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('should call onBack when back button pressed', () => {
      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      fireEvent.press(getByText('←'));

      expect(mockOnBack).toHaveBeenCalled();
    });
  });
});
