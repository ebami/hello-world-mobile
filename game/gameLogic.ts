// Core game mechanics for a two-player shedding game using a standard
// 52-card deck with no Jokers.
import type { Card, GameState, Rank } from "./types";
import { shuffleDeck } from "./deck";

const rankOrder: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

const rankValue = (r: Rank): number => rankOrder.indexOf(r);

// Returns all valid single card plays and multi-card runs that can be played on
// top of the provided card. Runs must contain at least two cards and follow the
// full rule set: single direction with ±1 rank steps in the same suit,
// same-rank hops to change suit, a single optional Ace wrap, and Queen pivots
// that reset direction. When `drawPressure` is greater than zero, normal
// matching is waived and only draw cards (2s and black Jacks) or a shielding
// Red Jack may be played.
export function getValidMoves(
  hand: Card[],
  topCard: Card,
  drawPressure = 0,
): {
  singles: Card[];
  runs: Card[][];
} {
  const isDrawCard = (c: Card) =>
    c.rank === "2" || (c.rank === "J" && (c.suit === "♠" || c.suit === "♣"));
  const isRedJack = (c: Card) =>
    c.rank === "J" && (c.suit === "♥" || c.suit === "♦");

  const canStart = (card: Card) => {
    if (drawPressure > 0) return isDrawCard(card) || isRedJack(card);
    return (
      topCard.rank === "Q" ||
      card.suit === topCard.suit ||
      card.rank === topCard.rank
    );
  };

  const sorted = [...hand].sort(
    (a, b) => rankValue(a.rank) - rankValue(b.rank),
  );
  const singles: Card[] = [];
  const runs: Card[][] = [];

  const isValidNext = (
    run: Card[],
    next: Card,
    direction: number | null,
  ): boolean => {
    const last = run[run.length - 1];
    if (drawPressure > 0) {
      if (isRedJack(next)) return isDrawCard(last);
      return isDrawCard(next);
    }
    if (last.rank === "Q") return true;
    if (next.rank === "Q")
      return (
        (last.rank === "J" || last.rank === "K") && last.suit === next.suit
      );

    let diff = rankValue(next.rank) - rankValue(last.rank);
    if (last.rank === "K" && next.rank === "A") diff = 1;
    else if (last.rank === "A" && next.rank === "2") diff = 1;
    else if (last.rank === "2" && next.rank === "A") diff = -1;
    else if (last.rank === "A" && next.rank === "K") diff = -1;

    if (Math.abs(diff) === 1) {
      if (last.suit !== next.suit) return false;
      if (direction !== null && direction !== diff) return false;
      return true;
    }
    if (diff === 0) return true;
    return false;
  };

  const updateDirection = (
    direction: number | null,
    last: Card,
    next: Card,
  ): number | null => {
    if (drawPressure > 0) return null;
    if (last.rank === "Q") return null;
    if (next.rank === "Q") return direction;
    let diff = rankValue(next.rank) - rankValue(last.rank);
    if (last.rank === "K" && next.rank === "A") diff = 1;
    else if (last.rank === "A" && next.rank === "2") diff = 1;
    else if (last.rank === "2" && next.rank === "A") diff = -1;
    else if (last.rank === "A" && next.rank === "K") diff = -1;
    if (diff === 0) return direction;
    if (Math.abs(diff) === 1) return diff;
    return direction;
  };

  const updateWraps = (wraps: number, last: Card, next: Card): number => {
    if (drawPressure > 0) return wraps;
    return (
      wraps +
      ((last.rank === "A" && next.rank === "2") ||
      (last.rank === "2" && next.rank === "A")
        ? 1
        : 0)
    );
  };

  const buildRuns = (run: Card[], direction: number | null, wraps: number) => {
    if (run.length === 1) {
      singles.push(run[0]);
    } else {
      runs.push(run);
    }
    const last = run[run.length - 1];
    for (const next of sorted) {
      if (run.some((c) => c.id === next.id)) continue;
      if (drawPressure > 0 && !isDrawCard(next) && !isRedJack(next)) continue;
      if (!isValidNext(run, next, direction)) continue;
      if (drawPressure > 0 && isRedJack(last)) continue;
      const ndir =
        next.rank === "Q" || last.rank === "Q"
          ? null
          : updateDirection(direction, last, next);
      const nwraps = updateWraps(wraps, last, next);
      if (nwraps > 1) continue;
      buildRuns([...run, next], ndir, nwraps);
    }
  };

  sorted.forEach((card) => {
    if (canStart(card)) {
      buildRuns([card], null, 0);
    }
  });

  return { singles, runs };
}

function nextPlayerIndex(
  current: number,
  direction: number,
  total: number,
): number {
  return (current + direction + total) % total;
}

export function drawCards(
  deck: Card[],
  discardPile: Card[],
  count: number,
): { deck: Card[]; discardPile: Card[]; drawn: Card[] } {
  const draw: Card[] = [];
  let deckCopy = [...deck];
  let discardCopy = [...discardPile];
  for (let i = 0; i < count; i++) {
    if (deckCopy.length === 0) {
      const top = discardCopy.pop();
      deckCopy = shuffleDeck(discardCopy);
      discardCopy = top ? [top] : [];
    }
    if (deckCopy.length === 0) break;
    draw.push(deckCopy.shift() as Card);
  }
  
  // Warn when deck exhaustion prevents drawing all requested cards
  if (draw.length < count && typeof console !== 'undefined') {
    console.warn(`Deck exhaustion: could only draw ${draw.length} of ${count} requested cards`);
  }
  
  return { deck: deckCopy, discardPile: discardCopy, drawn: draw };
}

export function applyCardEffect(state: GameState, cards: Card[]): GameState {
  const playerIndex = state.currentPlayer;
  const players = state.players.map((hand, idx) =>
    idx === playerIndex
      ? hand.filter((c) => !cards.some((p) => p.id === c.id))
      : hand,
  );
  let discardPile = [...state.discardPile, ...cards];
  let deck = [...state.deck];
  let direction = state.direction;
  let message = "";
  let currentPlayer = state.currentPlayer;
  const lastCardCalled = [...state.lastCardCalled];
  const hasPlayed = [...state.hasPlayed];
  hasPlayed[playerIndex] = true;

  let drawPressure = state.drawPressure;

  const last = cards[cards.length - 1];
  const drawCount = cards.reduce((sum, c) => {
    if (c.rank === "2") return sum + 2;
    if (c.rank === "J" && (c.suit === "♠" || c.suit === "♣")) return sum + 5;
    return sum;
  }, 0);

  switch (last.rank) {
    case "2":
      drawPressure += drawCount;
      currentPlayer = nextPlayerIndex(currentPlayer, direction, players.length);
      lastCardCalled[currentPlayer] = false;
      message = `Draw pressure increases to ${drawPressure}`;
      break;
    case "J":
      if (last.suit === "♠" || last.suit === "♣") {
        drawPressure += drawCount;
        currentPlayer = nextPlayerIndex(
          currentPlayer,
          direction,
          players.length,
        );
        lastCardCalled[currentPlayer] = false;
        message = `Draw pressure increases to ${drawPressure}`;
      } else {
        drawPressure = 0;
        message =
          state.drawPressure > 0
            ? "Red Jack cancels draw pressure"
            : "Red Jack cancels effects";
        currentPlayer = nextPlayerIndex(
          currentPlayer,
          direction,
          players.length,
        );
      }
      break;
    case "8": {
      const skipped = nextPlayerIndex(currentPlayer, direction, players.length);
      hasPlayed[skipped] = true;
      lastCardCalled[skipped] = false;
      message = `Player ${skipped + 1} is skipped`;
      currentPlayer = nextPlayerIndex(skipped, direction, players.length);
      break;
    }
    case "K":
      direction *= -1;
      message = "Order of play reversed";
      currentPlayer = nextPlayerIndex(currentPlayer, direction, players.length);
      break;
    case "A":
      message = `Suit changed to ${last.suit}`;
      currentPlayer = nextPlayerIndex(currentPlayer, direction, players.length);
      break;
    case "Q":
      if (cards.length > 1) {
        const drawResult = drawCards(deck, discardPile, 1);
        deck = drawResult.deck;
        discardPile = drawResult.discardPile;
        players[playerIndex] = [...players[playerIndex], ...drawResult.drawn];
        lastCardCalled[playerIndex] = false;
        message = `Player ${playerIndex + 1} draws ${drawResult.drawn.length} card${
          drawResult.drawn.length !== 1 ? "s" : ""
        } for not covering the Queen`;
        currentPlayer = nextPlayerIndex(playerIndex, direction, players.length);
      } else {
        const next = nextPlayerIndex(currentPlayer, direction, players.length);
        lastCardCalled[next] = false;
        message = "Next player must cover the Queen";
        currentPlayer = next;
      }
      break;
    default:
      currentPlayer = nextPlayerIndex(currentPlayer, direction, players.length);
      break;
  }

  // Penalize a player for failing to declare "last card(s)" by forcing them to draw
  // a card after finishing their turn, even if their hand is empty. When both the
  // deck and discard pile are empty, drawCards returns no card and the player's
  // hand remains empty, but the penalty still executes so the rule is consistently
  // enforced in edge cases.
  if (players[playerIndex].length === 0 && !state.lastCardCalled[playerIndex]) {
    const drawResult = drawCards(deck, discardPile, 1);
    deck = drawResult.deck;
    discardPile = drawResult.discardPile;
    players[playerIndex] = [...players[playerIndex], ...drawResult.drawn];
    lastCardCalled[playerIndex] = false;
    const penaltyMsg = `Player ${playerIndex + 1} draws ${drawResult.drawn.length} card${
      drawResult.drawn.length !== 1 ? "s" : ""
    } for not calling last card(s)`;
    message = message ? `${message} ${penaltyMsg}` : penaltyMsg;
  } else if (players[playerIndex].length > 0) {
    lastCardCalled[playerIndex] = false;
  }

  return {
    deck,
    discardPile,
    players,
    currentPlayer,
    direction,
    message,
    lastCardCalled,
    hasPlayed,
    drawPressure,
  };
}

export function applyPenalty(
  state: GameState,
  player: number,
  counts: { exposure?: number; misplay?: number } = {},
): GameState {
  const exposure = counts.exposure ?? 1;
  const misplay = counts.misplay ?? 2;
  let deck = [...state.deck];
  let discardPile = [...state.discardPile];
  const players = state.players.map((hand) => [...hand]);
  const total = exposure + misplay;
  const drawResult = drawCards(deck, discardPile, total);
  deck = drawResult.deck;
  discardPile = drawResult.discardPile;
  players[player] = [...players[player], ...drawResult.drawn];
  const lastCardCalled = [...state.lastCardCalled];
  lastCardCalled[player] = false;
  const hasPlayed = [...state.hasPlayed];
  hasPlayed[player] = true;
  const exposureDrawn = Math.min(exposure, drawResult.drawn.length);
  const misplayDrawn = drawResult.drawn.length - exposureDrawn;
  const message = `Incorrect move, pick up ${misplayDrawn} card${
    misplayDrawn !== 1 ? "s" : ""
  } for a mistake and ${exposureDrawn} card${
    exposureDrawn !== 1 ? "s" : ""
  } for exposure`;
  const currentPlayer = nextPlayerIndex(
    player,
    state.direction,
    players.length,
  );
  return {
    deck,
    discardPile,
    players,
    currentPlayer,
    direction: state.direction,
    message,
    lastCardCalled,
    hasPlayed,
    drawPressure: state.drawPressure,
  };
}

/**
 * Result of checking whether the game has concluded.
 *
 * @property {boolean} over - Indicates if any player has emptied their hand.
 * @property {number | null} winner - Index of the winning player, or `null` if the game continues.
 */
export interface GameOverResult {
  over: boolean;
  winner: number | null;
}

/**
 * Determine if the game is finished and which player, if any, has won.
 *
 * @param {GameState} state - Current snapshot of the game.
 * @returns {GameOverResult} Information about whether the game has ended and the winning player.
 */
export function isGameOver(state: GameState): GameOverResult {
  const winner = state.players.findIndex(
    (hand, idx) => hand.length === 0 && state.lastCardCalled[idx],
  );
  
  // Check for stalemate: player with 0 cards but no declaration
  // This can happen if they violated the declaration rule or the deck is fully exhausted
  const stalemate = state.players.some(
    (hand, idx) => hand.length === 0 && !state.lastCardCalled[idx]
  );
  
  if (stalemate && winner === -1) {
    // Game is over but no valid winner - stalemate condition
    return { over: true, winner: null };
  }
  
  return { over: winner !== -1, winner: winner !== -1 ? winner : null };
}

/**
 * Attempt to declare "last card(s)" for the specified player.
 *
 * A declaration is valid only if every player has already taken at least one
 * turn (`hasPlayed` is all `true`), it is not currently the declaring player's
 * turn, and the player can legally play all remaining cards in a single run.
 * Declarations may happen at any point outside of a player's turn, but a
 * player must re-declare after taking a turn in which they do not go out.
 */
export function declareLastCard(state: GameState, player: number): GameState {
  // Ignore invalid player indexes
  if (player < 0 || player >= state.players.length) return state;

  // Do not allow declarations once the game has ended
  if (isGameOver(state).over) return state;

  // Everyone needs to have taken a turn before declarations are allowed
  if (!state.hasPlayed.every(Boolean)) return state;

  // Declarations must occur before the player's turn
  if (state.currentPlayer === player) return state;

  const hand = state.players[player];
  if (hand.length === 0) return state;

  const topCard = state.discardPile[state.discardPile.length - 1];
  const valid = getValidMoves(hand, topCard, state.drawPressure);
  const canGoOut =
    hand.length === 1
      ? valid.singles.some((c) => c.id === hand[0].id)
      : valid.runs.some((run) => run.length === hand.length);
  if (!canGoOut) return state;

  const lastCardCalled = [...state.lastCardCalled];
  lastCardCalled[player] = true;
  const message = `Player ${player + 1} declares last card!`;
  return { ...state, lastCardCalled, message };
}

export default {
  getValidMoves,
  applyCardEffect,
  isGameOver,
  applyPenalty,
  declareLastCard,
};
