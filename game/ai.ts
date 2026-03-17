import type { Card, GameState } from "./types";
import { getValidMoves } from "./gameLogic";

export type Difficulty = "easy" | "medium" | "hard";

/**
 * Check whether the bot should declare "last card" before playing.
 *
 * Returns true when:
 * - The bot has 1–2 cards remaining
 * - It hasn't already declared
 * - Every player has taken at least one turn
 * - A valid move exists that would empty the bot's hand this turn
 */
export function shouldBotDeclareLastCard(
  state: GameState,
  botPlayer: number,
): boolean {
  const hand = state.players[botPlayer];
  if (hand.length === 0 || hand.length > 2) return false;
  if (state.lastCardCalled[botPlayer]) return false;
  if (!state.hasPlayed.every(Boolean)) return false;

  const topCard = state.discardPile[state.discardPile.length - 1];
  if (!topCard) return false;

  const validMoves = getValidMoves(hand, topCard, state.drawPressure);

  if (hand.length === 1) {
    return validMoves.singles.some((c) => c.id === hand[0].id);
  }
  // 2 cards – can we play them all in a single run?
  return validMoves.runs.some((run) => run.length === hand.length);
}

// getComputerMove selects a card for the computer player based on
// a heuristic that varies by difficulty level.
// - Easy: 30% chance to make a random valid move, otherwise uses medium logic
// - Medium: Prefers action cards (Two, Black Jack, Red Jack, Ace) in priority order
// - Hard: Uses medium logic + prefers moves that force opponent draws
// If no valid card exists, the computer opts to draw from the deck.
export function getComputerMove(
  state: GameState,
  difficulty: Difficulty = "medium",
): {
  cards?: Card[];
  draw?: boolean;
} {
  const hand = state.players[state.currentPlayer];
  const topCard = state.discardPile.at(-1);
  if (!topCard) return { draw: true };

  const validMoves = getValidMoves(hand, topCard, state.drawPressure);
  const valid = [...validMoves.singles.map((c) => [c]), ...validMoves.runs];

  if (valid.length === 0) {
    return { draw: true };
  }

  // Highest priority: go out if possible (play all remaining cards)
  const goOutMove = valid.find((run) => run.length === hand.length);
  if (goOutMove) {
    return { cards: goOutMove };
  }

  // Easy mode: 30% chance to pick random valid move
  if (difficulty === "easy" && Math.random() < 0.3) {
    const randomIndex = Math.floor(Math.random() * valid.length);
    return { cards: valid[randomIndex] };
  }

  const drawValue = (run: Card[]) =>
    run.reduce((sum, c) => {
      if (c.rank === "2") return sum + 2;
      if (c.rank === "J" && (c.suit === "♠" || c.suit === "♣"))
        return sum + 5;
      return sum;
    }, 0);

  const priorities: ((run: Card[]) => boolean)[] = [
    (r) => r.at(-1)?.rank === "2",
    (r) => {
      const last = r.at(-1);
      return (
        last?.rank === "J" && (last.suit === "♠" || last.suit === "♣")
      );
    },
    (r) => {
      const last = r.at(-1);
      return (
        last?.rank === "J" && (last.suit === "♥" || last.suit === "♦")
      );
    },
    (r) => r.at(-1)?.rank === "A",
  ];

  // Hard mode: Prioritize moves with draw pressure
  if (difficulty === "hard") {
    const drawMoves = valid.filter((run) => drawValue(run) > 0);
    if (drawMoves.length > 0) {
      drawMoves.sort((a, b) => drawValue(b) - drawValue(a));
      return { cards: drawMoves[0] };
    }
  }

  for (const matches of priorities) {
    const choices = valid.filter(matches);
    if (choices.length > 0) {
      choices.sort((a, b) => drawValue(b) - drawValue(a));
      return { cards: choices[0] };
    }
  }

  return { cards: valid[0] };
}

export function getBotTurnDelay(difficulty: Difficulty = "medium"): number {
  switch (difficulty) {
    case "easy":
      return 2000;
    case "medium":
      return 1500;
    case "hard":
      return 1000;
  }
}

export default { getComputerMove, getBotTurnDelay };
