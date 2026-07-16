/**
 * @fileoverview Tests for Zustand session store.
 */

import { useSessionStore } from '../../stores/sessionStore';
import type { RoomInfo } from '../../networking/types';
import type { PlayerSummary } from '../../game/types';

describe('sessionStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSessionStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have disconnected connection status', () => {
      expect(useSessionStore.getState().connectionStatus).toBe('disconnected');
    });

    it('should have null roomId', () => {
      expect(useSessionStore.getState().roomId).toBeNull();
    });

    it('should have null playerId', () => {
      expect(useSessionStore.getState().playerId).toBeNull();
    });

    it('should have null playerName', () => {
      expect(useSessionStore.getState().playerName).toBeNull();
    });

    it('should have null reconnectToken', () => {
      expect(useSessionStore.getState().reconnectToken).toBeNull();
    });

    it('should have empty players array', () => {
      expect(useSessionStore.getState().players).toEqual([]);
    });

    it('should have isHost as false', () => {
      expect(useSessionStore.getState().isHost).toBe(false);
    });

    it('should have null error', () => {
      expect(useSessionStore.getState().error).toBeNull();
    });
  });

  describe('setConnectionStatus', () => {
    it('should update connection status to connecting', () => {
      useSessionStore.getState().setConnectionStatus('connecting');
      expect(useSessionStore.getState().connectionStatus).toBe('connecting');
    });

    it('should update connection status to connected', () => {
      useSessionStore.getState().setConnectionStatus('connected');
      expect(useSessionStore.getState().connectionStatus).toBe('connected');
    });

    it('should update connection status to disconnected', () => {
      useSessionStore.getState().setConnectionStatus('connected');
      useSessionStore.getState().setConnectionStatus('disconnected');
      expect(useSessionStore.getState().connectionStatus).toBe('disconnected');
    });
  });

  describe('setRoom', () => {
    const mockPlayers: PlayerSummary[] = [
      { playerId: 'p1', displayName: 'Alice', handCount: 5, connected: true, isBot: false },
      { playerId: 'p2', displayName: 'Bob', handCount: 5, connected: true, isBot: false },
    ];

    const mockRoom: RoomInfo = {
      roomId: 'ABC123',
      hostId: 'p1',
      players: mockPlayers,
      maxPlayers: 4,
      isStarted: false,
    };

    it('should set room information', () => {
      useSessionStore.getState().setRoom(mockRoom);

      expect(useSessionStore.getState().roomId).toBe('ABC123');
      expect(useSessionStore.getState().players).toEqual(mockPlayers);
    });

    it('should set isHost to true when local player id matches host id', () => {
      // Set player ID first
      useSessionStore.getState().setPlayerId('p1');
      useSessionStore.getState().setRoom(mockRoom);

      expect(useSessionStore.getState().isHost).toBe(true);
    });

    it('should set isHost to false when local player is not host', () => {
      useSessionStore.getState().setPlayerId('p2');
      useSessionStore.getState().setRoom(mockRoom);

      expect(useSessionStore.getState().isHost).toBe(false);
    });

    it('should NOT grant host on a display-name match when ids differ (MFP-03)', () => {
      // The local player is 'p2' (Bob) but has spoofed their display name to the
      // host id string. Host must be decided by opaque id only, so isHost stays
      // false — this is the regression the identity split closes.
      useSessionStore.getState().setPlayerId('p2');
      useSessionStore.getState().setPlayerName('p1');
      useSessionStore.getState().setRoom(mockRoom);

      expect(useSessionStore.getState().isHost).toBe(false);
    });

    it('should clear room information when set to null', () => {
      useSessionStore.getState().setRoom(mockRoom);
      useSessionStore.getState().setRoom(null);

      expect(useSessionStore.getState().roomId).toBeNull();
      expect(useSessionStore.getState().players).toEqual([]);
      expect(useSessionStore.getState().isHost).toBe(false);
    });
  });

  describe('setPlayerId', () => {
    it('should update player ID', () => {
      useSessionStore.getState().setPlayerId('player-123');
      expect(useSessionStore.getState().playerId).toBe('player-123');
    });
  });

  describe('setPlayerName', () => {
    it('should update player name', () => {
      useSessionStore.getState().setPlayerName('Alice');
      expect(useSessionStore.getState().playerName).toBe('Alice');
    });
  });

  describe('setReconnectToken', () => {
    it('should set the reconnect token', () => {
      useSessionStore.getState().setReconnectToken('token-xyz');
      expect(useSessionStore.getState().reconnectToken).toBe('token-xyz');
    });

    it('should clear the reconnect token with null', () => {
      useSessionStore.getState().setReconnectToken('token-xyz');
      useSessionStore.getState().setReconnectToken(null);
      expect(useSessionStore.getState().reconnectToken).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useSessionStore.getState().setError('Connection failed');
      expect(useSessionStore.getState().error).toBe('Connection failed');
    });

    it('should clear error message with null', () => {
      useSessionStore.getState().setError('Some error');
      useSessionStore.getState().setError(null);
      expect(useSessionStore.getState().error).toBeNull();
    });
  });

  describe('updatePlayers', () => {
    it('should update the players array', () => {
      const players: PlayerSummary[] = [
        { playerId: 'p1', displayName: 'Alice', handCount: 5, connected: true, isBot: false },
        { playerId: 'p2', displayName: 'Bob', handCount: 4, connected: true, isBot: false },
      ];

      useSessionStore.getState().updatePlayers(players);
      expect(useSessionStore.getState().players).toEqual(players);
    });

    it('should replace existing players', () => {
      const initialPlayers: PlayerSummary[] = [
        { playerId: 'p1', displayName: 'Alice', handCount: 5, connected: true, isBot: false },
      ];
      const newPlayers: PlayerSummary[] = [
        { playerId: 'p2', displayName: 'Bob', handCount: 3, connected: true, isBot: false },
      ];

      useSessionStore.getState().updatePlayers(initialPlayers);
      useSessionStore.getState().updatePlayers(newPlayers);

      expect(useSessionStore.getState().players).toEqual(newPlayers);
    });
  });

  describe('applyResume (MFP-04)', () => {
    const snapshot = {
      room: {
        roomId: 'ABC123',
        hostId: 'id-1',
        players: [
          { playerId: 'id-1', displayName: 'Alice', handCount: 3, connected: true, isBot: false },
          { playerId: 'id-2', displayName: 'Bob', handCount: 4, connected: true, isBot: false },
        ],
        maxPlayers: 2,
        isStarted: true,
        phase: 'ACTIVE' as const,
      },
      state: null,
      hand: null,
      reconnectToken: 'tok-rotated',
      expiresAt: '2099-01-01T00:00:00.000Z',
      stateVersion: 5,
    };

    it('reconciles identity, room, host, token, and connection from a snapshot', () => {
      useSessionStore.getState().applyResume({ ...snapshot, playerId: 'id-1' });

      const state = useSessionStore.getState();
      expect(state.roomId).toBe('ABC123');
      expect(state.playerId).toBe('id-1');
      expect(state.isHost).toBe(true);
      expect(state.reconnectToken).toBe('tok-rotated');
      expect(state.connectionStatus).toBe('connected');
      expect(state.players).toHaveLength(2);
      expect(state.error).toBeNull();
    });

    it('marks isHost false when the resumed player is not the host', () => {
      useSessionStore.getState().applyResume({ ...snapshot, playerId: 'id-2' });
      expect(useSessionStore.getState().isHost).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various state values
      useSessionStore.getState().setConnectionStatus('connected');
      useSessionStore.getState().setPlayerId('player-123');
      useSessionStore.getState().setPlayerName('Alice');
      useSessionStore.getState().setReconnectToken('token-abc');
      useSessionStore.getState().setRoom({
        roomId: 'ABC123',
        hostId: 'player-123',
        players: [{ playerId: 'player-123', displayName: 'Alice', handCount: 5, connected: true, isBot: false }],
        maxPlayers: 4,
        isStarted: false,
      });
      useSessionStore.getState().setError('Some error');

      // Reset
      useSessionStore.getState().reset();

      // Verify all reset
      const state = useSessionStore.getState();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.roomId).toBeNull();
      expect(state.playerId).toBeNull();
      expect(state.playerName).toBeNull();
      expect(state.reconnectToken).toBeNull();
      expect(state.players).toEqual([]);
      expect(state.isHost).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('reactivity', () => {
    it('should allow subscribing to state changes', () => {
      const listener = jest.fn();
      const unsubscribe = useSessionStore.subscribe(listener);

      useSessionStore.getState().setConnectionStatus('connected');

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it('should not call listener after unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = useSessionStore.subscribe(listener);
      unsubscribe();

      useSessionStore.getState().setConnectionStatus('connected');

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
