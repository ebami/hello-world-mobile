// Re-export shared types from the common package.
// This shim keeps existing import paths (e.g. '../game/types') working.
export type {
  Suit,
  Rank,
  Card,
  GameState,
  PlayerSummary,
  PublicGameView,
  PrivateHandPayload,
} from "@hello-world/game-core";
