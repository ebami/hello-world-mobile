/**
 * @fileoverview Tests for RoomManager class.
 *
 * Identity model (MFP-03): players are keyed by an opaque `playerId` that is
 * distinct from their `displayName`. Test fixtures therefore pass an explicit
 * id (e.g. `'id-alice'`) and a separate name (e.g. `'Alice'`).
 */

import { roomManager } from './roomManager';

// Helper to reset room manager state between tests
function resetRoomManager() {
  roomManager.resetForTests();
}

describe('RoomManager', () => {
  beforeEach(() => {
    resetRoomManager();
  });

  describe('generateRoomCode', () => {
    it('should generate a 6-character code', () => {
      const code = roomManager.generateRoomCode();
      expect(code).toHaveLength(6);
    });

    it('should generate alphanumeric codes', () => {
      const code = roomManager.generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const code = roomManager.generateRoomCode();
        codes.add(code);
      }
      expect(codes.size).toBe(100);
    });
  });

  describe('createRoom', () => {
    it('should create a room keyed by opaque player id, not display name', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');

      expect(room.roomId).toHaveLength(6);
      expect(room.hostId).toBe('id-alice');
      expect(room.players).toHaveLength(1);
      expect(room.players[0].playerId).toBe('id-alice');
      expect(room.players[0].displayName).toBe('Alice');
      expect(room.players[0].connected).toBe(true);
      expect(room.isStarted).toBe(false);
    });

    it('should default new rooms to the two-player cap (MFP-11)', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      expect(room.maxPlayers).toBe(2);
    });

    it('should reject a third join once the two-player cap is reached (MFP-11)', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomManager.joinRoom(room.roomId, 'id-bob', 'Bob', 'socket-2');

      expect(() => {
        roomManager.joinRoom(room.roomId, 'id-carol', 'Carol', 'socket-3');
      }).toThrow('Room is full');
      expect(roomManager.getRoom(room.roomId)!.players).toHaveLength(2);
    });

    it('honors a host-chosen 3-4 player cap and rejects a join past it', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1', 4);
      expect(room.maxPlayers).toBe(4);
      roomManager.joinRoom(room.roomId, 'id-bob', 'Bob', 'socket-2');
      roomManager.joinRoom(room.roomId, 'id-carol', 'Carol', 'socket-3');
      roomManager.joinRoom(room.roomId, 'id-dave', 'Dave', 'socket-4');
      expect(roomManager.getRoom(room.roomId)!.players).toHaveLength(4);

      expect(() => {
        roomManager.joinRoom(room.roomId, 'id-erin', 'Erin', 'socket-5');
      }).toThrow('Room is full');
      expect(roomManager.getRoom(room.roomId)!.players).toHaveLength(4);
    });

    it('defaults endgameMode to first_out and persists a chosen ranking mode', () => {
      const def = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      expect(def.endgameMode).toBe('first_out');

      const ranked = roomManager.createRoom('id-bob', 'Bob', 'socket-2', 4, 'ranking');
      expect(ranked.endgameMode).toBe('ranking');
      expect(ranked.maxPlayers).toBe(4);
    });

    it('should store socket ID keyed by the host player id', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      expect(roomManager.getSocketId(room.roomId, 'id-alice')).toBe('socket-1');
      // The display name is NOT a valid key for the socket map.
      expect(roomManager.getSocketId(room.roomId, 'Alice')).toBeNull();
    });
  });

  describe('joinRoom', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomId = room.roomId;
    });

    it('should add player keyed by opaque id with a separate display name', () => {
      const room = roomManager.joinRoom(roomId, 'id-bob', 'Bob', 'socket-2');

      expect(room).not.toBeNull();
      expect(room!.players).toHaveLength(2);
      expect(room!.players[1].playerId).toBe('id-bob');
      expect(room!.players[1].displayName).toBe('Bob');
    });

    it('should store socket ID keyed by the joining player id', () => {
      roomManager.joinRoom(roomId, 'id-bob', 'Bob', 'socket-2');
      expect(roomManager.getSocketId(roomId, 'id-bob')).toBe('socket-2');
    });

    it('should return null for non-existent room', () => {
      const room = roomManager.joinRoom('INVALID', 'id-bob', 'Bob', 'socket-2');
      expect(room).toBeNull();
    });

    it('should throw error when room is full', () => {
      const smallRoom = roomManager.createRoom('id-host', 'Host', 'socket-0', 2);
      roomManager.joinRoom(smallRoom.roomId, 'id-p1', 'Player1', 'socket-1');

      expect(() => {
        roomManager.joinRoom(smallRoom.roomId, 'id-p2', 'Player2', 'socket-2');
      }).toThrow('Room is full');
    });

    it('should throw error when game already started', () => {
      roomManager.joinRoom(roomId, 'id-bob', 'Bob', 'socket-2');

      // Simulate game start
      const mockGameState = {
        deck: [],
        discardPile: [],
        players: [[], []],
        currentPlayer: 0,
        direction: 1,
        message: '',
        lastCardCalled: [false, false],
        drawPressure: 0,
        hasPlayed: [false, false],
      };
      roomManager.setGameState(roomId, mockGameState);

      expect(() => {
        roomManager.joinRoom(roomId, 'id-charlie', 'Charlie', 'socket-3');
      }).toThrow('Game already started');
    });

    it('should throw when the display name is already taken in the room', () => {
      // A different player id, but a duplicate display name, is rejected.
      expect(() => {
        roomManager.joinRoom(roomId, 'id-other', 'Alice', 'socket-2');
      }).toThrow('Name already taken in this room');
    });
  });

  describe('identity vs presentation', () => {
    it('gives two players with the same display name in different rooms distinct identities', () => {
      const roomA = roomManager.createRoom('id-a', 'Sam', 'socket-a');
      const roomB = roomManager.createRoom('id-b', 'Sam', 'socket-b');

      expect(roomA.players[0].displayName).toBe('Sam');
      expect(roomB.players[0].displayName).toBe('Sam');
      // Same visible name, different opaque identity and different rooms.
      expect(roomA.players[0].playerId).not.toBe(roomB.players[0].playerId);
      expect(roomA.roomId).not.toBe(roomB.roomId);
    });

    it('keys membership and host by id so a display name cannot impersonate a member', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomManager.joinRoom(room.roomId, 'id-bob', 'Bob', 'socket-2');

      // The literal display names are not members; only the opaque ids are.
      expect(roomManager.isMember(room.roomId, 'Alice')).toBe(false);
      expect(roomManager.isMember(room.roomId, 'Bob')).toBe(false);
      expect(roomManager.isMember(room.roomId, 'id-alice')).toBe(true);
      expect(roomManager.isMember(room.roomId, 'id-bob')).toBe(true);
    });
  });

  describe('leaveRoom', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomId = room.roomId;
      roomManager.joinRoom(roomId, 'id-bob', 'Bob', 'socket-2');
    });

    it('should remove player from room by id', () => {
      const room = roomManager.leaveRoom(roomId, 'id-bob');

      expect(room).not.toBeNull();
      expect(room!.players).toHaveLength(1);
      expect(room!.players.find(p => p.playerId === 'id-bob')).toBeUndefined();
    });

    it('should return null for non-existent room', () => {
      const room = roomManager.leaveRoom('INVALID', 'id-bob');
      expect(room).toBeNull();
    });

    it('should return null for non-existent player', () => {
      const room = roomManager.leaveRoom(roomId, 'id-charlie');
      expect(room).toBeNull();
    });

    it('should delete room when last player leaves', () => {
      roomManager.leaveRoom(roomId, 'id-bob');
      roomManager.leaveRoom(roomId, 'id-alice');

      expect(roomManager.getRoom(roomId)).toBeNull();
    });

    it('should assign new host (by id) when the host leaves', () => {
      const room = roomManager.leaveRoom(roomId, 'id-alice');

      expect(room).not.toBeNull();
      expect(room!.hostId).toBe('id-bob');
    });
  });

  describe('setPlayerConnected', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomId = room.roomId;
    });

    it('should update player connected status by id', () => {
      roomManager.setPlayerConnected(roomId, 'id-alice', false);
      const room = roomManager.getRoom(roomId);

      expect(room!.players[0].connected).toBe(false);
    });

    it('should do nothing for non-existent room', () => {
      // Should not throw
      expect(() => {
        roomManager.setPlayerConnected('INVALID', 'id-alice', false);
      }).not.toThrow();
    });
  });

  describe('getPlayer', () => {
    it('returns the player summary by id and null otherwise', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');

      expect(roomManager.getPlayer(room.roomId, 'id-alice')?.displayName).toBe('Alice');
      expect(roomManager.getPlayer(room.roomId, 'nope')).toBeNull();
      expect(roomManager.getPlayer('INVALID', 'id-alice')).toBeNull();
    });
  });

  describe('current-socket tracking (stale-socket detection)', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomId = room.roomId;
    });

    it('treats the socket used at creation as the current socket', () => {
      expect(roomManager.isCurrentSocket(roomId, 'id-alice', 'socket-1')).toBe(true);
      expect(roomManager.isCurrentSocket(roomId, 'id-alice', 'socket-OLD')).toBe(false);
    });

    it('supersedes the old socket when setSocketId records a newer one', () => {
      roomManager.setSocketId(roomId, 'id-alice', 'socket-2');

      expect(roomManager.getSocketId(roomId, 'id-alice')).toBe('socket-2');
      expect(roomManager.isCurrentSocket(roomId, 'id-alice', 'socket-2')).toBe(true);
      // The original socket is now stale.
      expect(roomManager.isCurrentSocket(roomId, 'id-alice', 'socket-1')).toBe(false);
    });

    it('ignores setSocketId for a player that is not a member', () => {
      roomManager.setSocketId(roomId, 'not-a-member', 'socket-x');
      expect(roomManager.getSocketId(roomId, 'not-a-member')).toBeNull();
    });
  });

  describe('room lifecycle and seat mapping (MFP-05)', () => {
    const mkState = () => ({
      deck: [] as any[],
      discardPile: [{ id: 'K♠', suit: '♠' as const, rank: 'K' as const }],
      players: [
        [{ id: 'A♥', suit: '♥' as const, rank: 'A' as const }],
        [
          { id: 'Q♦', suit: '♦' as const, rank: 'Q' as const },
          { id: '3♣', suit: '♣' as const, rank: '3' as const },
        ],
      ],
      currentPlayer: 0,
      direction: 1,
      message: '',
      lastCardCalled: [false, false],
      drawPressure: 0,
      hasPlayed: [false, false],
    });

    function activeRoom() {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomManager.joinRoom(room.roomId, 'id-bob', 'Bob', 'socket-2');
      roomManager.setGameState(room.roomId, mkState());
      return room.roomId;
    }

    it('starts in LOBBY and moves to ACTIVE when the game state is first set', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      expect(roomManager.getPhase(room.roomId)).toBe('LOBBY');
      expect(room.phase).toBe('LOBBY');

      roomManager.joinRoom(room.roomId, 'id-bob', 'Bob', 'socket-2');
      roomManager.setGameState(room.roomId, mkState());

      expect(roomManager.getPhase(room.roomId)).toBe('ACTIVE');
      expect(roomManager.getRoom(room.roomId)!.isStarted).toBe(true);
      expect(roomManager.getRoom(room.roomId)!.phase).toBe('ACTIVE');
    });

    it('freezes the seat order when the game starts', () => {
      const roomId = activeRoom();
      expect(roomManager.getSeatOrder(roomId)).toEqual(['id-alice', 'id-bob']);
      expect(roomManager.seatIndex(roomId, 'id-alice')).toBe(0);
      expect(roomManager.seatIndex(roomId, 'id-bob')).toBe(1);
      expect(roomManager.seatIndex(roomId, 'nobody')).toBe(-1);
    });

    it('keeps hand counts tied to identity when the presentation array is reordered', () => {
      const roomId = activeRoom();
      // Simulate a presentation change: reverse the player array.
      roomManager.getRoom(roomId)!.players.reverse();
      roomManager.updateHandCounts(roomId, roomManager.getGameState(roomId)!);
      // Alice (seat 0) has 1 card; Bob (seat 1) has 2 — regardless of array order.
      expect(roomManager.getPlayer(roomId, 'id-alice')!.handCount).toBe(1);
      expect(roomManager.getPlayer(roomId, 'id-bob')!.handCount).toBe(2);
    });

    it('refuses to join once the game has started', () => {
      const roomId = activeRoom();
      expect(() => {
        roomManager.joinRoom(roomId, 'id-carol', 'Carol', 'socket-3');
      }).toThrow('Game already started');
    });

    it('does not splice an active player on leave (seat order stays intact)', () => {
      const roomId = activeRoom();
      expect(roomManager.leaveRoom(roomId, 'id-bob')).toBeNull();
      expect(roomManager.getSeatOrder(roomId)).toEqual(['id-alice', 'id-bob']);
      expect(roomManager.getRoom(roomId)!.players).toHaveLength(2);
    });

    it('completes the game exactly once', () => {
      const roomId = activeRoom();
      expect(roomManager.completeGame(roomId)).toBe(true);
      expect(roomManager.getPhase(roomId)).toBe('COMPLETED');
      expect(roomManager.completeGame(roomId)).toBe(false);
    });

    it('lets a lobby host leave and transfers host ownership by id', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomManager.joinRoom(room.roomId, 'id-bob', 'Bob', 'socket-2');
      const updated = roomManager.leaveRoom(room.roomId, 'id-alice');
      expect(updated!.hostId).toBe('id-bob');
    });
  });

  describe('state versions and command dedup (MFP-04)', () => {
    const mkState = () => ({
      deck: [] as any[],
      discardPile: [{ id: 'K♠', suit: '♠' as const, rank: 'K' as const }],
      players: [[{ id: 'A♥', suit: '♥' as const, rank: 'A' as const }], []],
      currentPlayer: 0,
      direction: 1,
      message: '',
      lastCardCalled: [false, false],
      drawPressure: 0,
      hasPlayed: [false, false],
    });

    it('is version 0 in the lobby and 1 once the game starts', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomManager.joinRoom(room.roomId, 'id-bob', 'Bob', 'socket-2');
      expect(roomManager.getStateVersion(room.roomId)).toBe(0);

      roomManager.setGameState(room.roomId, mkState());
      expect(roomManager.getStateVersion(room.roomId)).toBe(1);
    });

    it('bumps the version monotonically', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomManager.setGameState(room.roomId, mkState());
      expect(roomManager.bumpStateVersion(room.roomId)).toBe(2);
      expect(roomManager.bumpStateVersion(room.roomId)).toBe(3);
      expect(roomManager.getStateVersion(room.roomId)).toBe(3);
    });

    it('records and recognizes command ids per player', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      expect(roomManager.hasSeenCommand(room.roomId, 'id-alice', 'cmd-1')).toBe(false);

      roomManager.recordCommand(room.roomId, 'id-alice', 'cmd-1');
      expect(roomManager.hasSeenCommand(room.roomId, 'id-alice', 'cmd-1')).toBe(true);
      // Scoped per player — another player has not seen it.
      expect(roomManager.hasSeenCommand(room.roomId, 'id-bob', 'cmd-1')).toBe(false);
    });

    it('bounds the retained command ids per player', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      // Record more than the retention bound (50); the oldest is evicted.
      for (let i = 0; i < 60; i++) {
        roomManager.recordCommand(room.roomId, 'id-alice', `cmd-${i}`);
      }
      expect(roomManager.hasSeenCommand(room.roomId, 'id-alice', 'cmd-0')).toBe(false);
      expect(roomManager.hasSeenCommand(room.roomId, 'id-alice', 'cmd-59')).toBe(true);
    });
  });

  describe('capacity and TTL cleanup (MFP-06)', () => {
    const mkState = () => ({
      deck: [] as any[],
      discardPile: [{ id: 'K♠', suit: '♠' as const, rank: 'K' as const }],
      players: [[{ id: 'A♥', suit: '♥' as const, rank: 'A' as const }], []],
      currentPlayer: 0,
      direction: 1,
      message: '',
      lastCardCalled: [false, false],
      drawPressure: 0,
      hasPlayed: [false, false],
    });

    const TTLS = { emptyMs: 1000, idleLobbyMs: 1000, completedMs: 1000 };

    it('reports the active room count', () => {
      expect(roomManager.roomCount()).toBe(0);
      roomManager.createRoom('h1', 'Alice', 's1');
      roomManager.createRoom('h2', 'Bob', 's2');
      expect(roomManager.roomCount()).toBe(2);
    });

    it('sweeps an idle lobby but retains an active game', () => {
      const lobby = roomManager.createRoom('h1', 'Alice', 's1'); // stays LOBBY
      const active = roomManager.createRoom('h2', 'Bob', 's2');
      roomManager.joinRoom(active.roomId, 'p2', 'Carol', 's3');
      roomManager.setGameState(active.roomId, mkState()); // → ACTIVE

      const future = Date.now() + 60_000;
      const removed = roomManager.sweepExpired(future, TTLS);

      expect(removed).toContain(lobby.roomId);
      expect(removed).not.toContain(active.roomId);
      expect(roomManager.getRoom(lobby.roomId)).toBeNull();
      expect(roomManager.getRoom(active.roomId)).not.toBeNull();
    });

    it('retains a recently-active lobby (not yet expired)', () => {
      const lobby = roomManager.createRoom('h', 'Alice', 's1');
      const removed = roomManager.sweepExpired(Date.now(), {
        emptyMs: 60_000,
        idleLobbyMs: 60_000,
        completedMs: 60_000,
      });
      expect(removed).not.toContain(lobby.roomId);
      expect(roomManager.getRoom(lobby.roomId)).not.toBeNull();
    });

    it('sweeps a completed room after its TTL', () => {
      const room = roomManager.createRoom('h', 'Alice', 's1');
      roomManager.joinRoom(room.roomId, 'p2', 'Bob', 's2');
      roomManager.setGameState(room.roomId, mkState());
      roomManager.completeGame(room.roomId); // → COMPLETED

      const future = Date.now() + 60_000;
      const removed = roomManager.sweepExpired(future, TTLS);

      expect(removed).toContain(room.roomId);
      expect(roomManager.getRoom(room.roomId)).toBeNull();
    });
  });

  describe('getRoom', () => {
    it('should return room info', () => {
      const created = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      const room = roomManager.getRoom(created.roomId);

      expect(room).not.toBeNull();
      expect(room!.roomId).toBe(created.roomId);
    });

    it('should return null for non-existent room', () => {
      expect(roomManager.getRoom('INVALID')).toBeNull();
    });
  });

  describe('getRoomData', () => {
    it('should return full room data', () => {
      const created = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      const data = roomManager.getRoomData(created.roomId);

      expect(data).not.toBeNull();
      expect(data!.info).toBeDefined();
      expect(data!.socketIds).toBeInstanceOf(Map);
      expect(data!.gameState).toBeNull();
    });

    it('should return null for non-existent room', () => {
      expect(roomManager.getRoomData('INVALID')).toBeNull();
    });
  });

  describe('game state management', () => {
    let roomId: string;
    const mockGameState = {
      deck: [{ id: 'card-1', suit: '♥' as const, rank: '5' as const }],
      discardPile: [{ id: 'card-2', suit: '♠' as const, rank: 'K' as const }],
      players: [[{ id: 'card-3', suit: '♦' as const, rank: 'A' as const }], []],
      currentPlayer: 0,
      direction: 1,
      message: 'Game started',
      lastCardCalled: [false, false],
      drawPressure: 0,
      hasPlayed: [false, false],
    };

    beforeEach(() => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomId = room.roomId;
      roomManager.joinRoom(roomId, 'id-bob', 'Bob', 'socket-2');
    });

    it('should set game state', () => {
      roomManager.setGameState(roomId, mockGameState);
      const state = roomManager.getGameState(roomId);

      expect(state).not.toBeNull();
      expect(state!.currentPlayer).toBe(0);
    });

    it('should mark room as started', () => {
      roomManager.setGameState(roomId, mockGameState);
      const room = roomManager.getRoom(roomId);

      expect(room!.isStarted).toBe(true);
    });

    it('should update hand counts', () => {
      roomManager.setGameState(roomId, mockGameState);
      const room = roomManager.getRoom(roomId);

      expect(room!.players[0].handCount).toBe(1);
      expect(room!.players[1].handCount).toBe(0);
    });
  });

  describe('getAllSocketIds', () => {
    it('should return all socket IDs in room', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomManager.joinRoom(room.roomId, 'id-bob', 'Bob', 'socket-2');

      const socketIds = roomManager.getAllSocketIds(room.roomId);

      expect(socketIds).toHaveLength(2);
      expect(socketIds).toContain('socket-1');
      expect(socketIds).toContain('socket-2');
    });

    it('should return empty array for non-existent room', () => {
      expect(roomManager.getAllSocketIds('INVALID')).toEqual([]);
    });
  });

  describe('deleteRoom', () => {
    it('should delete the room', () => {
      const room = roomManager.createRoom('id-alice', 'Alice', 'socket-1');
      roomManager.deleteRoom(room.roomId);

      expect(roomManager.getRoom(room.roomId)).toBeNull();
    });
  });
});
