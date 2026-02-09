// Re-export all shared game types from the common package
export type {
  Suit,
  Rank,
  Card,
  GameState,
  PlayerSummary,
  PublicGameView,
  PrivateHandPayload,
  RoomInfo,
  CreateRoomOptions,
  JoinRoomOptions,
  GameActionType,
  PlayCardsAction,
  DrawCardAction,
  DeclareLastCardAction,
  GameAction,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@hello-world/game-core';

// Server-only types

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  playerName: string;
  roomId: string | null;
}
