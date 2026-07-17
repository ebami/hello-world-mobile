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
  PlayCardsCommand,
  CommandMetadata,
  DrawCardAction,
  DeclareLastCardAction,
  GameAction,
  RoomInfo,
  RoomPhase,
  RoomSession,
  ResumeSessionOptions,
  ResumeResult,
  CreateRoomOptions,
  JoinRoomOptions,
  ServerToClientEvents,
  ClientToServerEvents,
  GameOverReason,
} from '@hello-world/game-core';

import type {
  PublicGameView,
  PrivateHandPayload,
  GameAction,
  RoomInfo,
  RoomSession,
  ResumeResult,
  CreateRoomOptions,
  JoinRoomOptions,
  GameOverReason,
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
  /** Called when the game ends. `reason` distinguishes a natural win from a
   * draw or an opponent forfeit without parsing `message`. */
  onGameOver: (winnerId: string | null, message: string, reason: GameOverReason) => void;
  /** Called when any player takes an action */
  onPlayerAction: (playerId: string, action: GameAction) => void;
  /** Called when an error occurs */
  onError: (error: string) => void;
  /** Called when connection status changes */
  onConnectionChange: (status: ConnectionStatus) => void;
  /**
   * Called after a transport reconnect successfully resumes the session
   * (MFP-04). The payload is the authoritative snapshot the UI reconciles from.
   * Until this fires, a reconnected transport must not be treated as a usable
   * session.
   */
  onSessionResumed: (result: ResumeResult) => void;
}

/**
 * Connection status for the transport layer.
 *
 * `connected` means the transport is up AND (for a reconnect) the session has
 * been resumed. After a transport drop the status returns to `connecting` while
 * a resume is attempted, so callers never treat an unresumed reconnect as live.
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
