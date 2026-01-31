// Local transport adapter for single-player mode - wraps existing reducer logic
import type {
  GameTransport,
  GameAction,
  TransportCallbacks,
  ConnectionStatus,
} from './types';
import type { GameState, PublicGameView, PrivateHandPayload } from '../game/types';
import {
  generateDeck,
  shuffleDeck,
  dealCards,
  applyCardEffect,
  drawCards,
  declareLastCard,
  isGameOver,
} from '../game';
import { getComputerMove, getBotTurnDelay, type Difficulty } from '../game/ai';

// Convert internal GameState to PublicGameView for transport compatibility
function toPublicView(state: GameState, roomId: string): PublicGameView {
  return {
    roomId,
    deckCount: state.deck.length,
    discardPile: state.discardPile,
    currentPlayer: state.currentPlayer,
    direction: state.direction,
    message: state.message,
    lastCardCalled: state.lastCardCalled,
    drawPressure: state.drawPressure,
    hasPlayed: state.hasPlayed,
    players: state.players.map((hand, idx) => ({
      playerId: idx === 0 ? 'player' : 'bot',
      handCount: hand.length,
      connected: true,
      isBot: idx !== 0,
    })),
  };
}

// Convert internal GameState to PrivateHandPayload
function toHandPayload(state: GameState, roomId: string, playerId: string): PrivateHandPayload {
  const playerIndex = playerId === 'player' ? 0 : 1;
  return {
    roomId,
    playerId,
    hand: state.players[playerIndex],
  };
}

function createInitialState(): GameState {
  const deck = shuffleDeck(generateDeck());
  const { hands, remaining } = dealCards(deck, 2, 5);
  const discardPile = [remaining.shift()!];

  return {
    deck: remaining,
    discardPile,
    players: hands,
    currentPlayer: 0,
    direction: 1,
    message: 'Game started! Your turn.',
    lastCardCalled: [false, false],
    drawPressure: 0,
    hasPlayed: [false, false],
  };
}

export class LocalTransport implements GameTransport {
  private callbacks: Partial<TransportCallbacks> = {};
  private connectionStatus: ConnectionStatus = 'disconnected';
  private state: GameState | null = null;
  private readonly playerId: string = 'player';
  private readonly roomId: string = 'local-game';
  private difficulty: Difficulty;
  private botTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(difficulty: Difficulty = 'medium') {
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  async connect(): Promise<void> {
    this.connectionStatus = 'connected';
    this.callbacks.onConnectionChange?.('connected');
    
    // Initialize game state
    this.state = createInitialState();
    
    // Immediately emit game start
    const publicView = toPublicView(this.state, this.roomId);
    const handPayload = toHandPayload(this.state, this.roomId, this.playerId);
    
    // Use setTimeout to ensure callbacks are set first
    setTimeout(() => {
      if (this.state) {
        this.callbacks.onGameStart?.(publicView, handPayload);
      }
    }, 0);
  }

  disconnect(): void {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    this.state = null;
    this.connectionStatus = 'disconnected';
    this.callbacks.onConnectionChange?.('disconnected');
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  sendAction(action: GameAction): void {
    if (!this.state || this.connectionStatus !== 'connected') {
      this.callbacks.onError?.('Game not active');
      return;
    }

    // Only allow player actions on their turn
    if (action.type !== 'DECLARE_LAST_CARD' && this.state.currentPlayer !== 0) {
      this.callbacks.onError?.("Not your turn");
      return;
    }

    // Process the action synchronously
    this.processAction(action);
  }

  private processAction(action: GameAction): void {
    if (!this.state) return;

    let newState: GameState;

    switch (action.type) {
      case 'PLAY_CARDS':
        newState = applyCardEffect(this.state, action.cards);
        break;

      case 'DRAW_CARD': {
        const count = this.state.drawPressure > 0 ? this.state.drawPressure : 1;
        const { deck, discardPile, drawn } = drawCards(
          this.state.deck,
          this.state.discardPile,
          count
        );
        const players = this.state.players.map((hand, idx) =>
          idx === this.state!.currentPlayer ? [...hand, ...drawn] : hand
        );
        const hasPlayed = [...this.state.hasPlayed];
        hasPlayed[this.state.currentPlayer] = true;
        const lastCardCalled = [...this.state.lastCardCalled];
        lastCardCalled[this.state.currentPlayer] = false;

        const nextPlayer =
          (this.state.currentPlayer + this.state.direction + players.length) %
          players.length;

        newState = {
          ...this.state,
          deck,
          discardPile,
          players,
          currentPlayer: nextPlayer,
          message: `Drew ${drawn.length} card${drawn.length === 1 ? '' : 's'}`,
          drawPressure: 0,
          hasPlayed,
          lastCardCalled,
        };
        break;
      }

      case 'DECLARE_LAST_CARD':
        newState = declareLastCard(this.state, action.player);
        break;

      default:
        return;
    }

    this.state = newState;

    // Notify subscribers
    const publicView = toPublicView(newState, this.roomId);
    const handPayload = toHandPayload(newState, this.roomId, this.playerId);

    this.callbacks.onStateUpdate?.(publicView);
    this.callbacks.onHandUpdate?.(handPayload);
    this.callbacks.onPlayerAction?.(this.playerId, action);

    // Check for game over
    const gameOver = isGameOver(newState);
    if (gameOver.over) {
      let winnerId: string | null = null;
      if (gameOver.winner === 0) winnerId = 'player';
      else if (gameOver.winner === 1) winnerId = 'bot';
      
      let message = "🤝 It's a draw!";
      if (gameOver.winner === 0) {
        message = '🎉 Congratulations! You Win!';
      } else if (gameOver.winner === 1) {
        message = '😔 Bot Wins! Better luck next time.';
      }
      this.callbacks.onGameOver?.(winnerId, message);
      return;
    }

    // If it's now the bot's turn, schedule bot move
    if (newState.currentPlayer === 1) {
      this.scheduleBotMove();
    }
  }

  private scheduleBotMove(): void {
    if (this.state?.currentPlayer !== 1) return;

    const delay = getBotTurnDelay(this.difficulty);

    this.botTimer = setTimeout(() => {
      if (this.state?.currentPlayer !== 1) return;

      const move = getComputerMove(this.state, this.difficulty);

      if (move.draw) {
        this.processBotAction({ type: 'DRAW_CARD' });
      } else if (move.cards) {
        this.processBotAction({ type: 'PLAY_CARDS', cards: move.cards });
      }
    }, delay);
  }

  private processBotAction(action: GameAction): void {
    if (!this.state) return;

    let newState: GameState;

    switch (action.type) {
      case 'PLAY_CARDS':
        newState = applyCardEffect(this.state, action.cards);
        break;

      case 'DRAW_CARD': {
        const count = this.state.drawPressure > 0 ? this.state.drawPressure : 1;
        const { deck, discardPile, drawn } = drawCards(
          this.state.deck,
          this.state.discardPile,
          count
        );
        const players = this.state.players.map((hand, idx) =>
          idx === this.state!.currentPlayer ? [...hand, ...drawn] : hand
        );
        const hasPlayed = [...this.state.hasPlayed];
        hasPlayed[this.state.currentPlayer] = true;
        const lastCardCalled = [...this.state.lastCardCalled];
        lastCardCalled[this.state.currentPlayer] = false;

        const nextPlayer =
          (this.state.currentPlayer + this.state.direction + players.length) %
          players.length;

        newState = {
          ...this.state,
          deck,
          discardPile,
          players,
          currentPlayer: nextPlayer,
          message: `Bot drew ${drawn.length} card${drawn.length === 1 ? '' : 's'}`,
          drawPressure: 0,
          hasPlayed,
          lastCardCalled,
        };
        break;
      }

      default:
        return;
    }

    this.state = newState;

    // Notify subscribers
    const publicView = toPublicView(newState, this.roomId);
    const handPayload = toHandPayload(newState, this.roomId, this.playerId);

    this.callbacks.onStateUpdate?.(publicView);
    this.callbacks.onHandUpdate?.(handPayload);
    this.callbacks.onPlayerAction?.('bot', action);

    // Check for game over
    const gameOver = isGameOver(newState);
    if (gameOver.over) {
      let winnerId: string | null = null;
      if (gameOver.winner === 0) winnerId = 'player';
      else if (gameOver.winner === 1) winnerId = 'bot';
      
      let message = "🤝 It's a draw!";
      if (gameOver.winner === 0) {
        message = '🎉 Congratulations! You Win!';
      } else if (gameOver.winner === 1) {
        message = '😔 Bot Wins! Better luck next time.';
      }
      this.callbacks.onGameOver?.(winnerId, message);
    }
  }

  setCallbacks(callbacks: Partial<TransportCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // LocalTransport does not support room management
  // These are only available for multiplayer transports
}
