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

function toHandPayload(state: GameState, roomId: string, playerId: string, playerIndex: number): PrivateHandPayload {
  return {
    roomId,
    playerId,
    hand: state.players[playerIndex],
  };
}

// ========== Authorization ==========

/**
 * Result of authorizing a room/game command against the socket's session and
 * the server-side membership record.
 */
export type AuthorizedCommand =
  | { ok: true; playerId: string; playerIndex: number }
  | { ok: false; error: string };

/**
 * Authorize a command using the socket's server-set `playerId` (MFP-03) — never
 * a client-supplied identity or a display name. A command is authorized only
 * when every one of these holds; each maps to a rejection reason in the plan:
 *
 *  1. the socket carries an authenticated session (`socket.data.playerId`);
 *  2. the socket's own room state matches the room being acted on;
 *  3. the player is a current member of that room (server-side truth);
 *  4. this socket is the current socket mapped to the player (not stale).
 */
export function authorizeRoomCommand(socket: TypedSocket, roomId: string): AuthorizedCommand {
  const playerId = socket.data.playerId;
  if (!playerId) {
    return { ok: false, error: 'No authenticated session' };
  }
  if (socket.data.roomId !== roomId) {
    return { ok: false, error: 'Not in this room' };
  }
  const room = roomManager.getRoom(roomId);
  if (!room) {
    return { ok: false, error: 'Room not found' };
  }
  const playerIndex = room.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) {
    return { ok: false, error: 'Not a member of this room' };
  }
  if (!roomManager.isCurrentSocket(roomId, playerId, socket.id)) {
    return { ok: false, error: 'Session no longer active on this connection' };
  }
  return { ok: true, playerId, playerIndex };
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
  // Authorize by the socket's server-issued player id — not by name and not by
  // any client-supplied value. Rejects unauthenticated, non-member, wrong-room,
  // and stale-socket commands before any game state is read or mutated.
  const auth = authorizeRoomCommand(socket, roomId);
  if (!auth.ok) {
    socket.emit('error', auth.error);
    return;
  }

  const room = roomManager.getRoom(roomId)!; // guaranteed by authorization
  let gameState = roomManager.getGameState(roomId);
  if (!gameState) {
    socket.emit('error', 'Game not found');
    return;
  }

  const playerIndex = auth.playerIndex;
  const displayName = room.players[playerIndex].displayName;

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
        message: `${displayName} drew ${drawn.length} card(s)`,
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
        message: `${displayName} declared LAST CARD!`,
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
    // The wire `winnerId` is the opaque player id (identity); the message shows
    // the human-readable display name.
    const winner = result.winner !== null ? room.players[result.winner] : null;
    const winnerId = winner?.playerId ?? null;
    const message = winner ? `${winner.displayName} wins!` : "It's a draw!";
    io.to(roomId).emit('game_over', winnerId, message);
  }
}

export function startGame(io: TypedServer, socket: TypedSocket, roomId: string): void {
  // Only an authenticated, current member may start — and only the host, by
  // stable player id (a renamed player can never impersonate the host).
  const auth = authorizeRoomCommand(socket, roomId);
  if (!auth.ok) {
    socket.emit('error', auth.error);
    return;
  }

  const room = roomManager.getRoom(roomId)!; // guaranteed by authorization

  if (room.hostId !== auth.playerId) {
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
