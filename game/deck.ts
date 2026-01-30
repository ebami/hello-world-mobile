import type { Card, Rank, Suit } from "./types";

// generateDeck creates a standard 52-card deck with no Jokers
export function generateDeck(): Card[] {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  const ranks: Rank[] = [
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
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ id: `${rank}${suit}`, rank, suit });
    }
  }
  return deck;
}

// shuffleDeck randomizes the order of cards using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// dealCards distributes the specified number of cards to each player and returns the hands and remaining deck
export function dealCards(
  deck: Card[],
  players: number,
  handSize = 5,
): { hands: Card[][]; remaining: Card[] } {
  const deckCopy = [...deck];
  const hands: Card[][] = [];
  for (let i = 0; i < players; i++) {
    const hand = deckCopy.splice(0, handSize);
    hands.push(hand);
  }
  return { hands, remaining: deckCopy };
}

export default { generateDeck, shuffleDeck, dealCards };
