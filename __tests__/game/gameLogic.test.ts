import {
  generateDeck,
  shuffleDeck,
  dealCards,
  getValidMoves,
  applyCardEffect,
  drawCards,
  isGameOver,
  resolveEndgame,
  nextActiveIndex,
  declareLastCard,
} from '../../game';
import type { Card, GameState, SeatStatus } from '../../game/types';

describe('Active suit after an Ace (MFP-02)', () => {
  const base: Omit<GameState, 'players' | 'discardPile'> = {
    deck: [],
    currentPlayer: 0,
    direction: 1,
    message: '',
    lastCardCalled: [false, false],
    drawPressure: 0,
    hasPlayed: [false, false],
  };

  it('getValidMoves matches the active suit, not the Ace\'s physical suit', () => {
    const top: Card = { id: 'A♠', rank: 'A', suit: '♠' }; // physical suit ♠
    const hand: Card[] = [
      { id: '5♥', rank: '5', suit: '♥' }, // matches the ACTIVE suit ♥
      { id: '6♠', rank: '6', suit: '♠' }, // matches only the physical ♠
    ];
    const moves = getValidMoves(hand, top, 0, '♥');
    const singleIds = moves.singles.map((c) => c.id);
    expect(singleIds).toContain('5♥');
    expect(singleIds).not.toContain('6♠');
  });

  it('applyCardEffect records the declared suit and keeps the Ace\'s own suit', () => {
    const state: GameState = {
      ...base,
      players: [
        [{ id: 'A♠', rank: 'A', suit: '♠' }, { id: '7♣', rank: '7', suit: '♣' }],
        [{ id: '9♦', rank: '9', suit: '♦' }],
      ],
      discardPile: [{ id: 'K♠', rank: 'K', suit: '♠' }],
    };
    const next = applyCardEffect(state, [{ id: 'A♠', rank: 'A', suit: '♠' }], '♥');
    expect(next.activeSuit).toBe('♥');
    expect(next.discardPile.at(-1)).toMatchObject({ id: 'A♠', suit: '♠' });
  });

  it('applyCardEffect clears the active suit on a non-Ace play', () => {
    const state: GameState = {
      ...base,
      activeSuit: '♥',
      players: [
        [{ id: '5♥', rank: '5', suit: '♥' }, { id: '7♣', rank: '7', suit: '♣' }],
        [{ id: '9♦', rank: '9', suit: '♦' }],
      ],
      discardPile: [{ id: 'A♦', rank: 'A', suit: '♦' }],
    };
    const next = applyCardEffect(state, [{ id: '5♥', rank: '5', suit: '♥' }]);
    expect(next.activeSuit).toBeNull();
  });
});

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

describe('nextActiveIndex — status-aware turn advancement (3-4p)', () => {
  it('skips a finished/eliminated seat when advancing forward', () => {
    const status: SeatStatus[] = ['active', 'finished', 'active', 'active'];
    expect(nextActiveIndex(0, 1, 4, status)).toBe(2); // 0 -> skip 1 -> 2
    expect(nextActiveIndex(2, 1, 4, status)).toBe(3);
    expect(nextActiveIndex(3, 1, 4, status)).toBe(0); // wraps
  });

  it('skips inactive seats when direction is reversed', () => {
    const status: SeatStatus[] = ['active', 'finished', 'active', 'active'];
    expect(nextActiveIndex(2, -1, 4, status)).toBe(0); // 2 -> skip 1 -> 0
  });

  it('is a plain rotation when no seat status is given', () => {
    expect(nextActiveIndex(0, 1, 4, undefined)).toBe(1);
    expect(nextActiveIndex(3, 1, 4)).toBe(0);
  });

  it('returns the sole active seat (itself) when no other seat is active', () => {
    const status: SeatStatus[] = ['eliminated', 'active', 'eliminated'];
    expect(nextActiveIndex(1, 1, 3, status)).toBe(1);
  });
});

describe('resolveEndgame — mode-aware endgame (3-4p)', () => {
  const baseFour = (): GameState => ({
    deck: generateDeck().slice(20),
    discardPile: [{ id: '7♥', rank: '7', suit: '♥' }],
    players: [
      [{ id: '5♥', rank: '5', suit: '♥' }],
      [{ id: '6♣', rank: '6', suit: '♣' }],
      [{ id: '9♦', rank: '9', suit: '♦' }],
      [{ id: 'K♠', rank: 'K', suit: '♠' }],
    ],
    currentPlayer: 0,
    direction: 1,
    message: '',
    lastCardCalled: [false, false, false, false],
    drawPressure: 0,
    hasPlayed: [true, true, true, true],
  });

  it('First-out: the first player to empty their hand wins immediately (AE1)', () => {
    const s = baseFour();
    s.players[2] = [];
    s.lastCardCalled[2] = true;
    const r = resolveEndgame(s, 'first_out');
    expect(r.over).toBe(true);
    expect(r.winnerSeat).toBe(2);
    expect(r.standings).toEqual([2]);
  });

  it('Ranking: play continues after a finish, ending with the full order (AE2, AE3)', () => {
    let s = baseFour();

    // Seat 2 goes out first.
    s.players[2] = [];
    s.lastCardCalled[2] = true;
    let r = resolveEndgame(s, 'ranking');
    expect(r.over).toBe(false);
    expect(r.state.finishedOrder).toEqual([2]);
    s = r.state;

    // Seat 0 goes out second.
    s.players[0] = [];
    s.lastCardCalled[0] = true;
    r = resolveEndgame(s, 'ranking');
    expect(r.over).toBe(false);
    expect(r.state.finishedOrder).toEqual([2, 0]);
    s = r.state;

    // Seat 1 goes out third — only seat 3 remains active, so the game ends.
    s.players[1] = [];
    s.lastCardCalled[1] = true;
    r = resolveEndgame(s, 'ranking');
    expect(r.over).toBe(true);
    expect(r.winnerSeat).toBe(2); // first finisher wins
    expect(r.standings).toEqual([2, 0, 1, 3]); // finishers, then the last holder
  });

  it('Ranking: not over while two or more seats remain active', () => {
    const s = baseFour();
    s.players[0] = [];
    s.lastCardCalled[0] = true;
    const r = resolveEndgame(s, 'ranking');
    expect(r.over).toBe(false);
    expect(r.state.seatStatus).toEqual(['finished', 'active', 'active', 'active']);
  });

  it('Ranking degenerate: a lone survivor wins when everyone else was eliminated', () => {
    const s = baseFour();
    s.seatStatus = ['eliminated', 'eliminated', 'eliminated', 'active'];
    s.eliminatedOrder = [0, 1, 2];
    const r = resolveEndgame(s, 'ranking');
    expect(r.over).toBe(true);
    expect(r.winnerSeat).toBe(3);
    expect(r.standings).toEqual([3, 0, 1, 2]); // survivor, then drops in drop order
  });
});

describe('applyCardEffect — skips non-active seats when advancing', () => {
  it('advances past a finished seat on a plain play (3p)', () => {
    const state: GameState = {
      deck: generateDeck().slice(10),
      discardPile: [{ id: '7♥', rank: '7', suit: '♥' }],
      players: [
        [{ id: '7♠', rank: '7', suit: '♠' }, { id: '2♣', rank: '2', suit: '♣' }],
        [],
        [{ id: '9♦', rank: '9', suit: '♦' }],
      ],
      currentPlayer: 0,
      direction: 1,
      message: '',
      lastCardCalled: [false, true, false],
      drawPressure: 0,
      hasPlayed: [true, true, true],
      seatStatus: ['active', 'finished', 'active'],
      finishedOrder: [1],
      eliminatedOrder: [],
    };
    // Seat 0 plays a plain 7♠; the turn skips finished seat 1 and lands on seat 2.
    const next = applyCardEffect(state, [{ id: '7♠', rank: '7', suit: '♠' }]);
    expect(next.currentPlayer).toBe(2);
    expect(next.seatStatus).toEqual(['active', 'finished', 'active']);
  });
});
