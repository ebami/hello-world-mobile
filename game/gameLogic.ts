// Re-export game logic from the common package.
// This shim keeps existing import paths (e.g. '../game/gameLogic') working.
export {
  getValidMoves,
  drawCards,
  applyCardEffect,
  applyPenalty,
  isGameOver,
  resolveEndgame,
  nextActiveIndex,
  declareLastCard,
} from "@hello-world/game-core";
export type { GameOverResult, EndgameResult } from "@hello-world/game-core";
