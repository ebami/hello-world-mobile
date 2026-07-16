// Room manager - handles room creation, joining, and player tracking.
//
// Identity model (MFP-03): players are keyed by an opaque, server-issued
// `playerId` — never by display name and never by socket id. `displayName` is
// presentation only; the per-room `socketIds` map records which socket
// currently speaks for each player and is the authoritative source for
// stale-socket detection during authorization.
import type { RoomInfo, PlayerSummary, GameState, RoomPhase } from './types';

interface RoomData {
  info: RoomInfo;
  socketIds: Map<string, string>; // playerId -> current socketId
  gameState: GameState | null;
  /** Room lifecycle phase (MFP-05). */
  phase: RoomPhase;
  /**
   * Immutable seat → playerId mapping, frozen when the game starts (MFP-05).
   * `gameState.players[i]` is the hand of `seatOrder[i]`. All server-side hand,
   * turn, and winner lookups go through this — never the mutable presentation
   * array — so removing/forfeiting a player can never shift someone onto the
   * wrong hand. Empty while in LOBBY.
   */
  seatOrder: string[];
  /**
   * Monotonic state version (MFP-04). 0 in the lobby; set to 1 when the game
   * starts; incremented once per accepted state-changing command. Clients use
   * it for optimistic-concurrency (`expectedStateVersion`).
   */
  stateVersion: number;
  /**
   * Bounded set of recently-seen command ids per player (MFP-04), for
   * idempotent command handling — a duplicate `commandId` is applied at most
   * once. Kept as an insertion-ordered list so the oldest ids can be evicted.
   */
  recentCommands: Map<string, string[]>;
  /** Epoch ms the room was created (MFP-06). */
  createdAt: number;
  /** Epoch ms of the last meaningful activity, for TTL cleanup (MFP-06). */
  lastActivityAt: number;
}

/** TTLs (ms) governing which idle/finished rooms the sweep removes (MFP-06). */
export interface RoomTtls {
  /** Empty rooms (no players) older than this are removed. */
  emptyMs: number;
  /** Idle lobbies (LOBBY phase, no recent activity) older than this are removed. */
  idleLobbyMs: number;
  /** Finished rooms (COMPLETED/ABANDONED) older than this are removed. */
  completedMs: number;
}

/** How many recent command ids to retain per player for deduplication. */
const RECENT_COMMANDS_PER_PLAYER = 50;

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
      phase: 'LOBBY',
    };

    const now = Date.now();
    const roomData: RoomData = {
      info: roomInfo,
      socketIds: new Map([[hostId, socketId]]),
      gameState: null,
      phase: 'LOBBY',
      seatOrder: [],
      stateVersion: 0,
      recentCommands: new Map(),
      createdAt: now,
      lastActivityAt: now,
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

    // Joining is a LOBBY-only transition (MFP-05).
    if (room.phase !== 'LOBBY') {
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
    room.lastActivityAt = Date.now();

    console.log(`[${new Date().toISOString()}] [RoomManager] ${playerName} joined room ${roomId}`);

    return room.info;
  }

  /**
   * Remove a player from a room. Valid only outside an ACTIVE game: leaving an
   * active game is a forfeit ({@link forfeitActivePlayer}), which must never
   * splice the frozen seat order. Returns the updated room, or `null` when the
   * room is gone/empty or the removal is not applicable.
   */
  leaveRoom(roomId: string, playerId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    // An active game must not have its seat order mutated by a leave.
    if (room.phase === 'ACTIVE') {
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
    if (!room) return;

    room.gameState = gameState;
    room.lastActivityAt = Date.now();

    // The first time a game state is set, the game starts: freeze the seat
    // order and move LOBBY → ACTIVE. Subsequent updates never re-freeze the
    // seat order or reopen a completed game.
    if (room.phase === 'LOBBY') {
      room.phase = 'ACTIVE';
      room.info.phase = 'ACTIVE';
      room.info.isStarted = true;
      room.seatOrder = room.info.players.map(p => p.playerId);
      room.stateVersion = 1; // first authoritative in-game state
    }

    this.updateHandCountsBySeat(room, gameState);
  }

  getGameState(roomId: string): GameState | null {
    return this.rooms.get(roomId)?.gameState ?? null;
  }

  updateHandCounts(roomId: string, gameState: GameState): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.updateHandCountsBySeat(room, gameState);
    }
  }

  /**
   * Update each player's `handCount` via the frozen seat mapping — the hand at
   * `gameState.players[seat]` belongs to `seatOrder[seat]` — so counts follow
   * identity, not array position. Players no longer present (forfeited/left) are
   * skipped. No-op before the seat order is frozen.
   */
  private updateHandCountsBySeat(room: RoomData, gameState: GameState): void {
    room.seatOrder.forEach((playerId, seat) => {
      const player = room.info.players.find(p => p.playerId === playerId);
      const hand = gameState.players[seat];
      if (player && hand) {
        player.handCount = hand.length;
      }
    });
  }

  /** Current lifecycle phase, or null if the room is gone. */
  getPhase(roomId: string): RoomPhase | null {
    return this.rooms.get(roomId)?.phase ?? null;
  }

  /** The frozen seat → playerId mapping (empty before the game starts). */
  getSeatOrder(roomId: string): string[] {
    return this.rooms.get(roomId)?.seatOrder ?? [];
  }

  /**
   * Seat index of a player in the frozen seat order, or -1 if not seated. This
   * is the ONLY correct source of a player's hand/turn index during a game.
   */
  seatIndex(roomId: string, playerId: string): number {
    return this.rooms.get(roomId)?.seatOrder.indexOf(playerId) ?? -1;
  }

  /** Current monotonic state version (0 in the lobby). */
  getStateVersion(roomId: string): number {
    return this.rooms.get(roomId)?.stateVersion ?? 0;
  }

  /** Increment and return the state version after an accepted command (MFP-04). */
  bumpStateVersion(roomId: string): number {
    const room = this.rooms.get(roomId);
    if (!room) return 0;
    room.stateVersion += 1;
    return room.stateVersion;
  }

  /**
   * Whether a command id has already been handled for this player (MFP-04).
   * Used to make command processing idempotent across reconnect retries.
   */
  hasSeenCommand(roomId: string, playerId: string, commandId: string): boolean {
    return this.rooms.get(roomId)?.recentCommands.get(playerId)?.includes(commandId) ?? false;
  }

  /**
   * Record a handled command id for a player, evicting the oldest once the
   * per-player retention bound is exceeded (bounded memory).
   */
  recordCommand(roomId: string, playerId: string, commandId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const ids = room.recentCommands.get(playerId) ?? [];
    ids.push(commandId);
    while (ids.length > RECENT_COMMANDS_PER_PLAYER) {
      ids.shift();
    }
    room.recentCommands.set(playerId, ids);
  }

  /**
   * Record game completion exactly once: transitions ACTIVE → COMPLETED and
   * returns `true` only on that first transition. Callers gate the single
   * `game_over` emission on this, so a natural win and a concurrent forfeit can
   * never both announce a result.
   */
  completeGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'ACTIVE') {
      return false;
    }
    room.phase = 'COMPLETED';
    room.info.phase = 'COMPLETED';
    room.lastActivityAt = Date.now();
    return true;
  }

  /**
   * Forfeit an active player (explicit leave or grace expiry). In the
   * two-player MVP this completes the game and awards the opponent the win.
   * Returns the winner's opaque id, or `null` if the room is not ACTIVE, the
   * player is not seated, or the game was already completed (so callers emit
   * `game_over` at most once). The seat order is never mutated.
   */
  forfeitActivePlayer(roomId: string, playerId: string): { winnerId: string } | null {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'ACTIVE') {
      return null;
    }
    if (!room.seatOrder.includes(playerId)) {
      return null;
    }
    const winnerId = room.seatOrder.find(id => id !== playerId) ?? null;

    // Mark the forfeiting player disconnected for presentation; the seat order
    // is left intact.
    const leaver = room.info.players.find(p => p.playerId === playerId);
    if (leaver) {
      leaver.connected = false;
    }

    room.phase = 'COMPLETED';
    room.info.phase = 'COMPLETED';
    room.lastActivityAt = Date.now();

    return winnerId ? { winnerId } : null;
  }

  getAllSocketIds(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.socketIds.values());
  }

  /** Number of active rooms (for server capacity enforcement, MFP-06). */
  roomCount(): number {
    return this.rooms.size;
  }

  /**
   * Remove rooms that have outlived their TTL (MFP-06). Empty rooms, idle
   * lobbies, and finished (COMPLETED/ABANDONED) rooms are eligible; ACTIVE rooms
   * are always retained so an in-progress game is never swept. `now` is
   * injectable for deterministic tests. Returns the removed room ids.
   */
  sweepExpired(now: number, ttls: RoomTtls): string[] {
    const removed: string[] = [];
    for (const [roomId, room] of this.rooms) {
      const idleMs = now - room.lastActivityAt;
      let expired = false;
      if (room.info.players.length === 0) {
        expired = idleMs > ttls.emptyMs;
      } else if (room.phase === 'LOBBY') {
        expired = idleMs > ttls.idleLobbyMs;
      } else if (room.phase === 'COMPLETED' || room.phase === 'ABANDONED') {
        expired = idleMs > ttls.completedMs;
      }
      // ACTIVE rooms are never swept.
      if (expired) {
        this.rooms.delete(roomId);
        removed.push(roomId);
      }
    }
    return removed;
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
    console.log(`[RoomManager] Room ${roomId} deleted`);
  }
}

export const roomManager = new RoomManager();
