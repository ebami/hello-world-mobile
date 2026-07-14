// Game handler - action validation, state updates, and broadcasts
import { roomManager } from './roomManager';
import type {
  Card,
  GameState,
  PublicGameView,
  PrivateHandPayload,
  PlayCardsCommand,
} from '@hello-world/game-core';
import {
  generateDeck,
  shuffleDeck,
  dealCards,
  drawCards,
  getValidMoves,
  applyCardEffect,
  isGameOver,
  declareLastCard,
} from '@hello-world/game-core';
import type { TypedServer, TypedSocket } from './types';

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
    activeSuit: state.activeSuit ?? null,
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
    activeSuit: null,
  };

  roomManager.setGameState(roomId, gameState);
  return gameState;
}

export function handleGameAction(
  io: TypedServer,
  socket: TypedSocket,
  roomId: string,
  action: 'play_cards' | 'draw_card' | 'declare_last_card',
  command?: PlayCardsCommand
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
      if (!command || command.cardIds.length === 0) {
        socket.emit('error', 'No cards provided');
        return;
      }

      // Resolve requested IDs against the player's OWN authoritative hand.
      // The client supplies only IDs — never rank/suit — and each ID must
      // reference a distinct card the player actually holds. This is what makes
      // a forged rank/suit impossible: canonical cards come from server state.
      const playerHand = gameState.players[playerIndex];
      const seen = new Set<string>();
      const canonical: Card[] = [];
      for (const id of command.cardIds) {
        if (seen.has(id)) {
          socket.emit('error', 'Duplicate card in play');
          return;
        }
        seen.add(id);
        const card = playerHand.find(c => c.id === id);
        if (!card) {
          socket.emit('error', 'Card not in your hand');
          return;
        }
        canonical.push(card);
      }

      const topCard = gameState.discardPile[gameState.discardPile.length - 1];

      // Validate using shared getValidMoves (full rule set), honouring the
      // active suit in force after an Ace — and only canonical server cards.
      const validMoves = getValidMoves(
        playerHand,
        topCard,
        gameState.drawPressure,
        gameState.activeSuit ?? null,
      );

      const isValidPlay = canonical.length === 1
        ? validMoves.singles.some(c => c.id === canonical[0].id)
        : validMoves.runs.some(run =>
            run.length === canonical.length &&
            run.every((c, i) => c.id === canonical[i].id)
          );

      if (!isValidPlay) {
        socket.emit('error', 'Invalid card play');
        return;
      }

      // An Ace requires a declared suit; any other final card must not carry one.
      const lastCard = canonical[canonical.length - 1];
      if (lastCard.rank === 'A') {
        if (!command.declaredSuit) {
          socket.emit('error', 'Must declare a suit when playing an Ace');
          return;
        }
      } else if (command.declaredSuit) {
        socket.emit('error', 'A suit may only be declared when the final card is an Ace');
        return;
      }

      gameState = applyCardEffect(gameState, canonical, command.declaredSuit);
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
      // Use the shared declareLastCard function which validates properly
      // (supports multi-card runs, checks hasPlayed, validates timing)
      const newState = declareLastCard(gameState, playerIndex);
      if (newState === gameState) {
        socket.emit('error', 'Cannot declare last card now');
        return;
      }
      gameState = {
        ...newState,
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
