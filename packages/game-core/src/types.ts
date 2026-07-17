/**
 * @fileoverview Shared types for the card game, used by both the
 * React Native client and the Socket.IO server.
 *
 * @module @hello-world/game-core/types
 */

import type { ProtocolError } from "./protocol";

// ========== Core Card Types ==========

export type Suit = "♠" | "♥" | "♦" | "♣";

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

// ========== Game State ==========

export interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: Card[][];
  currentPlayer: number;
  direction: number;
  message: string;
  lastCardCalled: boolean[];
  /**
   * Number of cards the next player must draw unless they stack or shield.
   * A value of `0` means no draw pressure is currently in effect.
   */
  drawPressure: number;
  /**
   * Flags indicating whether each player has taken at least one turn in the
   * current hand. `declareLastCard` only succeeds when every entry is `true`
   * and the declaration happens before the caller's turn. Once a player has
   * acted, their value remains `true` for the rest of the hand.
   */
  hasPlayed: boolean[];
  /**
   * The suit currently in force. Set to the declared suit after an Ace is
   * played (the Ace keeps its own physical suit in the discard pile); `null`
   * otherwise. Valid-move calculation matches against this suit when present.
   */
  activeSuit?: Suit | null;
}

// ========== Public / Private Views ==========

export interface PlayerSummary {
  /**
   * Opaque, server-issued identity for the player. Immutable for the life of
   * the session and independent of both the display name and the socket id.
   * This is the only value safe to use for authorization or membership checks.
   */
  playerId: string;
  /** User-visible name. Presentation only — never used for authorization. */
  displayName: string;
  handCount: number;
  connected: boolean;
  isBot: boolean;
}

export interface PublicGameView {
  roomId: string;
  deckCount: number;
  discardPile: Card[];
  currentPlayer: number;
  direction: number;
  message: string;
  lastCardCalled: boolean[];
  drawPressure: number;
  hasPlayed: boolean[];
  /** Suit currently in force (the declared suit after an Ace), or null. */
  activeSuit?: Suit | null;
  players: PlayerSummary[];
  /** Room lifecycle phase (MFP-05); set by the server, optional on the wire. */
  phase?: RoomPhase;
  /**
   * Monotonic version of the authoritative game state (MFP-04). Increments once
   * per accepted state-changing command; clients echo it back as
   * {@link CommandMetadata.expectedStateVersion}. Set by the server.
   */
  stateVersion?: number;
}

export interface PrivateHandPayload {
  roomId: string;
  /** Opaque player id of the recipient (never a display name). */
  playerId: string;
  hand: Card[];
}

// ========== Room / Lobby Types ==========

/**
 * Explicit room lifecycle (MFP-05). The phase — not the mutable player array —
 * governs which transitions and commands are legal:
 *  - `LOBBY`: players may join/leave; the host may start.
 *  - `ACTIVE`: a game is in progress; the seat order is frozen.
 *  - `COMPLETED`: the game ended (win/draw/forfeit); gameplay is rejected.
 *  - `ABANDONED`: ended without a normal result (reserved; e.g. all left).
 *  - `CLOSED`: fully torn down / scheduled for cleanup.
 */
export type RoomPhase = 'LOBBY' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED' | 'CLOSED';

/** Information about a game room/lobby. */
export interface RoomInfo {
  /** Unique room identifier (6-character code) */
  roomId: string;
  /** Opaque player ID of the room host (never a display name or socket id). */
  hostId: string;
  /** List of players in the room */
  players: PlayerSummary[];
  /** Maximum number of players allowed */
  maxPlayers: number;
  /** Whether the game has started (derived from {@link phase} for compatibility). */
  isStarted: boolean;
  /**
   * Current room lifecycle phase (MFP-05). Always set by the server; optional
   * on the wire type so existing/partial fixtures remain valid.
   */
  phase?: RoomPhase;
}

/**
 * Result returned when a player creates or joins a room. Carries the caller's
 * server-issued opaque {@link playerId} alongside a room-scoped, expiring
 * reconnect token so the client can persist a stable identity. The
 * `reconnectToken` is a signed credential — treat it as a secret and never log
 * it. Durable secure persistence of these values is completed in MFP-04.
 */
export interface RoomSession {
  /** Public room/lobby state. */
  room: RoomInfo;
  /** The caller's opaque, server-issued player identity. */
  playerId: string;
  /** Signed, room-scoped, expiring reconnect credential. Never log this. */
  reconnectToken: string;
  /** ISO-8601 timestamp at which {@link reconnectToken} expires. */
  expiresAt: string;
}

/** Credentials a client presents to resume a session after a reconnect (MFP-04). */
export interface ResumeSessionOptions {
  /** Room the session belongs to. */
  roomId: string;
  /** The caller's opaque player identity. */
  playerId: string;
  /** The signed reconnect token issued at create/join (or last resume). */
  reconnectToken: string;
}

/**
 * Authoritative snapshot returned on a successful resume (MFP-04). The client
 * reconciles its local state entirely from this response. The reconnect token
 * is rotated, so the previous token should be discarded.
 */
export interface ResumeResult {
  /** Current public room/lobby state. */
  room: RoomInfo;
  /** Current public game view, or null if the game has not started. */
  state: PublicGameView | null;
  /** The resumed player's authoritative private hand, or null if no game yet. */
  hand: PrivateHandPayload | null;
  /** The resumed player's opaque identity. */
  playerId: string;
  /** A freshly rotated reconnect token; replaces the presented one. */
  reconnectToken: string;
  /** ISO-8601 expiry of the rotated token. */
  expiresAt: string;
  /** Current monotonic state version to resume command versioning from. */
  stateVersion: number;
}

/** Options for creating a new game room. */
export interface CreateRoomOptions {
  /**
   * Requested maximum players. The production online MVP is two-player
   * (MFP-11): the server caps every room at two and ignores any larger value,
   * so this is effectively advisory and may be omitted.
   */
  maxPlayers?: number;
  /** Display name for the creating player */
  playerName: string;
}

/** Options for joining an existing game room. */
export interface JoinRoomOptions {
  /** The room code to join */
  roomId: string;
  /** Display name for the joining player */
  playerName: string;
}

// ========== Game Action Types ==========

/** Action type identifiers for game actions sent through the transport layer. */
export type GameActionType = "PLAY_CARDS" | "DRAW_CARD" | "DECLARE_LAST_CARD";

/** Action to play one or more cards from the player's hand. */
export interface PlayCardsAction {
  type: "PLAY_CARDS";
  /** The cards to play, in order */
  cards: Card[];
  /**
   * Chosen active suit — required when the final played card is an Ace,
   * rejected otherwise. Carried through to the network as `declaredSuit`.
   */
  declaredSuit?: Suit;
}

/**
 * Metadata attached to a state-changing command for idempotency and optimistic
 * concurrency (MFP-04). `commandId` lets the server discard a duplicate (e.g. a
 * retried command after reconnect) so it is applied at most once;
 * `expectedStateVersion` is the monotonic {@link PublicGameView.stateVersion}
 * the client believed it was acting on, so a stale command is rejected instead
 * of mutating newer state.
 */
export interface CommandMetadata {
  /** Client-generated unique id for this command instance. */
  commandId: string;
  /** The state version the client expects the server to be at. */
  expectedStateVersion: number;
}

/**
 * Network command for playing cards. The server resolves `cardIds` against the
 * player's own authoritative hand, so a client can never forge a card's rank
 * or physical suit — only reference cards it actually holds.
 */
export interface PlayCardsCommand {
  /** IDs of the cards to play, in the intended order. */
  cardIds: string[];
  /** Chosen active suit — required when the final played card is an Ace. */
  declaredSuit?: Suit;
  /** Idempotency + version metadata (MFP-04); optional for compatibility. */
  meta?: CommandMetadata;
}

/** Action to draw card(s) from the deck. */
export interface DrawCardAction {
  type: "DRAW_CARD";
}

/** Action to declare "last card" before going out. */
export interface DeclareLastCardAction {
  type: "DECLARE_LAST_CARD";
  /** The player index declaring last card */
  player: number;
}

/** Union type of all possible game actions. */
export type GameAction =
  | PlayCardsAction
  | DrawCardAction
  | DeclareLastCardAction;

// ========== Socket Event Types ==========

/**
 * How a game ended. Sent explicitly with `game_over` so clients never have to
 * parse the human-readable message to tell a natural win from a forfeit
 * (opponent left) — see residual finding R1 on message-string coupling.
 */
export type GameOverReason = 'win' | 'draw' | 'forfeit';

/** Socket.IO server-to-client event definitions. */
export interface ServerToClientEvents {
  room_created: (room: RoomInfo) => void;
  room_joined: (room: RoomInfo) => void;
  room_updated: (room: RoomInfo) => void;
  game_state_update: (state: PublicGameView) => void;
  hand_update: (payload: PrivateHandPayload) => void;
  player_action: (playerId: string, action: GameAction) => void;
  game_start: (state: PublicGameView, hand: PrivateHandPayload) => void;
  game_over: (winnerId: string | null, message: string, reason: GameOverReason) => void;
  error: (message: string) => void;
  /** Planned graceful shutdown notice (MFP-09); clients may show a notice. */
  server_shutdown: (message: string) => void;
}

/** Socket.IO client-to-server event definitions. */
export interface ClientToServerEvents {
  create_room: (
    options: CreateRoomOptions,
    callback: (session: RoomSession | null, error?: ProtocolError) => void,
  ) => void;
  join_room: (
    options: JoinRoomOptions,
    callback: (session: RoomSession | null, error?: ProtocolError) => void,
  ) => void;
  /** Resume a session after a transport reconnect (MFP-04). */
  resume_session: (
    options: ResumeSessionOptions,
    callback: (result: ResumeResult | null, error?: ProtocolError) => void,
  ) => void;
  leave_room: () => void;
  start_game: () => void;
  play_cards: (command: PlayCardsCommand) => void;
  draw_card: (meta?: CommandMetadata) => void;
  declare_last_card: (meta?: CommandMetadata) => void;
}
