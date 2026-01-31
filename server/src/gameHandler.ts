// Game handler - action validation, state updates, and broadcasts
import type { Server, Socket } from 'socket.io';
import { roomManager } from './roomManager';
import type {
  Card,
  GameState,
  PublicGameView,
  PrivateHandPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  Rank,
} from './types';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// ========== Game Logic (duplicated from game/ for server-side validation) ==========

const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function generateDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}${suit}`, rank, suit });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dealCards(deck: Card[], numPlayers: number, cardsPerPlayer: number) {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  const remaining = [...deck];
  
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numPlayers; p++) {
      const card = remaining.shift();
      if (card) hands[p].push(card);
    }
  }
  
  return { hands, remaining };
}

function drawCards(deck: Card[], discardPile: Card[], count: number) {
  let currentDeck = [...deck];
  let currentDiscard = [...discardPile];
  const drawn: Card[] = [];
  
  for (let i = 0; i < count; i++) {
    if (currentDeck.length === 0) {
      if (currentDiscard.length <= 1) break;
      const topCard = currentDiscard.pop()!;
      currentDeck = shuffleDeck(currentDiscard);
      currentDiscard = [topCard];
    }
    const card = currentDeck.shift();
    if (card) drawn.push(card);
  }
  
  return { deck: currentDeck, discardPile: currentDiscard, drawn };
}

function isGameOver(state: GameState): { over: boolean; winner: number | null } {
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].length === 0) {
      return { over: true, winner: i };
    }
  }
  
  // Draw condition: deck empty and no valid moves
  if (state.deck.length === 0) {
    return { over: true, winner: null };
  }
  
  return { over: false, winner: null };
}

// Simplified card matching logic
function canPlayCard(card: Card, topCard: Card, drawPressure: number): boolean {
  const isDrawCard = (c: Card) =>
    c.rank === '2' || (c.rank === 'J' && (c.suit === '♠' || c.suit === '♣'));
  const isRedJack = (c: Card) =>
    c.rank === 'J' && (c.suit === '♥' || c.suit === '♦');
  
  if (drawPressure > 0) {
    return isDrawCard(card) || isRedJack(card);
  }
  
  if (topCard.rank === 'Q') return true;
  return card.suit === topCard.suit || card.rank === topCard.rank;
}

function getDrawPressureValue(card: Card): number {
  if (card.rank === '2') return 2;
  if (card.rank === 'J' && (card.suit === '♠' || card.suit === '♣')) return 5;
  return 0;
}

function applyCardEffect(state: GameState, cards: Card[]): GameState {
  const currentHand = [...state.players[state.currentPlayer]];
  const newDiscard = [...state.discardPile, ...cards];
  
  // Remove played cards from hand
  for (const card of cards) {
    const idx = currentHand.findIndex(c => c.id === card.id);
    if (idx !== -1) currentHand.splice(idx, 1);
  }
  
  const newPlayers = state.players.map((hand, idx) =>
    idx === state.currentPlayer ? currentHand : hand
  );
  
  const hasPlayed = [...state.hasPlayed];
  hasPlayed[state.currentPlayer] = true;
  
  const lastCardCalled = [...state.lastCardCalled];
  lastCardCalled[state.currentPlayer] = false;
  
  // Calculate new draw pressure
  let newDrawPressure = state.drawPressure;
  const lastCard = cards[cards.length - 1];
  
  // Red Jack shields
  if (lastCard.rank === 'J' && (lastCard.suit === '♥' || lastCard.suit === '♦')) {
    newDrawPressure = 0;
  } else {
    // Add pressure from draw cards
    for (const card of cards) {
      newDrawPressure += getDrawPressureValue(card);
    }
  }
  
  // Calculate direction change
  let newDirection = state.direction;
  const aces = cards.filter(c => c.rank === 'A').length;
  if (aces % 2 === 1) {
    newDirection *= -1;
  }
  
  // Skip logic for Kings
  let skips = cards.filter(c => c.rank === 'K').length;
  
  // Calculate next player
  let nextPlayer = state.currentPlayer;
  do {
    nextPlayer = (nextPlayer + newDirection + newPlayers.length) % newPlayers.length;
    skips--;
  } while (skips >= 0);
  
  return {
    ...state,
    discardPile: newDiscard,
    players: newPlayers,
    currentPlayer: nextPlayer,
    direction: newDirection,
    message: `Played ${cards.map(c => c.rank + c.suit).join(', ')}`,
    drawPressure: newDrawPressure,
    hasPlayed,
    lastCardCalled,
  };
}

// ========== State Conversion ==========

function toPublicView(state: GameState, roomId: string): PublicGameView {
  const room = roomManager.getRoom(roomId);
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
    players: room?.players ?? [],
  };
}

function toHandPayload(state: GameState, roomId: string, playerName: string, playerIndex: number): PrivateHandPayload {
  return {
    roomId,
    playerId: playerName,
    hand: state.players[playerIndex],
  };
}

// ========== Game Handler ==========

export function initializeGame(roomId: string): GameState | null {
  const room = roomManager.getRoom(roomId);
  if (!room || room.players.length < 2) {
    return null;
  }
  
  const deck = shuffleDeck(generateDeck());
  const { hands, remaining } = dealCards(deck, room.players.length, 5);
  const discardPile = [remaining.shift()!];
  
  const gameState: GameState = {
    deck: remaining,
    discardPile,
    players: hands,
    currentPlayer: 0,
    direction: 1,
    message: 'Game started!',
    lastCardCalled: room.players.map(() => false),
    drawPressure: 0,
    hasPlayed: room.players.map(() => false),
  };
  
  roomManager.setGameState(roomId, gameState);
  return gameState;
}

export function handleGameAction(
  io: TypedServer,
  socket: TypedSocket,
  roomId: string,
  action: 'play_cards' | 'draw_card' | 'declare_last_card',
  cards?: Card[]
): void {
  const playerName = socket.data.playerName;
  const room = roomManager.getRoom(roomId);
  let gameState = roomManager.getGameState(roomId);
  
  if (!room || !gameState) {
    socket.emit('error', 'Game not found');
    return;
  }
  
  const playerIndex = room.players.findIndex(p => p.playerId === playerName);
  if (playerIndex === -1) {
    socket.emit('error', 'Player not found');
    return;
  }
  
  // Validate turn (except for declare_last_card)
  if (action !== 'declare_last_card' && gameState.currentPlayer !== playerIndex) {
    socket.emit('error', 'Not your turn');
    return;
  }
  
  switch (action) {
    case 'play_cards': {
      if (!cards || cards.length === 0) {
        socket.emit('error', 'No cards provided');
        return;
      }
      
      const topCard = gameState.discardPile[gameState.discardPile.length - 1];
      
      // Basic validation
      if (!canPlayCard(cards[0], topCard, gameState.drawPressure)) {
        socket.emit('error', 'Invalid card');
        return;
      }
      
      gameState = applyCardEffect(gameState, cards);
      break;
    }
    
    case 'draw_card': {
      const count = gameState.drawPressure > 0 ? gameState.drawPressure : 1;
      const { deck, discardPile, drawn } = drawCards(
        gameState.deck,
        gameState.discardPile,
        count
      );
      
      const players = gameState.players.map((hand, idx) =>
        idx === playerIndex ? [...hand, ...drawn] : hand
      );
      
      const hasPlayed = [...gameState.hasPlayed];
      hasPlayed[playerIndex] = true;
      
      const lastCardCalled = [...gameState.lastCardCalled];
      lastCardCalled[playerIndex] = false;
      
      const nextPlayer = (playerIndex + gameState.direction + players.length) % players.length;
      
      gameState = {
        ...gameState,
        deck,
        discardPile,
        players,
        currentPlayer: nextPlayer,
        message: `${playerName} drew ${drawn.length} card(s)`,
        drawPressure: 0,
        hasPlayed,
        lastCardCalled,
      };
      break;
    }
    
    case 'declare_last_card': {
      // Validate declaration
      if (gameState.currentPlayer === playerIndex) {
        socket.emit('error', 'Cannot declare on your turn');
        return;
      }
      
      if (!gameState.hasPlayed.every(Boolean)) {
        socket.emit('error', 'Not everyone has played yet');
        return;
      }
      
      if (gameState.lastCardCalled[playerIndex]) {
        socket.emit('error', 'Already declared');
        return;
      }
      
      const hand = gameState.players[playerIndex];
      if (hand.length !== 1) {
        socket.emit('error', 'Can only declare with one card');
        return;
      }
      
      const newLastCardCalled = [...gameState.lastCardCalled];
      newLastCardCalled[playerIndex] = true;
      
      gameState = {
        ...gameState,
        lastCardCalled: newLastCardCalled,
        message: `${playerName} declared LAST CARD!`,
      };
      break;
    }
  }
  
  // Save updated state
  roomManager.setGameState(roomId, gameState);
  roomManager.updateHandCounts(roomId, gameState);
  
  // Broadcast updates
  const publicView = toPublicView(gameState, roomId);
  io.to(roomId).emit('game_state_update', publicView);
  
  // Send private hand updates to each player
  room.players.forEach((player, idx) => {
    const socketId = roomManager.getSocketId(roomId, player.playerId);
    if (socketId) {
      const handPayload = toHandPayload(gameState!, roomId, player.playerId, idx);
      io.to(socketId).emit('hand_update', handPayload);
    }
  });
  
  // Check for game over
  const result = isGameOver(gameState);
  if (result.over) {
    const winnerId = result.winner !== null ? room.players[result.winner]?.playerId : null;
    let message = "It's a draw!";
    if (result.winner !== null) {
      message = `${winnerId} wins!`;
    }
    io.to(roomId).emit('game_over', winnerId ?? null, message);
  }
}

export function startGame(io: TypedServer, socket: TypedSocket, roomId: string): void {
  const room = roomManager.getRoom(roomId);
  const playerName = socket.data.playerName;
  
  if (!room) {
    socket.emit('error', 'Room not found');
    return;
  }
  
  if (room.hostId !== playerName) {
    socket.emit('error', 'Only host can start game');
    return;
  }
  
  if (room.players.length < 2) {
    socket.emit('error', 'Need at least 2 players');
    return;
  }
  
  const gameState = initializeGame(roomId);
  if (!gameState) {
    socket.emit('error', 'Failed to initialize game');
    return;
  }
  
  console.log(`[GameHandler] Starting game in room ${roomId}`);
  
  // Send game_start to each player with their hand
  room.players.forEach((player, idx) => {
    const socketId = roomManager.getSocketId(roomId, player.playerId);
    if (socketId) {
      const publicView = toPublicView(gameState, roomId);
      const handPayload = toHandPayload(gameState, roomId, player.playerId, idx);
      io.to(socketId).emit('game_start', publicView, handPayload);
    }
  });
}
