// Room manager - handles room creation, joining, and player tracking
import { v4 as uuidv4 } from 'uuid';
import type { RoomInfo, PlayerSummary, GameState } from './types';

interface RoomData {
  info: RoomInfo;
  socketIds: Map<string, string>; // playerId -> socketId
  gameState: GameState | null;
}

class RoomManager {
  private rooms: Map<string, RoomData> = new Map();

  generateRoomCode(): string {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Make sure it's unique
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  createRoom(hostId: string, hostName: string, socketId: string, maxPlayers: number = 4): RoomInfo {
    const roomId = this.generateRoomCode();
    
    const hostPlayer: PlayerSummary = {
      playerId: hostName,
      handCount: 0,
      connected: true,
      isBot: false,
    };

    const roomInfo: RoomInfo = {
      roomId,
      hostId: hostName,
      players: [hostPlayer],
      maxPlayers,
      isStarted: false,
    };

    const roomData: RoomData = {
      info: roomInfo,
      socketIds: new Map([[hostName, socketId]]),
      gameState: null,
    };

    this.rooms.set(roomId, roomData);
    console.log(`[RoomManager] Created room ${roomId} by ${hostName}`);
    
    return roomInfo;
  }

  joinRoom(roomId: string, playerId: string, playerName: string, socketId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    if (room.info.isStarted) {
      throw new Error('Game already started');
    }

    if (room.info.players.length >= room.info.maxPlayers) {
      throw new Error('Room is full');
    }

    // Check if player name already exists
    if (room.info.players.some(p => p.playerId === playerName)) {
      throw new Error('Name already taken in this room');
    }

    const player: PlayerSummary = {
      playerId: playerName,
      handCount: 0,
      connected: true,
      isBot: false,
    };

    room.info.players.push(player);
    room.socketIds.set(playerName, socketId);
    
    console.log(`[RoomManager] ${playerName} joined room ${roomId}`);
    
    return room.info;
  }

  leaveRoom(roomId: string, playerName: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const playerIndex = room.info.players.findIndex(p => p.playerId === playerName);
    if (playerIndex === -1) {
      return null;
    }

    room.info.players.splice(playerIndex, 1);
    room.socketIds.delete(playerName);

    // If room is empty, delete it
    if (room.info.players.length === 0) {
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Room ${roomId} deleted (empty)`);
      return null;
    }

    // If host left, assign new host
    if (room.info.hostId === playerName) {
      room.info.hostId = room.info.players[0].playerId;
      console.log(`[RoomManager] New host for room ${roomId}: ${room.info.hostId}`);
    }

    console.log(`[RoomManager] ${playerName} left room ${roomId}`);
    
    return room.info;
  }

  setPlayerConnected(roomId: string, playerName: string, connected: boolean): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.info.players.find(p => p.playerId === playerName);
    if (player) {
      player.connected = connected;
    }
  }

  getRoom(roomId: string): RoomInfo | null {
    return this.rooms.get(roomId)?.info ?? null;
  }

  getRoomData(roomId: string): RoomData | null {
    return this.rooms.get(roomId) ?? null;
  }

  getSocketId(roomId: string, playerName: string): string | null {
    const room = this.rooms.get(roomId);
    return room?.socketIds.get(playerName) ?? null;
  }

  setGameState(roomId: string, gameState: GameState): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
      room.info.isStarted = true;
      
      // Update hand counts
      gameState.players.forEach((hand, idx) => {
        if (room.info.players[idx]) {
          room.info.players[idx].handCount = hand.length;
        }
      });
    }
  }

  getGameState(roomId: string): GameState | null {
    return this.rooms.get(roomId)?.gameState ?? null;
  }

  updateHandCounts(roomId: string, gameState: GameState): void {
    const room = this.rooms.get(roomId);
    if (room) {
      gameState.players.forEach((hand, idx) => {
        if (room.info.players[idx]) {
          room.info.players[idx].handCount = hand.length;
        }
      });
    }
  }

  getAllSocketIds(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.socketIds.values());
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
    console.log(`[RoomManager] Room ${roomId} deleted`);
  }
}

export const roomManager = new RoomManager();
