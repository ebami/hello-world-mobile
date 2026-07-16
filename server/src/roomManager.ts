// Room manager - handles room creation, joining, and player tracking.
//
// Identity model (MFP-03): players are keyed by an opaque, server-issued
// `playerId` — never by display name and never by socket id. `displayName` is
// presentation only; the per-room `socketIds` map records which socket
// currently speaks for each player and is the authoritative source for
// stale-socket detection during authorization.
import type { RoomInfo, PlayerSummary, GameState } from './types';

interface RoomData {
  info: RoomInfo;
  socketIds: Map<string, string>; // playerId -> current socketId
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

  // The production online MVP is two-player (MFP-11). game-core still supports
  // more players, but rooms default to a two-player cap and the server never
  // trusts a larger client-requested size.
  createRoom(hostId: string, hostName: string, socketId: string, maxPlayers: number = 2): RoomInfo {
    const roomId = this.generateRoomCode();

    const hostPlayer: PlayerSummary = {
      playerId: hostId,
      displayName: hostName,
      handCount: 0,
      connected: true,
      isBot: false,
    };

    const roomInfo: RoomInfo = {
      roomId,
      hostId,
      players: [hostPlayer],
      maxPlayers,
      isStarted: false,
    };

    const roomData: RoomData = {
      info: roomInfo,
      socketIds: new Map([[hostId, socketId]]),
      gameState: null,
    };

    this.rooms.set(roomId, roomData);
    console.log(`[${new Date().toISOString()}] [RoomManager] Created room ${roomId} by ${hostName}`);

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

    // Display-name uniqueness is retained within a single room for clarity, but
    // it is a presentation constraint only — never an identity/auth check.
    if (room.info.players.some(p => p.displayName === playerName)) {
      throw new Error('Name already taken in this room');
    }

    const player: PlayerSummary = {
      playerId,
      displayName: playerName,
      handCount: 0,
      connected: true,
      isBot: false,
    };

    room.info.players.push(player);
    room.socketIds.set(playerId, socketId);

    console.log(`[${new Date().toISOString()}] [RoomManager] ${playerName} joined room ${roomId}`);

    return room.info;
  }

  leaveRoom(roomId: string, playerId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const playerIndex = room.info.players.findIndex(p => p.playerId === playerId);
    if (playerIndex === -1) {
      return null;
    }

    room.info.players.splice(playerIndex, 1);
    room.socketIds.delete(playerId);

    // If room is empty, delete it
    if (room.info.players.length === 0) {
      this.rooms.delete(roomId);
      console.log(`[${new Date().toISOString()}] [RoomManager] Room ${roomId} deleted (empty)`);
      return null;
    }

    // If host left, assign the next player as the new host (by opaque id).
    if (room.info.hostId === playerId) {
      room.info.hostId = room.info.players[0].playerId;
      console.log(`[${new Date().toISOString()}] [RoomManager] New host for room ${roomId}: ${room.info.hostId}`);
    }

    console.log(`[${new Date().toISOString()}] [RoomManager] Player ${playerId} left room ${roomId}`);

    return room.info;
  }

  setPlayerConnected(roomId: string, playerId: string, connected: boolean): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.info.players.find(p => p.playerId === playerId);
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

  /** Look up a player summary within a room by opaque player id. */
  getPlayer(roomId: string, playerId: string): PlayerSummary | null {
    const room = this.rooms.get(roomId);
    return room?.info.players.find(p => p.playerId === playerId) ?? null;
  }

  /** Whether the given player id is a member of the room. */
  isMember(roomId: string, playerId: string): boolean {
    return this.getPlayer(roomId, playerId) !== null;
  }

  getSocketId(roomId: string, playerId: string): string | null {
    const room = this.rooms.get(roomId);
    return room?.socketIds.get(playerId) ?? null;
  }

  /**
   * Record the current socket for a player (e.g. on reconnect). Any command
   * arriving on a socket other than this one is treated as stale by
   * {@link isCurrentSocket}. Full reconnect wiring is completed in MFP-04; the
   * setter exists now so authorization has a single source of truth.
   */
  setSocketId(roomId: string, playerId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (room && room.info.players.some(p => p.playerId === playerId)) {
      room.socketIds.set(playerId, socketId);
    }
  }

  /**
   * Whether `socketId` is the socket currently mapped to `playerId` in this
   * room. A mismatch means the socket is stale (superseded by a newer
   * connection) and must not be allowed to act for the player.
   */
  isCurrentSocket(roomId: string, playerId: string, socketId: string): boolean {
    return this.getSocketId(roomId, playerId) === socketId;
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
