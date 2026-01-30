// Card and game state types for a standard 52-card deck with no Jokers
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
  /**
   * Number of cards the next player must draw unless they stack or shield.
   * A value of `0` means no draw pressure is currently in effect.
   */
  drawPressure: number;
  /**
   * Flags indicating whether each player has taken at least one turn in the
   * current hand. `declareLastCard` only succeeds when every entry is `true`
   * and the declaration happens before the caller's turn. Once a player has
   * acted, their value remains `true` for the rest of the hand.
   */
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
