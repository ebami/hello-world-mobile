import { getComputerMove, getBotTurnDelay } from '../../game/ai';
import { generateDeck } from '../../game/deck';
import type { GameState } from '../../game/types';

describe('Bot declared suit for Aces (MFP-02)', () => {
  it('returns a deterministic declaredSuit when the play ends on an Ace', () => {
    const state = createTestState();
    state.currentPlayer = 1;
    state.discardPile = [{ id: 'A♦', rank: 'A', suit: '♦' }];
    // A♣ is playable (rank matches the Ace on top); remaining cards are mostly ♥.
    state.players[1] = [
      { id: 'A♣', rank: 'A', suit: '♣' },
      { id: '5♥', rank: '5', suit: '♥' },
      { id: '9♥', rank: '9', suit: '♥' },
    ];

    const move = getComputerMove(state, 'medium');
    expect(move.cards?.some((c) => c.rank === 'A')).toBe(true);
    expect(move.declaredSuit).toBe('♥'); // most common remaining suit
  });

  it('omits declaredSuit for a non-Ace play', () => {
    const state = createTestState();
    state.currentPlayer = 1;
    state.discardPile = [{ id: '7♥', rank: '7', suit: '♥' }];
    state.players[1] = [{ id: '7♣', rank: '7', suit: '♣' }];

    const move = getComputerMove(state, 'medium');
    expect(move.cards).toBeDefined();
    expect(move.declaredSuit).toBeUndefined();
  });
});

describe('AI', () => {
  describe('getComputerMove', () => {
    it('draws when no valid moves', () => {
      const state = createTestState();
      state.players[1] = [{ id: '5♣', rank: '5', suit: '♣' }];
      state.discardPile = [{ id: '7♥', rank: '7', suit: '♥' }];
      state.currentPlayer = 1;
      
      const move = getComputerMove(state, 'medium');
      expect(move.draw).toBe(true);
    });

    it('plays valid card when available', () => {
      const state = createTestState();
      state.players[1] = [{ id: '7♣', rank: '7', suit: '♣' }];
      state.discardPile = [{ id: '7♥', rank: '7', suit: '♥' }];
      state.currentPlayer = 1;
      
      const move = getComputerMove(state, 'medium');
      expect(move.cards).toBeDefined();
      expect(move.cards).toHaveLength(1);
    });

    it('prefers action cards in medium mode', () => {
      const state = createTestState();
      state.players[1] = [
        { id: '7♥', rank: '7', suit: '♥' },
        { id: '2♥', rank: '2', suit: '♥' },
      ];
      state.discardPile = [{ id: '3♥', rank: '3', suit: '♥' }];
      state.currentPlayer = 1;
      
      const move = getComputerMove(state, 'medium');
      expect(move.cards).toBeDefined();
      expect(move.cards![0].rank).toBe('2');
    });

    it('easy mode can play any valid card', () => {
      const state = createTestState();
      state.players[1] = [{ id: '7♥', rank: '7', suit: '♥' }];
      state.discardPile = [{ id: '3♥', rank: '3', suit: '♥' }];
      state.currentPlayer = 1;
      
      const move = getComputerMove(state, 'easy');
      expect(move.cards || move.draw).toBeTruthy();
    });

    it('hard mode prioritizes draw pressure when valid', () => {
      const state = createTestState();
      state.players[1] = [
        { id: '7♠', rank: '7', suit: '♠' },
        { id: 'J♠', rank: 'J', suit: '♠' }, // Black Jack matches suit
      ];
      state.discardPile = [{ id: '3♠', rank: '3', suit: '♠' }]; // Same suit
      state.currentPlayer = 1;
      
      const move = getComputerMove(state, 'hard');
      expect(move.cards).toBeDefined();
      // Hard mode should prioritize the black Jack for draw pressure when it's valid
      expect(move.cards![0].rank).toBe('J');
    });
  });

  describe('getBotTurnDelay', () => {
    it('returns correct delay for easy mode', () => {
      expect(getBotTurnDelay('easy')).toBe(2000);
    });

    it('returns correct delay for medium mode', () => {
      expect(getBotTurnDelay('medium')).toBe(1500);
    });

    it('returns correct delay for hard mode', () => {
      expect(getBotTurnDelay('hard')).toBe(1000);
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
