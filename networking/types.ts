/**
 * @fileoverview Transport-agnostic game interface for unified UI code across play modes.
 * 
 * This module defines the core abstractions that allow the same game UI to work
 * with both local (single-player) and remote (multiplayer) game state.
 * 
 * @module networking/types
 */

// Re-export shared types from the common package
export type {
  Card,
  PublicGameView,
  PrivateHandPayload,
  PlayerSummary,
  GameActionType,
  PlayCardsAction,
  DrawCardAction,
  DeclareLastCardAction,
  GameAction,
  RoomInfo,
  RoomPhase,
  RoomSession,
  CreateRoomOptions,
  JoinRoomOptions,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@hello-world/game-core';

import type {
  PublicGameView,
  PrivateHandPayload,
  GameAction,
  RoomInfo,
  RoomSession,
  CreateRoomOptions,
  JoinRoomOptions,
} from '@hello-world/game-core';

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
   * @returns Promise resolving to the room session (room + opaque identity + token)
   */
  createRoom?(options: CreateRoomOptions): Promise<RoomSession>;

  /**
   * Join an existing game room (multiplayer only).
   * @param options - Room joining options
   * @returns Promise resolving to the room session (room + opaque identity + token)
   */
  joinRoom?(options: JoinRoomOptions): Promise<RoomSession>;
  
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
