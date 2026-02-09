// Re-export deck utilities from the common package.
// This shim keeps existing import paths (e.g. '../game/deck') working.
export { generateDeck, shuffleDeck, dealCards } from "@hello-world/game-core";
