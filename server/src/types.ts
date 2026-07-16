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
  RoomPhase,
  RoomSession,
  CreateRoomOptions,
  JoinRoomOptions,
  GameActionType,
  PlayCardsAction,
  PlayCardsCommand,
  CommandMetadata,
  DrawCardAction,
  DeclareLastCardAction,
  GameAction,
  ResumeSessionOptions,
  ResumeResult,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@hello-world/game-core';

// Server-only types

import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents as ClientEvents,
  ServerToClientEvents as ServerEvents,
} from '@hello-world/game-core';

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  playerName: string;
  roomId: string | null;
}

/**
 * Fully-typed Socket.IO server/socket aliases shared across server modules
 * (socketServer, gameHandler, validation). Defined once here to avoid drift.
 */
export type TypedServer = Server<
  ClientEvents,
  ServerEvents,
  InterServerEvents,
  SocketData
>;
export type TypedSocket = Socket<
  ClientEvents,
  ServerEvents,
  InterServerEvents,
  SocketData
>;
