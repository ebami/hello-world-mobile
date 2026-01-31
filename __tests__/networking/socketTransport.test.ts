/**
 * @fileoverview Tests for SocketTransport multiplayer adapter.
 */

// Mock react-native-url-polyfill before imports
jest.mock('react-native-url-polyfill/auto', () => ({}));

import { SocketTransport } from '../../networking/socketTransport';
import type { TransportCallbacks } from '../../networking/types';

// Mock the socket module
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
  id: 'mock-socket-id',
  io: {
    on: jest.fn(),
  },
};

jest.mock('../../networking/socket', () => ({
  createSocket: jest.fn(() => mockSocket),
  disconnectSocket: jest.fn(),
}));

// Mock __DEV__ global
(global as unknown as { __DEV__: boolean }).__DEV__ = false;

describe('SocketTransport', () => {
  let transport: SocketTransport;
  let callbacks: Partial<TransportCallbacks>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;

    transport = new SocketTransport('http://test-server.com:3001');
    callbacks = {
      onConnectionChange: jest.fn(),
      onStateUpdate: jest.fn(),
      onHandUpdate: jest.fn(),
      onRoomUpdated: jest.fn(),
      onGameStart: jest.fn(),
      onGameOver: jest.fn(),
      onPlayerAction: jest.fn(),
      onError: jest.fn(),
    };
    transport.setCallbacks(callbacks);
  });

  describe('connect', () => {
    it('should update status to connecting then connected', async () => {
      // Simulate successful connection
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });

      await transport.connect();

      expect(callbacks.onConnectionChange).toHaveBeenCalledWith('connecting');
      expect(callbacks.onConnectionChange).toHaveBeenCalledWith('connected');
      expect(transport.getConnectionStatus()).toBe('connected');
    });

    it('should reject and set disconnected on connection error', async () => {
      const error = new Error('Connection failed');

      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      await expect(transport.connect()).rejects.toThrow('Connection failed');
      expect(callbacks.onConnectionChange).toHaveBeenCalledWith('disconnected');
    });

    it('should call socket.connect', async () => {
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });

      await transport.connect();

      expect(mockSocket.connect).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect and update status', () => {
      transport.disconnect();

      expect(callbacks.onConnectionChange).toHaveBeenCalledWith('disconnected');
      expect(transport.getConnectionStatus()).toBe('disconnected');
    });
  });

  describe('getConnectionStatus', () => {
    it('should return disconnected initially', () => {
      expect(transport.getConnectionStatus()).toBe('disconnected');
    });
  });

  describe('event handlers', () => {
    beforeEach(async () => {
      // Connect first to set up event handlers
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      await transport.connect();
    });

    it('should handle game_state_update event', () => {
      const handler = getEventHandler('game_state_update');
      const mockState = { roomId: 'test', deckCount: 40 };

      handler?.(mockState);

      expect(callbacks.onStateUpdate).toHaveBeenCalledWith(mockState);
    });

    it('should handle hand_update event', () => {
      const handler = getEventHandler('hand_update');
      const mockPayload = { roomId: 'test', playerId: 'p1', hand: [] };

      handler?.(mockPayload);

      expect(callbacks.onHandUpdate).toHaveBeenCalledWith(mockPayload);
    });

    it('should handle room_updated event', () => {
      const handler = getEventHandler('room_updated');
      const mockRoom = { roomId: 'test', hostId: 'h1', players: [] };

      handler?.(mockRoom);

      expect(callbacks.onRoomUpdated).toHaveBeenCalledWith(mockRoom);
    });

    it('should handle game_start event', () => {
      const handler = getEventHandler('game_start');
      const mockState = { roomId: 'test' };
      const mockHand = { roomId: 'test', playerId: 'p1', hand: [] };

      handler?.(mockState, mockHand);

      expect(callbacks.onGameStart).toHaveBeenCalledWith(mockState, mockHand);
    });

    it('should handle game_over event', () => {
      const handler = getEventHandler('game_over');

      handler?.('player1', 'Player 1 wins!');

      expect(callbacks.onGameOver).toHaveBeenCalledWith('player1', 'Player 1 wins!');
    });

    it('should handle error event', () => {
      const handler = getEventHandler('error');

      handler?.('Something went wrong');

      expect(callbacks.onError).toHaveBeenCalledWith('Something went wrong');
    });
  });

  describe('createRoom', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      await transport.connect();
    });

    it('should reject when not connected', async () => {
      mockSocket.connected = false;

      await expect(
        transport.createRoom({ playerName: 'Alice' })
      ).rejects.toThrow('Not connected to server');
    });

    it('should emit create_room event and resolve with room info', async () => {
      const mockRoom = { roomId: 'ABC123', hostId: 'p1', players: [] };

      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (room: typeof mockRoom) => void) => {
          if (event === 'create_room') {
            callback(mockRoom);
          }
        }
      );

      const room = await transport.createRoom({ playerName: 'Alice' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'create_room',
        { playerName: 'Alice' },
        expect.any(Function)
      );
      expect(room).toEqual(mockRoom);
    });
  });

  describe('joinRoom', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      await transport.connect();
    });

    it('should reject when not connected', async () => {
      mockSocket.connected = false;

      await expect(
        transport.joinRoom({ roomCode: 'ABC123', playerName: 'Bob' })
      ).rejects.toThrow('Not connected to server');
    });

    it('should emit join_room event and resolve with room info', async () => {
      const mockRoom = { roomId: 'ABC123', hostId: 'p1', players: [] };

      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (room: typeof mockRoom, error: string | null) => void) => {
          if (event === 'join_room') {
            callback(mockRoom, null);
          }
        }
      );

      const room = await transport.joinRoom({ roomCode: 'ABC123', playerName: 'Bob' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join_room',
        { roomCode: 'ABC123', playerName: 'Bob' },
        expect.any(Function)
      );
      expect(room).toEqual(mockRoom);
    });

    it('should reject when join fails', async () => {
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (room: null, error: string) => void) => {
          if (event === 'join_room') {
            callback(null, 'Room not found');
          }
        }
      );

      await expect(
        transport.joinRoom({ roomCode: 'INVALID', playerName: 'Bob' })
      ).rejects.toThrow('Room not found');
    });
  });

  describe('sendAction', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      await transport.connect();
    });

    it('should emit the action type as event', () => {
      transport.sendAction({ type: 'PLAY_CARDS', cards: [] });

      expect(mockSocket.emit).toHaveBeenCalledWith('play_cards', []);
    });

    it('should emit draw_card event', () => {
      transport.sendAction({ type: 'DRAW_CARD' });

      expect(mockSocket.emit).toHaveBeenCalledWith('draw_card');
    });

    it('should emit declare_last_card event', () => {
      transport.sendAction({ type: 'DECLARE_LAST_CARD', player: 0 });

      expect(mockSocket.emit).toHaveBeenCalledWith('declare_last_card');
    });
  });

  describe('startGame', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      await transport.connect();
    });

    it('should emit start_game event', () => {
      transport.startGame();

      expect(mockSocket.emit).toHaveBeenCalledWith('start_game');
    });
  });

  describe('leaveRoom', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      await transport.connect();
    });

    it('should emit leave_room event', () => {
      transport.leaveRoom();

      expect(mockSocket.emit).toHaveBeenCalledWith('leave_room');
    });
  });

  // Helper to get registered event handlers
  function getEventHandler(eventName: string): ((...args: unknown[]) => void) | undefined {
    const calls = mockSocket.on.mock.calls;
    const call = calls.find(([event]) => event === eventName);
    return call?.[1] as ((...args: unknown[]) => void) | undefined;
  }
});
