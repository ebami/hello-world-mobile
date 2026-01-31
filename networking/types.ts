// Transport-agnostic game interface for unified UI code across play modes
import type { Card, PublicGameView, PrivateHandPayload, PlayerSummary } from '../game/types';

// Re-export game types for convenience
export type { PublicGameView, PrivateHandPayload, PlayerSummary } from '../game/types';

// Action types that can be sent to the transport layer
export type GameActionType = 'PLAY_CARDS' | 'DRAW_CARD' | 'DECLARE_LAST_CARD';

export interface PlayCardsAction {
  type: 'PLAY_CARDS';
  cards: Card[];
}

export interface DrawCardAction {
  type: 'DRAW_CARD';
}

export interface DeclareLastCardAction {
  type: 'DECLARE_LAST_CARD';
  player: number;
}

export type GameAction = PlayCardsAction | DrawCardAction | DeclareLastCardAction;

// Room/lobby related types
export interface RoomInfo {
  roomId: string;
  hostId: string;
  players: PlayerSummary[];
  maxPlayers: number;
  isStarted: boolean;
}

export interface CreateRoomOptions {
  maxPlayers?: number;
  playerName: string;
}

export interface JoinRoomOptions {
  roomId: string;
  playerName: string;
}

// Transport event callbacks
export interface TransportCallbacks {
  onStateUpdate: (state: PublicGameView) => void;
  onHandUpdate: (payload: PrivateHandPayload) => void;
  onRoomUpdated: (room: RoomInfo) => void;
  onGameStart: (state: PublicGameView, hand: PrivateHandPayload) => void;
  onGameOver: (winnerId: string | null, message: string) => void;
  onPlayerAction: (playerId: string, action: GameAction) => void;
  onError: (error: string) => void;
  onConnectionChange: (status: ConnectionStatus) => void;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// Transport interface - unified across all play modes
export interface GameTransport {
  // Connection lifecycle
  connect(): Promise<void>;
  disconnect(): void;
  getConnectionStatus(): ConnectionStatus;

  // Room management (multiplayer only)
  createRoom?(options: CreateRoomOptions): Promise<RoomInfo>;
  joinRoom?(options: JoinRoomOptions): Promise<RoomInfo>;
  leaveRoom?(): void;
  startGame?(): void;

  // Game actions
  sendAction(action: GameAction): void;

  // Event registration
  setCallbacks(callbacks: Partial<TransportCallbacks>): void;
}

// Socket.IO specific event types (for type safety)
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

export interface ClientToServerEvents {
  create_room: (options: CreateRoomOptions, callback: (room: RoomInfo | null, error?: string) => void) => void;
  join_room: (options: JoinRoomOptions, callback: (room: RoomInfo | null, error?: string) => void) => void;
  leave_room: () => void;
  start_game: () => void;
  play_cards: (cards: Card[]) => void;
  draw_card: () => void;
  declare_last_card: () => void;
}
