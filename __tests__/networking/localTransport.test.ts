/**
 * @fileoverview Tests for LocalTransport single-player adapter.
 */

import { LocalTransport } from '../../networking/localTransport';
import type { TransportCallbacks, GameAction } from '../../networking/types';
import type { Card } from '../../game/types';

// Mock the game module
jest.mock('../../game', () => ({
  generateDeck: jest.fn(() => mockDeck()),
  shuffleDeck: jest.fn((deck: Card[]) => deck),
  dealCards: jest.fn(() => ({
    hands: [mockHand(), mockHand()],
    remaining: mockDeck().slice(10),
  })),
  applyCardEffect: jest.fn((state) => ({
    ...state,
    currentPlayer: 1,
    message: 'Card played',
  })),
  drawCards: jest.fn(() => ({
    deck: mockDeck().slice(1),
    discardPile: [mockCard()],
    drawn: [mockCard()],
  })),
  declareLastCard: jest.fn((state, player) => ({
    ...state,
    lastCardCalled: state.lastCardCalled.map((v: boolean, i: number) => i === player ? true : v),
  })),
  isGameOver: jest.fn(() => ({ over: false, winner: null })),
}));

jest.mock('../../game/ai', () => ({
  getComputerMove: jest.fn(() => ({ draw: true })),
  getBotTurnDelay: jest.fn(() => 100),
}));

function mockCard(): Card {
  return { suit: 'hearts', rank: '5' };
}

function mockHand(): Card[] {
  return [mockCard(), mockCard(), mockCard(), mockCard(), mockCard()];
}

function mockDeck(): Card[] {
  return Array(52).fill(null).map(() => mockCard());
}

describe('LocalTransport', () => {
  let transport: LocalTransport;
  let callbacks: Partial<TransportCallbacks>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    transport = new LocalTransport('medium');
    callbacks = {
      onConnectionChange: jest.fn(),
      onStateUpdate: jest.fn(),
      onHandUpdate: jest.fn(),
      onGameStart: jest.fn(),
      onGameOver: jest.fn(),
      onPlayerAction: jest.fn(),
      onError: jest.fn(),
    };
    transport.setCallbacks(callbacks);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create with default difficulty', () => {
      const defaultTransport = new LocalTransport();
      expect(defaultTransport.getConnectionStatus()).toBe('disconnected');
    });

    it('should create with specified difficulty', () => {
      const hardTransport = new LocalTransport('hard');
      expect(hardTransport.getConnectionStatus()).toBe('disconnected');
    });
  });

  describe('connect', () => {
    it('should immediately set status to connected', async () => {
      await transport.connect();

      expect(callbacks.onConnectionChange).toHaveBeenCalledWith('connected');
      expect(transport.getConnectionStatus()).toBe('connected');
    });

    it('should emit game start after connection', async () => {
      await transport.connect();

      // Fast-forward timers to trigger setTimeout callback
      jest.runAllTimers();

      expect(callbacks.onGameStart).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'local-game',
          currentPlayer: 0,
        }),
        expect.objectContaining({
          roomId: 'local-game',
          playerId: 'player',
        })
      );
    });

    it('should create initial game state', async () => {
      await transport.connect();
      jest.runAllTimers();

      const [publicView] = (callbacks.onGameStart as jest.Mock).mock.calls[0];
      expect(publicView.players).toHaveLength(2);
      expect(publicView.deckCount).toBeGreaterThan(0);
    });
  });

  describe('disconnect', () => {
    it('should set status to disconnected', async () => {
      await transport.connect();
      transport.disconnect();

      expect(callbacks.onConnectionChange).toHaveBeenCalledWith('disconnected');
      expect(transport.getConnectionStatus()).toBe('disconnected');
    });

    it('should clear pending bot timers', async () => {
      await transport.connect();
      jest.runAllTimers();

      // Trigger a player action that would schedule bot move
      transport.sendAction({ type: 'DRAW_CARD' });

      // Disconnect before bot can move
      transport.disconnect();

      // Advance timers - bot should not move
      jest.runAllTimers();

      // onPlayerAction should only have player actions, not bot
      const botActions = (callbacks.onPlayerAction as jest.Mock).mock.calls
        .filter((call: unknown[]) => call[0] === 'bot');
      expect(botActions).toHaveLength(0);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return disconnected initially', () => {
      expect(transport.getConnectionStatus()).toBe('disconnected');
    });

    it('should return connected after connect', async () => {
      await transport.connect();
      expect(transport.getConnectionStatus()).toBe('connected');
    });
  });

  describe('sendAction', () => {
    beforeEach(async () => {
      await transport.connect();
      jest.runAllTimers();
    });

    it('should error when game not active', () => {
      transport.disconnect();
      transport.sendAction({ type: 'DRAW_CARD' });

      expect(callbacks.onError).toHaveBeenCalledWith('Game not active');
    });

    it('should process PLAY_CARDS action', () => {
      const cards = [mockCard()];
      transport.sendAction({ type: 'PLAY_CARDS', cards });

      expect(callbacks.onStateUpdate).toHaveBeenCalled();
      expect(callbacks.onHandUpdate).toHaveBeenCalled();
      expect(callbacks.onPlayerAction).toHaveBeenCalledWith('player', { type: 'PLAY_CARDS', cards });
    });

    it('should process DRAW_CARD action', () => {
      transport.sendAction({ type: 'DRAW_CARD' });

      expect(callbacks.onStateUpdate).toHaveBeenCalled();
      expect(callbacks.onHandUpdate).toHaveBeenCalled();
      expect(callbacks.onPlayerAction).toHaveBeenCalledWith('player', { type: 'DRAW_CARD' });
    });

    it('should process DECLARE_LAST_CARD action', () => {
      transport.sendAction({ type: 'DECLARE_LAST_CARD', player: 0 });

      expect(callbacks.onStateUpdate).toHaveBeenCalled();
      expect(callbacks.onPlayerAction).toHaveBeenCalledWith('player', { type: 'DECLARE_LAST_CARD', player: 0 });
    });

    it('should error when not player turn (except DECLARE_LAST_CARD)', async () => {
      // Play a card to make it bot's turn
      const { applyCardEffect } = require('../../game');
      applyCardEffect.mockReturnValueOnce({
        deck: [],
        discardPile: [mockCard()],
        players: [mockHand(), mockHand()],
        currentPlayer: 1, // Bot's turn
        direction: 1,
        message: 'test',
        lastCardCalled: [false, false],
        drawPressure: 0,
        hasPlayed: [true, false],
      });

      transport.sendAction({ type: 'PLAY_CARDS', cards: [mockCard()] });

      // Clear mocks
      (callbacks.onError as jest.Mock).mockClear();

      // Try to play again when it's bot's turn
      transport.sendAction({ type: 'PLAY_CARDS', cards: [mockCard()] });

      expect(callbacks.onError).toHaveBeenCalledWith("Not your turn");
    });
  });

  describe('bot turn scheduling', () => {
    beforeEach(async () => {
      const { applyCardEffect, isGameOver } = require('../../game');
      
      // First action switches to bot's turn
      applyCardEffect.mockReturnValueOnce({
        deck: mockDeck().slice(10),
        discardPile: [mockCard()],
        players: [mockHand(), mockHand()],
        currentPlayer: 1,
        direction: 1,
        message: 'Card played',
        lastCardCalled: [false, false],
        drawPressure: 0,
        hasPlayed: [true, false],
      });

      isGameOver.mockReturnValue({ over: false, winner: null });

      await transport.connect();
      jest.runAllTimers();
    });

    it('should schedule bot move after player action', () => {
      const { getBotTurnDelay } = require('../../game/ai');
      
      transport.sendAction({ type: 'PLAY_CARDS', cards: [mockCard()] });

      expect(getBotTurnDelay).toHaveBeenCalledWith('medium');
    });

    it('should execute bot move after delay', () => {
      const { getComputerMove } = require('../../game/ai');
      
      transport.sendAction({ type: 'PLAY_CARDS', cards: [mockCard()] });

      // Clear previous calls
      (callbacks.onPlayerAction as jest.Mock).mockClear();

      // Advance timers to trigger bot move
      jest.advanceTimersByTime(200);

      expect(getComputerMove).toHaveBeenCalled();
    });
  });

  describe('game over detection', () => {
    beforeEach(async () => {
      await transport.connect();
      jest.runAllTimers();
    });

    it('should emit game over when player wins', () => {
      const { isGameOver } = require('../../game');
      isGameOver.mockReturnValueOnce({ over: true, winner: 0 });

      transport.sendAction({ type: 'PLAY_CARDS', cards: [mockCard()] });

      expect(callbacks.onGameOver).toHaveBeenCalledWith(
        'player',
        '🎉 Congratulations! You Win!'
      );
    });

    it('should emit game over when bot wins', () => {
      const { isGameOver } = require('../../game');
      isGameOver.mockReturnValueOnce({ over: true, winner: 1 });

      transport.sendAction({ type: 'PLAY_CARDS', cards: [mockCard()] });

      expect(callbacks.onGameOver).toHaveBeenCalledWith(
        'bot',
        '😔 Bot Wins! Better luck next time.'
      );
    });

    it('should emit game over for draw', () => {
      const { isGameOver } = require('../../game');
      isGameOver.mockReturnValueOnce({ over: true, winner: null });

      transport.sendAction({ type: 'PLAY_CARDS', cards: [mockCard()] });

      expect(callbacks.onGameOver).toHaveBeenCalledWith(
        null,
        "🤝 It's a draw!"
      );
    });
  });

  describe('setDifficulty', () => {
    it('should update the difficulty', async () => {
      transport.setDifficulty('hard');
      
      await transport.connect();
      jest.runAllTimers();

      const { getBotTurnDelay } = require('../../game/ai');
      
      // Trigger bot turn
      const { applyCardEffect } = require('../../game');
      applyCardEffect.mockReturnValueOnce({
        deck: mockDeck().slice(10),
        discardPile: [mockCard()],
        players: [mockHand(), mockHand()],
        currentPlayer: 1,
        direction: 1,
        message: 'test',
        lastCardCalled: [false, false],
        drawPressure: 0,
        hasPlayed: [true, false],
      });

      transport.sendAction({ type: 'PLAY_CARDS', cards: [mockCard()] });

      expect(getBotTurnDelay).toHaveBeenCalledWith('hard');
    });
  });

  describe('setCallbacks', () => {
    it('should merge callbacks', async () => {
      const newCallback = jest.fn();
      transport.setCallbacks({ onError: newCallback });

      transport.disconnect();
      transport.sendAction({ type: 'DRAW_CARD' });

      expect(newCallback).toHaveBeenCalledWith('Game not active');
    });
  });
});
