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
}

// ========== Public / Private Views ==========

export interface PlayerSummary {
  playerId: string;
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
  players: PlayerSummary[];
}

export interface PrivateHandPayload {
  roomId: string;
  playerId: string;
  hand: Card[];
}

// ========== Room / Lobby Types ==========

/** Information about a game room/lobby. */
export interface RoomInfo {
  /** Unique room identifier (6-character code) */
  roomId: string;
  /** Player ID of the room host */
  hostId: string;
  /** List of players in the room */
  players: PlayerSummary[];
  /** Maximum number of players allowed */
  maxPlayers: number;
  /** Whether the game has started */
  isStarted: boolean;
}

/** Options for creating a new game room. */
export interface CreateRoomOptions {
  /** Maximum players allowed (default: 4) */
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

/** Socket.IO server-to-client event definitions. */
export interface ServerToClientEvents {
  room_created: (room: RoomInfo) => void;
  room_joined: (room: RoomInfo) => void;
  room_updated: (room: RoomInfo) => void;
  game_state_update: (state: PublicGameView) => void;
  hand_update: (payload: PrivateHandPayload) => void;
  player_action: (playerId: string, action: GameAction) => void;
  game_start: (state: PublicGameView, hand: PrivateHandPayload) => void;
  game_over: (winnerId: string | null, message: string) => void;
  error: (message: string) => void;
}

/** Socket.IO client-to-server event definitions. */
export interface ClientToServerEvents {
  create_room: (
    options: CreateRoomOptions,
    callback: (room: RoomInfo | null, error?: ProtocolError) => void,
  ) => void;
  join_room: (
    options: JoinRoomOptions,
    callback: (room: RoomInfo | null, error?: ProtocolError) => void,
  ) => void;
  leave_room: () => void;
  start_game: () => void;
  play_cards: (cards: Card[]) => void;
  draw_card: () => void;
  declare_last_card: () => void;
}
