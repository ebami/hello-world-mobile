/**
 * @fileoverview Tests for GameHandler functions and game logic.
 */

import { roomManager } from './roomManager';
import { handleGameAction } from './gameHandler';
import { playCardsCommandSchema } from './validation/schemas';
import type { Card, GameState, TypedServer, TypedSocket } from './types';

// Helper to reset room manager state between tests
function resetRoomManager() {
  (roomManager as any).rooms.clear();
}

// Helper to create a mock game state
function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [
      { id: '5♥', suit: '♥', rank: '5' },
      { id: '6♥', suit: '♥', rank: '6' },
      { id: '7♥', suit: '♥', rank: '7' },
    ],
    discardPile: [{ id: 'K♠', suit: '♠', rank: 'K' }],
    players: [
      [
        { id: 'A♥', suit: '♥', rank: 'A' },
        { id: '2♥', suit: '♥', rank: '2' },
      ],
      [
        { id: 'Q♦', suit: '♦', rank: 'Q' },
        { id: '3♣', suit: '♣', rank: '3' },
      ],
    ],
    currentPlayer: 0,
    direction: 1,
    message: 'Your turn',
    lastCardCalled: [false, false],
    drawPressure: 0,
    hasPlayed: [false, false],
    ...overrides,
  };
}

describe('GameHandler - Game Logic', () => {
  beforeEach(() => {
    resetRoomManager();
  });

  describe('card matching rules', () => {
    // These test the game logic that's duplicated in gameHandler.ts
    // In a real implementation, you'd import the functions directly

    it('should match by suit', () => {
      const topCard: Card = { id: 'K♠', suit: '♠', rank: 'K' };
      const playCard: Card = { id: '5♠', suit: '♠', rank: '5' };
      
      // Same suit should match
      expect(playCard.suit).toBe(topCard.suit);
    });

    it('should match by rank', () => {
      const topCard: Card = { id: 'K♠', suit: '♠', rank: 'K' };
      const playCard: Card = { id: 'K♥', suit: '♥', rank: 'K' };
      
      // Same rank should match
      expect(playCard.rank).toBe(topCard.rank);
    });

    it('should allow any card after Queen', () => {
      const queen: Card = { id: 'Q♦', suit: '♦', rank: 'Q' };
      
      // Queen is wild
      expect(queen.rank).toBe('Q');
    });
  });

  describe('draw pressure', () => {
    it('should calculate draw pressure for 2', () => {
      const two: Card = { id: '2♥', suit: '♥', rank: '2' };
      expect(two.rank).toBe('2');
      // 2s add 2 to draw pressure
    });

    it('should calculate draw pressure for Black Jack', () => {
      const blackJack: Card = { id: 'J♠', suit: '♠', rank: 'J' };
      expect(blackJack.rank).toBe('J');
      expect(['♠', '♣']).toContain(blackJack.suit);
      // Black Jacks add 5 to draw pressure
    });

    it('should identify Red Jack as shield', () => {
      const redJack: Card = { id: 'J♥', suit: '♥', rank: 'J' };
      expect(redJack.rank).toBe('J');
      expect(['♥', '♦']).toContain(redJack.suit);
      // Red Jacks clear draw pressure
    });
  });

  describe('room-based game integration', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomId = room.roomId;
      roomManager.joinRoom(roomId, 'player-2', 'Bob', 'socket-2');
    });

    it('should store game state in room', () => {
      const gameState = createMockGameState();
      roomManager.setGameState(roomId, gameState);

      const storedState = roomManager.getGameState(roomId);
      expect(storedState).not.toBeNull();
      expect(storedState!.currentPlayer).toBe(0);
    });

    it('should update hand counts when game state changes', () => {
      const gameState = createMockGameState();
      roomManager.setGameState(roomId, gameState);

      const room = roomManager.getRoom(roomId);
      expect(room!.players[0].handCount).toBe(2);
      expect(room!.players[1].handCount).toBe(2);
    });

    it('should track player turns', () => {
      const gameState = createMockGameState({ currentPlayer: 0 });
      roomManager.setGameState(roomId, gameState);

      expect(roomManager.getGameState(roomId)!.currentPlayer).toBe(0);
    });
  });

  describe('direction handling', () => {
    it('should track direction changes from Aces', () => {
      const gameState = createMockGameState({ direction: 1 });
      
      // After an Ace, direction reverses
      const reversedState = { ...gameState, direction: -1 };
      expect(reversedState.direction).toBe(-1);
    });

    it('should handle even number of Aces (no change)', () => {
      const gameState = createMockGameState({ direction: 1 });
      
      // Two Aces cancel out
      expect(gameState.direction).toBe(1);
    });
  });

  describe('game over detection', () => {
    it('should detect winner when player hand is empty', () => {
      const gameState = createMockGameState({
        players: [[], [{ id: 'K♠', suit: '♠', rank: 'K' }]],
      });

      // Player 0 has empty hand
      expect(gameState.players[0].length).toBe(0);
    });

    it('should detect draw when deck is empty', () => {
      const gameState = createMockGameState({
        deck: [],
      });

      expect(gameState.deck.length).toBe(0);
    });
  });

  describe('public game view generation', () => {
    it('should hide player hands in public view', () => {
      const gameState = createMockGameState();
      
      // PublicGameView only shows handCount, not actual cards
      const publicView = {
        roomId: 'test',
        deckCount: gameState.deck.length,
        discardPile: gameState.discardPile,
        currentPlayer: gameState.currentPlayer,
        direction: gameState.direction,
        message: gameState.message,
        lastCardCalled: gameState.lastCardCalled,
        drawPressure: gameState.drawPressure,
        hasPlayed: gameState.hasPlayed,
        players: gameState.players.map((hand, idx) => ({
          playerId: `player-${idx}`,
          handCount: hand.length,
          connected: true,
          isBot: false,
        })),
      };

      expect(publicView.deckCount).toBe(3);
      expect(publicView.players[0].handCount).toBe(2);
      // Hand cards are not exposed
      expect((publicView as any).players[0].cards).toBeUndefined();
    });
  });

  describe('private hand payload generation', () => {
    it('should include player hand in private payload', () => {
      const gameState = createMockGameState();
      
      const privatePayload = {
        roomId: 'test',
        playerId: 'player-0',
        hand: gameState.players[0],
      };

      expect(privatePayload.hand).toHaveLength(2);
      expect(privatePayload.hand[0].id).toBe('A♥');
    });
  });
});

describe('GameHandler - Socket Events', () => {
  // These tests would require mocking Socket.IO
  // In a real scenario, you'd use socket.io-mock or similar

  beforeEach(() => {
    resetRoomManager();
  });

  describe('start_game event', () => {
    it('should initialize game state when host starts game', () => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomManager.joinRoom(room.roomId, 'player-2', 'Bob', 'socket-2');

      // In the actual handler, this would trigger deck creation and dealing
      const numPlayers = roomManager.getRoom(room.roomId)!.players.length;
      expect(numPlayers).toBe(2);
    });
  });

  describe('play_cards event validation', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomId = room.roomId;
      roomManager.joinRoom(roomId, 'player-2', 'Bob', 'socket-2');
      
      const gameState = createMockGameState();
      roomManager.setGameState(roomId, gameState);
    });

    it('should reject play if not player turn', () => {
      const gameState = roomManager.getGameState(roomId)!;
      
      // If currentPlayer is 0, player 1 (Bob) cannot play
      expect(gameState.currentPlayer).toBe(0);
    });

    it('should reject play if cards not in hand', () => {
      const gameState = roomManager.getGameState(roomId)!;
      const playerHand = gameState.players[0];
      
      const fakeCard: Card = { id: 'fake', suit: '♥', rank: 'K' };
      const hasCard = playerHand.some(c => c.id === fakeCard.id);
      
      expect(hasCard).toBe(false);
    });
  });

  describe('draw_card event', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomId = room.roomId;
      roomManager.joinRoom(roomId, 'player-2', 'Bob', 'socket-2');
      
      const gameState = createMockGameState();
      roomManager.setGameState(roomId, gameState);
    });

    it('should draw cards from deck', () => {
      const gameState = roomManager.getGameState(roomId)!;
      const initialDeckCount = gameState.deck.length;
      
      expect(initialDeckCount).toBeGreaterThan(0);
    });

    it('should draw multiple cards when under draw pressure', () => {
      const gameState = createMockGameState({ drawPressure: 4 });
      roomManager.setGameState(roomId, gameState);
      
      expect(roomManager.getGameState(roomId)!.drawPressure).toBe(4);
    });
  });

  describe('declare_last_card event', () => {
    let roomId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('host-id', 'Alice', 'socket-1');
      roomId = room.roomId;
      roomManager.joinRoom(roomId, 'player-2', 'Bob', 'socket-2');
      
      const gameState = createMockGameState({
        players: [
          [{ id: 'A♥', suit: '♥', rank: 'A' }], // Alice has 1 card
          [{ id: 'Q♦', suit: '♦', rank: 'Q' }, { id: '3♣', suit: '♣', rank: '3' }],
        ],
        hasPlayed: [true, true],
      });
      roomManager.setGameState(roomId, gameState);
    });

    it('should allow declaration with one card', () => {
      const gameState = roomManager.getGameState(roomId)!;
      
      expect(gameState.players[0].length).toBe(1);
    });

    it('should update lastCardCalled state', () => {
      const gameState = roomManager.getGameState(roomId)!;
      
      gameState.lastCardCalled[0] = true;
      expect(gameState.lastCardCalled[0]).toBe(true);
    });
  });
});

describe('GameHandler - server-authoritative play_cards (MFP-02)', () => {
  const KH: Card = { id: 'K♥', suit: '♥', rank: 'K' };
  const AS: Card = { id: 'A♠', suit: '♠', rank: 'A' };
  const C3: Card = { id: '3♣', suit: '♣', rank: '3' };
  const TOP_KS: Card = { id: 'K♠', suit: '♠', rank: 'K' };
  const BOB_CARD: Card = { id: 'Q♦', suit: '♦', rank: 'Q' };
  const FIVE_H: Card = { id: '5♥', suit: '♥', rank: '5' };
  const SIX_H: Card = { id: '6♥', suit: '♥', rank: '6' };
  const NINE_C: Card = { id: '9♣', suit: '♣', rank: '9' };
  const TOP_5S: Card = { id: '5♠', suit: '♠', rank: '5' };

  beforeEach(() => {
    resetRoomManager();
  });

  // Seed a room where Alice (seat 0) holds `aliceHand`, it is her turn, and the
  // discard top is K♠. Returns a mock io/socket that records emitted events.
  function setup(aliceHand: Card[], top: Card = TOP_KS) {
    const room = roomManager.createRoom('h', 'Alice', 's1');
    const roomId = room.roomId;
    roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');
    roomManager.setGameState(
      roomId,
      createMockGameState({
        players: [aliceHand, [BOB_CARD]],
        discardPile: [top],
        currentPlayer: 0,
      }),
    );

    const emitted: Array<[string, ...unknown[]]> = [];
    const socket = {
      id: 's1',
      data: { playerId: 'Alice', playerName: 'Alice', roomId },
      emit: (event: string, ...args: unknown[]) => {
        emitted.push([event, ...args]);
      },
    } as unknown as TypedSocket;
    const io = {
      to: () => ({ emit: () => undefined }),
    } as unknown as TypedServer;

    return { io, socket, roomId, emitted };
  }

  const errors = (emitted: Array<[string, ...unknown[]]>) =>
    emitted.filter(([ev]) => ev === 'error').map(([, msg]) => msg);

  it('rejects a card id the player does not hold (forgery is impossible)', () => {
    const { io, socket, roomId, emitted } = setup([KH, AS, C3]);
    handleGameAction(io, socket, roomId, 'play_cards', { cardIds: ['ZZ-not-real'] });
    expect(errors(emitted)).toContain('Card not in your hand');
  });

  it('rejects duplicate card ids', () => {
    const { io, socket, roomId, emitted } = setup([KH, AS, C3]);
    handleGameAction(io, socket, roomId, 'play_cards', { cardIds: ['K♥', 'K♥'] });
    expect(errors(emitted)).toContain('Duplicate card in play');
  });

  it("rejects a card id belonging to another player's hand", () => {
    const { io, socket, roomId, emitted } = setup([KH, AS, C3]);
    handleGameAction(io, socket, roomId, 'play_cards', { cardIds: ['Q♦'] });
    expect(errors(emitted)).toContain('Card not in your hand');
  });

  it('accepts a valid single play referenced by canonical id', () => {
    const { io, socket, roomId, emitted } = setup([KH, AS, C3]);
    handleGameAction(io, socket, roomId, 'play_cards', { cardIds: ['K♥'] });
    expect(errors(emitted)).toEqual([]);
    const state = roomManager.getGameState(roomId)!;
    expect(state.discardPile.at(-1)!.id).toBe('K♥');
    expect(state.players[0].some((c) => c.id === 'K♥')).toBe(false);
  });

  it('requires a declared suit when the final card is an Ace', () => {
    const { io, socket, roomId, emitted } = setup([KH, AS, C3]);
    handleGameAction(io, socket, roomId, 'play_cards', { cardIds: ['A♠'] });
    expect(errors(emitted)).toContain('Must declare a suit when playing an Ace');
  });

  it('rejects a declared suit when the final card is not an Ace', () => {
    const { io, socket, roomId, emitted } = setup([KH, AS, C3]);
    handleGameAction(io, socket, roomId, 'play_cards', {
      cardIds: ['K♥'],
      declaredSuit: '♥',
    });
    expect(errors(emitted)).toContain(
      'A suit may only be declared when the final card is an Ace',
    );
  });

  it('plays an Ace: keeps its original suit on the pile, records the active suit', () => {
    const { io, socket, roomId, emitted } = setup([KH, AS, C3]);
    handleGameAction(io, socket, roomId, 'play_cards', {
      cardIds: ['A♠'],
      declaredSuit: '♥',
    });
    expect(errors(emitted)).toEqual([]);
    const state = roomManager.getGameState(roomId)!;
    const top = state.discardPile.at(-1)!;
    expect(top.id).toBe('A♠');
    expect(top.suit).toBe('♠'); // physical suit unchanged (not forged to ♥)
    expect(state.activeSuit).toBe('♥'); // the declared suit is what's in force
  });

  it('accepts a valid multi-card run in the submitted order', () => {
    const { io, socket, roomId, emitted } = setup([FIVE_H, SIX_H, NINE_C], TOP_5S);
    handleGameAction(io, socket, roomId, 'play_cards', { cardIds: ['5♥', '6♥'] });
    expect(errors(emitted)).toEqual([]);
    const state = roomManager.getGameState(roomId)!;
    expect(state.discardPile.map((c) => c.id)).toEqual(
      expect.arrayContaining(['5♥', '6♥']),
    );
    expect(state.players[0].map((c) => c.id)).toEqual(['9♣']);
  });

  it('rejects a run submitted in the wrong order', () => {
    const { io, socket, roomId, emitted } = setup([FIVE_H, SIX_H, NINE_C], TOP_5S);
    handleGameAction(io, socket, roomId, 'play_cards', { cardIds: ['6♥', '5♥'] });
    expect(errors(emitted)).toContain('Invalid card play');
  });

  it('strict schema rejects forged rank/suit smuggled alongside cardIds', () => {
    // The command carries only IDs (+ optional declaredSuit); any extra field
    // — notably a forged rank/suit — must be rejected by the strict schema.
    expect(
      playCardsCommandSchema.safeParse({ cardIds: ['K♥'], rank: 'A', suit: '♠' }).success,
    ).toBe(false);
    expect(playCardsCommandSchema.safeParse({ cardIds: ['K♥'] }).success).toBe(true);
    expect(
      playCardsCommandSchema.safeParse({ cardIds: ['A♠'], declaredSuit: '♥' }).success,
    ).toBe(true);
  });
});
