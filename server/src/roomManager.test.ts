/**
 * @fileoverview Tests for RoomManager class.
 */

import { roomManager } from './roomManager';

// Helper to reset room manager state between tests
function resetRoomManager() {
  // Access private rooms Map and clear it
  // This is a workaround since there's no public reset method
  (roomManager as any).rooms.clear();
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
    it('should create a room with host player', () => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1', 4);

      expect(room.roomId).toHaveLength(6);
      expect(room.hostId).toBe('Alice');
      expect(room.players).toHaveLength(1);
      expect(room.players[0].playerId).toBe('Alice');
      expect(room.players[0].connected).toBe(true);
      expect(room.maxPlayers).toBe(4);
      expect(room.isStarted).toBe(false);
    });

    it('should use default maxPlayers of 4', () => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      expect(room.maxPlayers).toBe(4);
    });

    it('should store socket ID for host', () => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      const socketId = roomManager.getSocketId(room.roomId, 'Alice');
      expect(socketId).toBe('socket-1');
    });
  });

  describe('joinRoom', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomId = room.roomId;
    });

    it('should add player to room', () => {
      const room = roomManager.joinRoom(roomId, 'player-2', 'Bob', 'socket-2');

      expect(room).not.toBeNull();
      expect(room!.players).toHaveLength(2);
      expect(room!.players[1].playerId).toBe('Bob');
    });

    it('should store socket ID for new player', () => {
      roomManager.joinRoom(roomId, 'player-2', 'Bob', 'socket-2');
      const socketId = roomManager.getSocketId(roomId, 'Bob');
      expect(socketId).toBe('socket-2');
    });

    it('should return null for non-existent room', () => {
      const room = roomManager.joinRoom('INVALID', 'player-2', 'Bob', 'socket-2');
      expect(room).toBeNull();
    });

    it('should throw error when room is full', () => {
      const smallRoom = roomManager.createRoom('host-id', 'Host', 'socket-0', 2);
      roomManager.joinRoom(smallRoom.roomId, 'p1', 'Player1', 'socket-1');

      expect(() => {
        roomManager.joinRoom(smallRoom.roomId, 'p2', 'Player2', 'socket-2');
      }).toThrow('Room is full');
    });

    it('should throw error when game already started', () => {
      roomManager.joinRoom(roomId, 'p2', 'Bob', 'socket-2');
      
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
        roomManager.joinRoom(roomId, 'p3', 'Charlie', 'socket-3');
      }).toThrow('Game already started');
    });

    it('should throw error when name is taken', () => {
      expect(() => {
        roomManager.joinRoom(roomId, 'player-2', 'Alice', 'socket-2');
      }).toThrow('Name already taken in this room');
    });
  });

  describe('leaveRoom', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomId = room.roomId;
      roomManager.joinRoom(roomId, 'player-2', 'Bob', 'socket-2');
    });

    it('should remove player from room', () => {
      const room = roomManager.leaveRoom(roomId, 'Bob');

      expect(room).not.toBeNull();
      expect(room!.players).toHaveLength(1);
      expect(room!.players.find(p => p.playerId === 'Bob')).toBeUndefined();
    });

    it('should return null for non-existent room', () => {
      const room = roomManager.leaveRoom('INVALID', 'Bob');
      expect(room).toBeNull();
    });

    it('should return null for non-existent player', () => {
      const room = roomManager.leaveRoom(roomId, 'Charlie');
      expect(room).toBeNull();
    });

    it('should delete room when last player leaves', () => {
      roomManager.leaveRoom(roomId, 'Bob');
      roomManager.leaveRoom(roomId, 'Alice');

      expect(roomManager.getRoom(roomId)).toBeNull();
    });

    it('should assign new host when host leaves', () => {
      const room = roomManager.leaveRoom(roomId, 'Alice');

      expect(room).not.toBeNull();
      expect(room!.hostId).toBe('Bob');
    });
  });

  describe('setPlayerConnected', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomId = room.roomId;
    });

    it('should update player connected status', () => {
      roomManager.setPlayerConnected(roomId, 'Alice', false);
      const room = roomManager.getRoom(roomId);

      expect(room!.players[0].connected).toBe(false);
    });

    it('should do nothing for non-existent room', () => {
      // Should not throw
      expect(() => {
        roomManager.setPlayerConnected('INVALID', 'Alice', false);
      }).not.toThrow();
    });
  });

  describe('getRoom', () => {
    it('should return room info', () => {
      const created = roomManager.createRoom('host-id', 'Alice', 'socket-1');
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
      const created = roomManager.createRoom('host-id', 'Alice', 'socket-1');
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
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomId = room.roomId;
      roomManager.joinRoom(roomId, 'player-2', 'Bob', 'socket-2');
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
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomManager.joinRoom(room.roomId, 'player-2', 'Bob', 'socket-2');

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
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomManager.deleteRoom(room.roomId);

      expect(roomManager.getRoom(room.roomId)).toBeNull();
    });
  });
});
