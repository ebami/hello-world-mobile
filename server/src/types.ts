// Server-specific types - re-exports and extends from game/types
// Since we're in a separate package, we define compatible types here

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

export interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: Card[][];
  currentPlayer: number;
  direction: number;
  message: string;
  lastCardCalled: boolean[];
  drawPressure: number;
  hasPlayed: boolean[];
}

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

// Game action types
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

// Socket event types
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

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  playerName: string;
  roomId: string | null;
}
