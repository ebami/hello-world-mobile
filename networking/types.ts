/**
 * @fileoverview Transport-agnostic game interface for unified UI code across play modes.
 * 
 * This module defines the core abstractions that allow the same game UI to work
 * with both local (single-player) and remote (multiplayer) game state.
 * 
 * @module networking/types
 */

import type { Card, PublicGameView, PrivateHandPayload, PlayerSummary } from '../game/types';

// Re-export game types for convenience
export type { PublicGameView, PrivateHandPayload, PlayerSummary } from '../game/types';

/**
 * Action type identifiers for game actions sent through the transport layer.
 */
export type GameActionType = 'PLAY_CARDS' | 'DRAW_CARD' | 'DECLARE_LAST_CARD';

/**
 * Action to play one or more cards from the player's hand.
 */
export interface PlayCardsAction {
  type: 'PLAY_CARDS';
  /** The cards to play, in order */
  cards: Card[];
}

/**
 * Action to draw card(s) from the deck.
 * The number of cards drawn depends on current draw pressure.
 */
export interface DrawCardAction {
  type: 'DRAW_CARD';
}

/**
 * Action to declare "last card" before going out.
 * Must be declared before the player's turn when they have one playable card.
 */
export interface DeclareLastCardAction {
  type: 'DECLARE_LAST_CARD';
  /** The player index declaring last card */
  player: number;
}

/**
 * Union type of all possible game actions.
 */
export type GameAction = PlayCardsAction | DrawCardAction | DeclareLastCardAction;

/**
 * Information about a game room/lobby.
 */
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

/**
 * Options for creating a new game room.
 */
export interface CreateRoomOptions {
  /** Maximum players allowed (default: 4) */
  maxPlayers?: number;
  /** Display name for the creating player */
  playerName: string;
}

/**
 * Options for joining an existing game room.
 */
export interface JoinRoomOptions {
  /** The room code to join */
  roomId: string;
  /** Display name for the joining player */
  playerName: string;
}

/**
 * Callback functions for transport events.
 * All callbacks are optional; set only the ones you need.
 */
export interface TransportCallbacks {
  /** Called when game state is updated */
  onStateUpdate: (state: PublicGameView) => void;
  /** Called when the player's hand is updated */
  onHandUpdate: (payload: PrivateHandPayload) => void;
  /** Called when room/lobby state changes */
  onRoomUpdated: (room: RoomInfo) => void;
  /** Called when the game starts */
  onGameStart: (state: PublicGameView, hand: PrivateHandPayload) => void;
  /** Called when the game ends */
  onGameOver: (winnerId: string | null, message: string) => void;
  /** Called when any player takes an action */
  onPlayerAction: (playerId: string, action: GameAction) => void;
  /** Called when an error occurs */
  onError: (error: string) => void;
  /** Called when connection status changes */
  onConnectionChange: (status: ConnectionStatus) => void;
}

/**
 * Connection status for the transport layer.
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Transport interface for game communication.
 * 
 * This abstraction allows the same UI code to work with both local
 * (single-player) and remote (multiplayer) game state.
 * 
 * @example
 * ```typescript
 * const transport = new SocketTransport();
 * transport.setCallbacks({ onStateUpdate: (state) => updateUI(state) });
 * await transport.connect();
 * transport.sendAction({ type: 'PLAY_CARDS', cards: [card] });
 * ```
 */
export interface GameTransport {
  /**
   * Establish connection to the game backend.
   * For LocalTransport, this initializes the game immediately.
   * For SocketTransport, this connects to the server.
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from the game backend and clean up resources.
   */
  disconnect(): void;
  
  /**
   * Get the current connection status.
   */
  getConnectionStatus(): ConnectionStatus;

  /**
   * Create a new game room (multiplayer only).
   * @param options - Room creation options
   * @returns Promise resolving to the created room info
   */
  createRoom?(options: CreateRoomOptions): Promise<RoomInfo>;
  
  /**
   * Join an existing game room (multiplayer only).
   * @param options - Room joining options
   * @returns Promise resolving to the joined room info
   */
  joinRoom?(options: JoinRoomOptions): Promise<RoomInfo>;
  
  /**
   * Leave the current room (multiplayer only).
   */
  leaveRoom?(): void;
  
  /**
   * Start the game (multiplayer only, host only).
   */
  startGame?(): void;

  /**
   * Send a game action.
   * @param action - The action to send
   */
  sendAction(action: GameAction): void;

  /**
   * Register callback functions for transport events.
   * @param callbacks - Partial set of callbacks to register
   */
  setCallbacks(callbacks: Partial<TransportCallbacks>): void;
}

/**
 * Socket.IO server-to-client event definitions.
 * Used for type-safe event handling.
 */
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

/**
 * Socket.IO client-to-server event definitions.
 * Used for type-safe event emission.
 */
export interface ClientToServerEvents {
  create_room: (options: CreateRoomOptions, callback: (room: RoomInfo | null, error?: string) => void) => void;
  join_room: (options: JoinRoomOptions, callback: (room: RoomInfo | null, error?: string) => void) => void;
  leave_room: () => void;
  start_game: () => void;
  play_cards: (cards: Card[]) => void;
  draw_card: () => void;
  declare_last_card: () => void;
}
