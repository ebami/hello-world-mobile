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
      { playerId: 'p1', handCount: 5, connected: true, isBot: false },
      { playerId: 'p2', handCount: 5, connected: true, isBot: false },
    ];

    const mockRoom: RoomInfo = {
      roomId: 'ABC123',
      hostId: 'p1',
      players: mockPlayers,
    };

    it('should set room information', () => {
      useSessionStore.getState().setRoom(mockRoom);

      expect(useSessionStore.getState().roomId).toBe('ABC123');
      expect(useSessionStore.getState().players).toEqual(mockPlayers);
    });

    it('should set isHost to true when local player is host', () => {
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
        { playerId: 'p1', handCount: 5, connected: true, isBot: false },
        { playerId: 'p2', handCount: 4, connected: true, isBot: false },
      ];

      useSessionStore.getState().updatePlayers(players);
      expect(useSessionStore.getState().players).toEqual(players);
    });

    it('should replace existing players', () => {
      const initialPlayers: PlayerSummary[] = [
        { playerId: 'p1', handCount: 5, connected: true, isBot: false },
      ];
      const newPlayers: PlayerSummary[] = [
        { playerId: 'p2', handCount: 3, connected: true, isBot: false },
      ];

      useSessionStore.getState().updatePlayers(initialPlayers);
      useSessionStore.getState().updatePlayers(newPlayers);

      expect(useSessionStore.getState().players).toEqual(newPlayers);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various state values
      useSessionStore.getState().setConnectionStatus('connected');
      useSessionStore.getState().setPlayerId('player-123');
      useSessionStore.getState().setPlayerName('Alice');
      useSessionStore.getState().setRoom({
        roomId: 'ABC123',
        hostId: 'player-123',
        players: [{ playerId: 'player-123', handCount: 5, connected: true, isBot: false }],
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
