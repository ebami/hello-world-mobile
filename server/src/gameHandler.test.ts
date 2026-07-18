/**
 * @fileoverview Tests for GameHandler functions and game logic.
 */

import { roomManager } from './roomManager';
import { handleGameAction, startGame, forfeitAndComplete } from './gameHandler';
import { playCardsCommandSchema } from './validation/schemas';
import type { Card, GameState, TypedServer, TypedSocket } from './types';

// Helper to reset room manager state between tests
function resetRoomManager() {
  roomManager.resetForTests();
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

  // Seed a room where Alice (seat 0, opaque id 'h') holds `aliceHand`, it is her
  // turn, and the discard top is K♠. The mock socket authenticates as 'h' on the
  // same connection ('s1') recorded at room creation, so authorization passes.
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
      data: { playerId: 'h', playerName: 'Alice', roomId },
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

describe('GameHandler - command authorization (MFP-03)', () => {
  const TOP_KS: Card = { id: 'K♠', suit: '♠', rank: 'K' };
  const ALICE_HAND: Card[] = [{ id: 'K♥', suit: '♥', rank: 'K' }];
  const BOB_CARD: Card = { id: 'Q♦', suit: '♦', rank: 'Q' };

  const io = { to: () => ({ emit: () => undefined }) } as unknown as TypedServer;

  beforeEach(() => {
    resetRoomManager();
  });

  // A room with host Alice (id 'h', socket 's1') and Bob (id 'p2', socket 's2'),
  // a game in progress, and it is Alice's turn.
  function seedRoom() {
    const room = roomManager.createRoom('h', 'Alice', 's1');
    const roomId = room.roomId;
    roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');
    roomManager.setGameState(
      roomId,
      createMockGameState({
        players: [ALICE_HAND, [BOB_CARD]],
        discardPile: [TOP_KS],
        currentPlayer: 0,
      }),
    );
    return roomId;
  }

  function makeSocket(
    id: string,
    data: { playerId?: string; playerName?: string; roomId: string | null },
  ) {
    const emitted: Array<[string, ...unknown[]]> = [];
    const socket = {
      id,
      data,
      emit: (event: string, ...args: unknown[]) => emitted.push([event, ...args]),
    } as unknown as TypedSocket;
    return { socket, emitted };
  }

  const errors = (emitted: Array<[string, ...unknown[]]>) =>
    emitted.filter(([ev]) => ev === 'error').map(([, msg]) => msg);

  it('rejects a command from a socket with no authenticated session', () => {
    const roomId = seedRoom();
    const { socket, emitted } = makeSocket('s1', { roomId }); // no playerId
    handleGameAction(io, socket, roomId, 'draw_card');
    expect(errors(emitted)).toContain('No authenticated session');
  });

  it('rejects a command whose socket room state does not match the target room', () => {
    const roomId = seedRoom();
    const { socket, emitted } = makeSocket('s1', {
      playerId: 'h',
      playerName: 'Alice',
      roomId: 'OTHER1',
    });
    handleGameAction(io, socket, roomId, 'draw_card');
    expect(errors(emitted)).toContain('Not in this room');
  });

  it('rejects a command from a socket whose player is not a member', () => {
    const roomId = seedRoom();
    const { socket, emitted } = makeSocket('sX', {
      playerId: 'stranger',
      playerName: 'Mallory',
      roomId,
    });
    handleGameAction(io, socket, roomId, 'draw_card');
    expect(errors(emitted)).toContain('Not a member of this room');
  });

  it('rejects a stale socket after the player mapping has been replaced', () => {
    const roomId = seedRoom();
    // Alice reconnects on a new socket; 's1' is now stale.
    roomManager.setSocketId(roomId, 'h', 's-new');
    const { socket, emitted } = makeSocket('s1', {
      playerId: 'h',
      playerName: 'Alice',
      roomId,
    });
    handleGameAction(io, socket, roomId, 'draw_card');
    expect(errors(emitted)).toContain('Session no longer active on this connection');
  });

  it('authorizes the current socket for a valid member command', () => {
    const roomId = seedRoom();
    const { socket, emitted } = makeSocket('s1', {
      playerId: 'h',
      playerName: 'Alice',
      roomId,
    });
    handleGameAction(io, socket, roomId, 'draw_card');
    expect(errors(emitted)).toEqual([]);
  });

  describe('startGame host authorization', () => {
    it('allows the host (matched by opaque id) to start', () => {
      const room = roomManager.createRoom('h', 'Alice', 's1');
      const roomId = room.roomId;
      roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');

      const { socket, emitted } = makeSocket('s1', {
        playerId: 'h',
        playerName: 'Alice',
        roomId,
      });
      startGame(io, socket, roomId);

      expect(errors(emitted)).toEqual([]);
      expect(roomManager.getGameState(roomId)).not.toBeNull();
    });

    it('rejects a non-host member trying to start', () => {
      const room = roomManager.createRoom('h', 'Alice', 's1');
      const roomId = room.roomId;
      roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');

      const { socket, emitted } = makeSocket('s2', {
        playerId: 'p2',
        playerName: 'Bob',
        roomId,
      });
      startGame(io, socket, roomId);

      expect(errors(emitted)).toContain('Only host can start game');
      expect(roomManager.getGameState(roomId)).toBeNull();
    });

    it('cannot be fooled by a spoofed display name — identity decides host', () => {
      const room = roomManager.createRoom('h', 'Alice', 's1');
      const roomId = room.roomId;
      roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');

      // Bob's socket lies about its display name, claiming to be 'Alice', but its
      // opaque identity ('p2') is not the host, so the start is rejected.
      const { socket, emitted } = makeSocket('s2', {
        playerId: 'p2',
        playerName: 'Alice',
        roomId,
      });
      startGame(io, socket, roomId);

      expect(errors(emitted)).toContain('Only host can start game');
      expect(roomManager.getGameState(roomId)).toBeNull();
    });

    it('starts a 3-player room below its 4-player target (AE6)', () => {
      const room = roomManager.createRoom('h', 'Alice', 's1', 4);
      const roomId = room.roomId;
      roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');
      roomManager.joinRoom(roomId, 'p3', 'Carol', 's3');

      const { socket, emitted } = makeSocket('s1', {
        playerId: 'h',
        playerName: 'Alice',
        roomId,
      });
      startGame(io, socket, roomId);

      expect(errors(emitted)).toEqual([]);
      expect(roomManager.getGameState(roomId)).not.toBeNull();
      expect(roomManager.getSeatOrder(roomId)).toHaveLength(3);
    });

    it('rejects starting with fewer than two connected players', () => {
      const room = roomManager.createRoom('h', 'Alice', 's1', 4);
      const roomId = room.roomId;

      const { socket, emitted } = makeSocket('s1', {
        playerId: 'h',
        playerName: 'Alice',
        roomId,
      });
      startGame(io, socket, roomId);

      expect(errors(emitted)).toContain('Need at least 2 connected players to start');
      expect(roomManager.getGameState(roomId)).toBeNull();
    });
  });
});

describe('GameHandler - lifecycle, seat mapping, and forfeits (MFP-05)', () => {
  const KH: Card = { id: 'K♥', suit: '♥', rank: 'K' };
  const TWO_H: Card = { id: '2♥', suit: '♥', rank: '2' };
  const QD: Card = { id: 'Q♦', suit: '♦', rank: 'Q' };
  const TOP_KS: Card = { id: 'K♠', suit: '♠', rank: 'K' };

  beforeEach(() => {
    resetRoomManager();
  });

  // io mock that records every targeted emit ({ target, event, args }).
  function makeIo() {
    const emits: Array<{ target: string; event: string; args: unknown[] }> = [];
    const io = {
      to: (target: string) => ({
        emit: (event: string, ...args: unknown[]) => {
          emits.push({ target, event, args });
        },
      }),
    } as unknown as TypedServer;
    return { io, emits };
  }

  function makeSocket(
    id: string,
    data: { playerId?: string; playerName?: string; roomId: string | null },
  ) {
    const emitted: Array<[string, ...unknown[]]> = [];
    const socket = {
      id,
      data,
      emit: (event: string, ...args: unknown[]) => emitted.push([event, ...args]),
    } as unknown as TypedSocket;
    return { socket, emitted };
  }

  const errors = (emitted: Array<[string, ...unknown[]]>) =>
    emitted.filter(([ev]) => ev === 'error').map(([, msg]) => msg);

  // Active room: host Alice (id 'h', socket 's1'), Bob (id 'p2', socket 's2'),
  // Alice's turn, discard top K♠.
  function seedActive(aliceHand: Card[] = [KH, TWO_H], bobHand: Card[] = [QD]) {
    const room = roomManager.createRoom('h', 'Alice', 's1');
    const roomId = room.roomId;
    roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');
    roomManager.setGameState(
      roomId,
      createMockGameState({
        players: [aliceHand, bobHand],
        discardPile: [TOP_KS],
        currentPlayer: 0,
      }),
    );
    return roomId;
  }

  it('rejects gameplay commands after the game is completed', () => {
    const roomId = seedActive();
    roomManager.completeGame(roomId);
    const { io } = makeIo();
    const { socket, emitted } = makeSocket('s1', {
      playerId: 'h',
      playerName: 'Alice',
      roomId,
    });
    handleGameAction(io, socket, roomId, 'draw_card');
    expect(errors(emitted)).toContain('Game is not in progress');
  });

  it('rejects a second start_game without redealing', () => {
    const room = roomManager.createRoom('h', 'Alice', 's1');
    const roomId = room.roomId;
    roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');
    const { io } = makeIo();

    startGame(io, makeSocket('s1', { playerId: 'h', playerName: 'Alice', roomId }).socket, roomId);
    const firstState = roomManager.getGameState(roomId);
    expect(firstState).not.toBeNull();

    const second = makeSocket('s1', { playerId: 'h', playerName: 'Alice', roomId });
    startGame(io, second.socket, roomId);

    expect(errors(second.emitted)).toContain('Game already started');
    // Same state reference — no redeal.
    expect(roomManager.getGameState(roomId)).toBe(firstState);
  });

  it('emits a single game_over on a natural win, resolved via the seat map', () => {
    // Alice holds exactly K♥ (matches K♠ by rank) and has already declared last
    // card, so playing it out is a legitimate win (not a stalemate).
    const room = roomManager.createRoom('h', 'Alice', 's1');
    const roomId = room.roomId;
    roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');
    roomManager.setGameState(
      roomId,
      createMockGameState({
        players: [[KH], [QD]],
        discardPile: [TOP_KS],
        currentPlayer: 0,
        lastCardCalled: [true, false],
      }),
    );

    const { io, emits } = makeIo();
    const { socket, emitted } = makeSocket('s1', { playerId: 'h', playerName: 'Alice', roomId });

    handleGameAction(io, socket, roomId, 'play_cards', { cardIds: ['K♥'] });

    expect(errors(emitted)).toEqual([]);
    const overs = emits.filter((e) => e.event === 'game_over');
    expect(overs).toHaveLength(1);
    expect(overs[0].args[0]).toBe('h'); // opaque winner id from seat 0
    expect(overs[0].args[1]).toBe('Alice wins!');
    expect(overs[0].args[2]).toBe('win');
    expect(roomManager.getPhase(roomId)).toBe('COMPLETED');
  });

  it('delivers each seat its own hand even when the presentation array is reordered', () => {
    const roomId = seedActive([KH, TWO_H], [QD]);
    // Presentation change: reverse the player array (Bob now at index 0).
    roomManager.getRoom(roomId)!.players.reverse();

    const { io, emits } = makeIo();
    const { socket } = makeSocket('s1', { playerId: 'h', playerName: 'Alice', roomId });
    handleGameAction(io, socket, roomId, 'draw_card'); // Alice (seat 0) draws

    const hands = emits.filter((e) => e.event === 'hand_update');
    const toAlice = hands.find((e) => e.target === 's1');
    const toBob = hands.find((e) => e.target === 's2');
    expect((toAlice!.args[0] as { playerId: string }).playerId).toBe('h');
    expect((toBob!.args[0] as { playerId: string }).playerId).toBe('p2');
  });

  it('forfeits an active leave to the opponent and emits game_over once', () => {
    const roomId = seedActive();
    const { io, emits } = makeIo();

    forfeitAndComplete(io, roomId, 'p2'); // Bob leaves → Alice wins
    forfeitAndComplete(io, roomId, 'p2'); // already completed → no-op

    const overs = emits.filter((e) => e.event === 'game_over');
    expect(overs).toHaveLength(1);
    expect(overs[0].args[0]).toBe('h');
    expect(overs[0].args[1]).toBe('Alice wins by forfeit!');
    expect(overs[0].args[2]).toBe('forfeit');
  });

  it('forfeit awards the correct opponent regardless of who leaves', () => {
    const roomId = seedActive();
    const { io, emits } = makeIo();

    forfeitAndComplete(io, roomId, 'h'); // Alice leaves → Bob wins

    const overs = emits.filter((e) => e.event === 'game_over');
    expect(overs[0].args[0]).toBe('p2');
    expect(overs[0].args[1]).toBe('Bob wins by forfeit!');
    expect(overs[0].args[2]).toBe('forfeit');
  });
});

describe('GameHandler - command versioning and deduplication (MFP-04)', () => {
  const KH: Card = { id: 'K♥', suit: '♥', rank: 'K' };
  const TWO_H: Card = { id: '2♥', suit: '♥', rank: '2' };
  const QD: Card = { id: 'Q♦', suit: '♦', rank: 'Q' };
  const TOP_KS: Card = { id: 'K♠', suit: '♠', rank: 'K' };

  const io = { to: () => ({ emit: () => undefined }) } as unknown as TypedServer;

  beforeEach(() => {
    resetRoomManager();
  });

  function makeSocket(
    id: string,
    data: { playerId?: string; playerName?: string; roomId: string | null },
  ) {
    const emitted: Array<[string, ...unknown[]]> = [];
    const socket = {
      id,
      data,
      emit: (event: string, ...args: unknown[]) => emitted.push([event, ...args]),
    } as unknown as TypedSocket;
    return { socket, emitted };
  }

  const errors = (emitted: Array<[string, ...unknown[]]>) =>
    emitted.filter(([ev]) => ev === 'error').map(([, msg]) => msg);

  // Active room, Alice (id 'h', socket 's1', seat 0) to move; state version 1.
  function seedActive() {
    const room = roomManager.createRoom('h', 'Alice', 's1');
    const roomId = room.roomId;
    roomManager.joinRoom(roomId, 'p2', 'Bob', 's2');
    roomManager.setGameState(
      roomId,
      createMockGameState({
        players: [[KH, TWO_H], [QD]],
        discardPile: [TOP_KS],
        currentPlayer: 0,
      }),
    );
    return roomId;
  }

  it('increments the state version once per accepted command', () => {
    const roomId = seedActive();
    expect(roomManager.getStateVersion(roomId)).toBe(1);
    const { socket } = makeSocket('s1', { playerId: 'h', playerName: 'Alice', roomId });

    handleGameAction(io, socket, roomId, 'draw_card'); // no meta still bumps

    expect(roomManager.getStateVersion(roomId)).toBe(2);
  });

  it('applies a duplicate commandId at most once', () => {
    const roomId = seedActive();
    const { socket } = makeSocket('s1', { playerId: 'h', playerName: 'Alice', roomId });
    const meta = { commandId: 'cmd-1', expectedStateVersion: 1 };

    handleGameAction(io, socket, roomId, 'draw_card', undefined, meta);
    const versionAfterFirst = roomManager.getStateVersion(roomId); // 2
    const handAfterFirst = roomManager.getGameState(roomId)!.players[0].length;

    // Replay the identical command (as a retry would after reconnect).
    handleGameAction(io, socket, roomId, 'draw_card', undefined, {
      commandId: 'cmd-1',
      expectedStateVersion: 1,
    });

    expect(roomManager.getStateVersion(roomId)).toBe(versionAfterFirst); // no re-bump
    expect(roomManager.getGameState(roomId)!.players[0].length).toBe(handAfterFirst); // not drawn twice
  });

  it('rejects a stale expectedStateVersion without mutating state', () => {
    const roomId = seedActive();
    const { socket, emitted } = makeSocket('s1', { playerId: 'h', playerName: 'Alice', roomId });
    const before = roomManager.getGameState(roomId)!.players[0].length;

    // Current version is 1; a command claiming version 0 is stale.
    handleGameAction(io, socket, roomId, 'draw_card', undefined, {
      commandId: 'stale-1',
      expectedStateVersion: 0,
    });

    expect(errors(emitted)).toContain('State version mismatch');
    expect(roomManager.getStateVersion(roomId)).toBe(1); // unchanged
    expect(roomManager.getGameState(roomId)!.players[0].length).toBe(before); // no draw
    // A rejected command id is not recorded, so a corrected retry can proceed.
    expect(roomManager.hasSeenCommand(roomId, 'h', 'stale-1')).toBe(false);
  });
});
