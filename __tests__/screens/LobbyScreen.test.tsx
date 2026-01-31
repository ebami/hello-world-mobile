/**
 * @fileoverview Tests for LobbyScreen component.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
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

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

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
    it('should alert when name is empty', () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      fireEvent.press(getByText('Create Room'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Name Required',
        'Please enter your name to create a room.'
      );
    });

    it('should disable button when not connected', () => {
      useSessionStore.getState().setConnectionStatus('disconnected');

      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      // When disconnected, pressing the button should not trigger any alert
      fireEvent.press(getByText('Create Room'));

      // No validation alert should be called since button is disabled
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should call createRoom when connected with valid name', async () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const mockRoom = { roomId: 'ABC123', hostId: 'p1', players: [] };
      const mockTransportInstance = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        setCallbacks: jest.fn(),
        createRoom: jest.fn().mockResolvedValue(mockRoom),
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
          maxPlayers: 4,
        });
      });
    });
  });

  describe('join room', () => {
    it('should alert when name is empty', () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const { getByText, getByPlaceholderText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter room code'), 'ABC123');
      fireEvent.press(getByText('Join Room'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Name Required',
        'Please enter your name to join a room.'
      );
    });

    it('should alert when room code is empty', () => {
      useSessionStore.getState().setConnectionStatus('connected');

      const { getByText, getByPlaceholderText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Alice');
      fireEvent.press(getByText('Join Room'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Room Code Required',
        'Please enter the room code to join.'
      );
    });

    it('should disable button when not connected', () => {
      useSessionStore.getState().setConnectionStatus('disconnected');

      const { getByText } = render(
        <LobbyScreen onBack={mockOnBack} onRoomJoined={mockOnRoomJoined} />
      );

      // When disconnected, pressing the button should not trigger any alert
      fireEvent.press(getByText('Join Room'));

      // No validation alert should be called since button is disabled
      expect(Alert.alert).not.toHaveBeenCalled();
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
