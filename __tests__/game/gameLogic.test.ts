import {
  generateDeck,
  shuffleDeck,
  dealCards,
  getValidMoves,
  applyCardEffect,
  drawCards,
  isGameOver,
  declareLastCard,
} from '../../game';
import type { Card, GameState } from '../../game/types';

describe('Game Logic', () => {
  describe('Deck Operations', () => {
    it('generateDeck creates 52 cards', () => {
      const deck = generateDeck();
      expect(deck).toHaveLength(52);
    });

    it('generateDeck has all suits', () => {
      const deck = generateDeck();
      const suits = new Set(deck.map((c) => c.suit));
      expect(suits.size).toBe(4);
      expect(suits.has('♠')).toBe(true);
      expect(suits.has('♥')).toBe(true);
      expect(suits.has('♦')).toBe(true);
      expect(suits.has('♣')).toBe(true);
    });

    it('generateDeck has all ranks', () => {
      const deck = generateDeck();
      const ranks = new Set(deck.map((c) => c.rank));
      expect(ranks.size).toBe(13);
    });

    it('shuffleDeck randomizes the deck', () => {
      const deck = generateDeck();
      const shuffled = shuffleDeck(deck);
      expect(shuffled).toHaveLength(52);
      // Very unlikely to be in same order after shuffle
      const sameOrder = deck.every((c, i) => c.id === shuffled[i].id);
      expect(sameOrder).toBe(false);
    });

    it('dealCards distributes cards correctly', () => {
      const deck = generateDeck();
      const { hands, remaining } = dealCards(deck, 2, 5);
      expect(hands).toHaveLength(2);
      expect(hands[0]).toHaveLength(5);
      expect(hands[1]).toHaveLength(5);
      expect(remaining).toHaveLength(42);
    });
  });

  describe('Valid Moves', () => {
    it('allows matching suit', () => {
      const hand: Card[] = [{ id: '5♥', rank: '5', suit: '♥' }];
      const topCard: Card = { id: '7♥', rank: '7', suit: '♥' };
      const { singles } = getValidMoves(hand, topCard);
      expect(singles).toHaveLength(1);
      expect(singles[0].id).toBe('5♥');
    });

    it('allows matching rank', () => {
      const hand: Card[] = [{ id: '7♣', rank: '7', suit: '♣' }];
      const topCard: Card = { id: '7♥', rank: '7', suit: '♥' };
      const { singles } = getValidMoves(hand, topCard);
      expect(singles).toHaveLength(1);
    });

    it('rejects non-matching cards', () => {
      const hand: Card[] = [{ id: '5♣', rank: '5', suit: '♣' }];
      const topCard: Card = { id: '7♥', rank: '7', suit: '♥' };
      const { singles, runs } = getValidMoves(hand, topCard);
      expect(singles).toHaveLength(0);
      expect(runs).toHaveLength(0);
    });

    it('allows any card after Queen', () => {
      const hand: Card[] = [{ id: '3♣', rank: '3', suit: '♣' }];
      const topCard: Card = { id: 'Q♥', rank: 'Q', suit: '♥' };
      const { singles } = getValidMoves(hand, topCard);
      expect(singles).toHaveLength(1);
    });
  });

  describe('Draw Pressure', () => {
    it('Two adds +2 draw pressure', () => {
      const initialState = createTestState();
      const playedCards: Card[] = [{ id: '2♥', rank: '2', suit: '♥' }];
      const newState = applyCardEffect(initialState, playedCards);
      expect(newState.drawPressure).toBe(2);
    });

    it('Black Jack adds +5 draw pressure', () => {
      const initialState = createTestState();
      const playedCards: Card[] = [{ id: 'J♠', rank: 'J', suit: '♠' }];
      const newState = applyCardEffect(initialState, playedCards);
      expect(newState.drawPressure).toBe(5);
    });

    it('Red Jack cancels draw pressure', () => {
      const initialState = createTestState();
      initialState.drawPressure = 5;
      const playedCards: Card[] = [{ id: 'J♥', rank: 'J', suit: '♥' }];
      const newState = applyCardEffect(initialState, playedCards);
      expect(newState.drawPressure).toBe(0);
    });
  });

  describe('Special Cards', () => {
    it('Eight skips next player', () => {
      const initialState = createTestState();
      const playedCards: Card[] = [{ id: '8♥', rank: '8', suit: '♥' }];
      const newState = applyCardEffect(initialState, playedCards);
      expect(newState.message).toContain('skipped');
    });

    it('King reverses direction', () => {
      const initialState = createTestState();
      expect(initialState.direction).toBe(1);
      const playedCards: Card[] = [{ id: 'K♥', rank: 'K', suit: '♥' }];
      const newState = applyCardEffect(initialState, playedCards);
      expect(newState.direction).toBe(-1);
    });

    it('Ace changes suit message', () => {
      const initialState = createTestState();
      const playedCards: Card[] = [{ id: 'A♦', rank: 'A', suit: '♦' }];
      const newState = applyCardEffect(initialState, playedCards);
      expect(newState.message).toContain('♦');
    });
  });

  describe('Game Over', () => {
    it('detects winner when hand is empty with declaration', () => {
      const state = createTestState();
      state.players[0] = [];
      state.lastCardCalled[0] = true;
      const result = isGameOver(state);
      expect(result.over).toBe(true);
      expect(result.winner).toBe(0);
    });

    it('does not declare winner without last card call', () => {
      const state = createTestState();
      state.players[0] = [];
      state.lastCardCalled[0] = false;
      const result = isGameOver(state);
      expect(result.over).toBe(true);
      expect(result.winner).toBe(null);
    });
  });

  describe('Draw Cards', () => {
    it('draws requested number of cards', () => {
      const deck: Card[] = [
        { id: '2♥', rank: '2', suit: '♥' },
        { id: '3♥', rank: '3', suit: '♥' },
        { id: '4♥', rank: '4', suit: '♥' },
      ];
      const result = drawCards(deck, [], 2);
      expect(result.drawn).toHaveLength(2);
      expect(result.deck).toHaveLength(1);
    });

    it('reshuffles discard pile when deck is empty', () => {
      const deck: Card[] = [];
      const discardPile: Card[] = [
        { id: '2♥', rank: '2', suit: '♥' },
        { id: '3♥', rank: '3', suit: '♥' },
        { id: '4♥', rank: '4', suit: '♥' },
      ];
      const result = drawCards(deck, discardPile, 1);
      expect(result.drawn).toHaveLength(1);
      expect(result.discardPile).toHaveLength(1); // Top card preserved
    });
  });

  describe('Declare Last Card', () => {
    it('allows declaration when valid', () => {
      const state = createTestState();
      state.hasPlayed = [true, true];
      state.currentPlayer = 1;
      state.players[0] = [{ id: '7♥', rank: '7', suit: '♥' }];
      state.discardPile = [{ id: '7♣', rank: '7', suit: '♣' }];
      
      const newState = declareLastCard(state, 0);
      expect(newState.lastCardCalled[0]).toBe(true);
    });

    it('rejects declaration on own turn', () => {
      const state = createTestState();
      state.hasPlayed = [true, true];
      state.currentPlayer = 0;
      state.players[0] = [{ id: '7♥', rank: '7', suit: '♥' }];
      
      const newState = declareLastCard(state, 0);
      expect(newState.lastCardCalled[0]).toBe(false);
    });
  });
});

function createTestState(): GameState {
  return {
    deck: generateDeck().slice(10),
    discardPile: [{ id: '7♥', rank: '7', suit: '♥' }],
    players: [
      [{ id: '5♥', rank: '5', suit: '♥' }],
      [{ id: '6♣', rank: '6', suit: '♣' }],
    ],
    currentPlayer: 0,
    direction: 1,
    message: '',
    lastCardCalled: [false, false],
    drawPressure: 0,
    hasPlayed: [false, false],
  };
}
