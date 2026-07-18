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

// Mock the persistence layer so we can assert save/clear without touching storage.
jest.mock('../../stores/secureTokenStore', () => ({
  saveSession: jest.fn().mockResolvedValue(undefined),
  loadSession: jest.fn().mockResolvedValue(null),
  clearSession: jest.fn().mockResolvedValue(undefined),
}));
import { saveSession, clearSession } from '../../stores/secureTokenStore';

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
      onPlayerLeft: jest.fn(),
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

      handler?.('player1', 'Player 1 wins!', 'win', []);

      expect(callbacks.onGameOver).toHaveBeenCalledWith('player1', 'Player 1 wins!', 'win', []);
    });

    it('should handle player_left event', () => {
      const handler = getEventHandler('player_left');

      handler?.('player2', 'Bob');

      expect(callbacks.onPlayerLeft).toHaveBeenCalledWith('player2', 'Bob');
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

    it('should emit create_room event and resolve with the room session', async () => {
      const mockSession = {
        room: { roomId: 'ABC123', hostId: 'id-1', players: [], maxPlayers: 4, isStarted: false },
        playerId: 'id-1',
        reconnectToken: 'token-abc',
        expiresAt: '2099-01-01T00:00:00.000Z',
      };

      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (session: typeof mockSession) => void) => {
          if (event === 'create_room') {
            callback(mockSession);
          }
        }
      );

      const session = await transport.createRoom({ playerName: 'Alice' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'create_room',
        { playerName: 'Alice' },
        expect.any(Function)
      );
      expect(session).toEqual(mockSession);
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
        transport.joinRoom({ roomId: 'ABC123', playerName: 'Bob' })
      ).rejects.toThrow('Not connected to server');
    });

    it('should emit join_room event and resolve with the room session', async () => {
      const mockSession = {
        room: { roomId: 'ABC123', hostId: 'id-1', players: [], maxPlayers: 4, isStarted: false },
        playerId: 'id-2',
        reconnectToken: 'token-bob',
        expiresAt: '2099-01-01T00:00:00.000Z',
      };

      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, callback: (session: typeof mockSession, error: string | null) => void) => {
          if (event === 'join_room') {
            callback(mockSession, null);
          }
        }
      );

      const session = await transport.joinRoom({ roomId: 'ABC123', playerName: 'Bob' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join_room',
        { roomId: 'ABC123', playerName: 'Bob' },
        expect.any(Function)
      );
      expect(session).toEqual(mockSession);
    });

    it('should reject when join fails', async () => {
      mockSocket.emit.mockImplementation(
        (
          event: string,
          _data: unknown,
          callback: (room: null, error: { code: string; message: string }) => void,
        ) => {
          if (event === 'join_room') {
            callback(null, { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
          }
        }
      );

      await expect(
        transport.joinRoom({ roomId: 'INVALID', playerName: 'Bob' })
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

    it('should emit play_cards as an id-based command (no card rank/suit) with metadata', () => {
      transport.sendAction({
        type: 'PLAY_CARDS',
        cards: [{ id: '5♥', rank: '5', suit: '♥' }],
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'play_cards',
        expect.objectContaining({
          cardIds: ['5♥'],
          declaredSuit: undefined,
          meta: expect.objectContaining({
            commandId: expect.any(String),
            expectedStateVersion: expect.any(Number),
          }),
        }),
      );
    });

    it('should forward the declared suit when playing an Ace', () => {
      transport.sendAction({
        type: 'PLAY_CARDS',
        cards: [{ id: 'A♠', rank: 'A', suit: '♠' }],
        declaredSuit: '♥',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'play_cards',
        expect.objectContaining({ cardIds: ['A♠'], declaredSuit: '♥' }),
      );
    });

    it('should emit draw_card with command metadata', () => {
      transport.sendAction({ type: 'DRAW_CARD' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'draw_card',
        expect.objectContaining({
          commandId: expect.any(String),
          expectedStateVersion: expect.any(Number),
        }),
      );
    });

    it('should emit declare_last_card with command metadata', () => {
      transport.sendAction({ type: 'DECLARE_LAST_CARD', player: 0 });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'declare_last_card',
        expect.objectContaining({
          commandId: expect.any(String),
          expectedStateVersion: expect.any(Number),
        }),
      );
    });

    it('echoes the latest state version as expectedStateVersion', () => {
      // Simulate the server broadcasting a state at version 7.
      const stateHandler = getEventHandler('game_state_update');
      stateHandler?.({ roomId: 'test', stateVersion: 7 });

      transport.sendAction({ type: 'DRAW_CARD' });

      const drawCall = mockSocket.emit.mock.calls.find(([e]) => e === 'draw_card');
      expect(drawCall?.[1]).toEqual(
        expect.objectContaining({ expectedStateVersion: 7 }),
      );
    });
  });

  describe('session persistence and resume (MFP-04)', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, handler) => {
        if (event === 'connect') setTimeout(() => handler(), 0);
      });
      await transport.connect();
    });

    it('persists the session on create', async () => {
      const mockSession = {
        room: { roomId: 'ABC123', hostId: 'id-1', players: [], maxPlayers: 2, isStarted: false },
        playerId: 'id-1',
        reconnectToken: 'token-abc',
        expiresAt: '2099-01-01T00:00:00.000Z',
      };
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, cb: (s: typeof mockSession) => void) => {
          if (event === 'create_room') cb(mockSession);
        },
      );

      await transport.createRoom({ playerName: 'Alice' });

      expect(saveSession).toHaveBeenCalledWith({
        playerId: 'id-1',
        roomId: 'ABC123',
        reconnectToken: 'token-abc',
      });
    });

    it('clears the persisted session on explicit leave', () => {
      transport.leaveRoom();
      expect(clearSession).toHaveBeenCalled();
    });

    it('resumeSession emits resume_session and resolves with the snapshot', async () => {
      const resumeResult = {
        room: { roomId: 'ABC123', hostId: 'id-1', players: [], maxPlayers: 2, isStarted: false },
        state: null,
        hand: null,
        playerId: 'id-1',
        reconnectToken: 'token-rotated',
        expiresAt: '2099-01-01T00:00:00.000Z',
        stateVersion: 0,
      };
      mockSocket.emit.mockImplementation(
        (event: string, _data: unknown, cb: (r: typeof resumeResult) => void) => {
          if (event === 'resume_session') cb(resumeResult);
        },
      );

      const result = await transport.resumeSession({
        playerId: 'id-1',
        roomId: 'ABC123',
        reconnectToken: 'token-abc',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'resume_session',
        { playerId: 'id-1', roomId: 'ABC123', reconnectToken: 'token-abc' },
        expect.any(Function),
      );
      expect(result.reconnectToken).toBe('token-rotated');
    });

    it('reports connecting (not connected) on transport reconnect until resume', () => {
      const onConnectionChange = jest.fn();
      transport.setCallbacks({ onConnectionChange });
      const reconnectHandler = mockSocket.io.on.mock.calls.find(
        ([e]: [string]) => e === 'reconnect',
      )?.[1];

      reconnectHandler?.();

      expect(onConnectionChange).toHaveBeenCalledWith('connecting');
      expect(onConnectionChange).not.toHaveBeenCalledWith('connected');
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
