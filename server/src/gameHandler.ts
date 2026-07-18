// Game handler - action validation, state updates, and broadcasts
import { roomManager } from './roomManager';
import type {
  Card,
  GameState,
  PublicGameView,
  PrivateHandPayload,
  PlayCardsCommand,
  CommandMetadata,
  GameOverReason,
} from '@hello-world/game-core';
import {
  generateDeck,
  shuffleDeck,
  dealCards,
  drawCards,
  getValidMoves,
  applyCardEffect,
  resolveEndgame,
  nextActiveIndex,
  dropPlayer,
  declareLastCard,
} from '@hello-world/game-core';
import type { TypedServer, TypedSocket } from './types';
import { logger } from './logger';
import { recordMetric } from './metricsHooks';

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
    phase: room?.phase,
    stateVersion: roomManager.getStateVersion(roomId),
  };
}

/**
 * Build the authoritative snapshot a client reconciles from on resume (MFP-04):
 * the current public view, the resumed player's own private hand, and the state
 * version. `state`/`hand` are null when the room is still in the lobby.
 */
export function buildResumeSnapshot(
  roomId: string,
  playerId: string,
): { state: PublicGameView | null; hand: PrivateHandPayload | null; stateVersion: number } {
  const gameState = roomManager.getGameState(roomId);
  const stateVersion = roomManager.getStateVersion(roomId);
  if (!gameState) {
    return { state: null, hand: null, stateVersion };
  }
  const seat = roomManager.seatIndex(roomId, playerId);
  const state = toPublicView(gameState, roomId);
  const hand = seat !== -1 ? toHandPayload(gameState, roomId, playerId, seat) : null;
  return { state, hand, stateVersion };
}

/**
 * Emit a single `game_over` for a completed game and return the winner's id.
 * Broadcast to the whole room and to each seat's current socket so a player who
 * has navigated away from the room channel still receives the result.
 */
function announceGameOver(
  io: TypedServer,
  roomId: string,
  winnerId: string | null,
  message: string,
  reason: GameOverReason,
): void {
  io.to(roomId).emit('game_over', winnerId, message, reason);
}

/**
 * Remove a player from an active game (explicit leave or grace expiry). The
 * leaver is dropped from the game state — their hand is reshuffled into the deck
 * and their seat marked eliminated — after which the game either continues (2+
 * active players remain) or completes when only one player is left standing,
 * emitting a single `game_over` (MFP-05). No-op if the room is not active or the
 * player is not seated. The frozen seat order is never mutated.
 */
export function forfeitAndComplete(
  io: TypedServer,
  roomId: string,
  leaverId: string,
): void {
  const room = roomManager.getRoom(roomId);
  if (!room || roomManager.getPhase(roomId) !== 'ACTIVE') {
    return;
  }
  const seat = roomManager.seatIndex(roomId, leaverId);
  let gameState = roomManager.getGameState(roomId);
  if (seat === -1 || !gameState) {
    return;
  }

  // Mark the leaver disconnected for presentation; the seat order stays intact.
  roomManager.setPlayerConnected(roomId, leaverId, false);

  // Drop them from the game, then resolve whether the game is now over.
  gameState = dropPlayer(gameState, seat);
  const mode = room.endgameMode ?? 'first_out';
  const endgame = resolveEndgame(gameState, mode);
  gameState = endgame.state;
  roomManager.setGameState(roomId, gameState);
  roomManager.updateHandCounts(roomId, gameState);
  roomManager.bumpStateVersion(roomId);
  recordMetric('forfeit');

  // Show the drop to everyone still in the room.
  broadcastGameState(io, roomId, gameState);

  if (endgame.over && roomManager.completeGame(roomId)) {
    const seatOrder = roomManager.getSeatOrder(roomId);
    const winnerId =
      endgame.winnerSeat !== null ? seatOrder[endgame.winnerSeat] ?? null : null;
    const winner = winnerId ? roomManager.getPlayer(roomId, winnerId) : null;
    const message = winner ? `${winner.displayName} wins by forfeit!` : 'Game over.';
    recordMetric('game_completed', { reason: 'forfeit' });
    announceGameOver(io, roomId, winnerId, message, 'forfeit');
  } else {
    // Game continues with the remaining players — refresh the roster view.
    const updatedRoom = roomManager.getRoom(roomId);
    if (updatedRoom) {
      io.to(roomId).emit('room_updated', updatedRoom);
    }
  }
}

function toHandPayload(state: GameState, roomId: string, playerId: string, playerIndex: number): PrivateHandPayload {
  return {
    roomId,
    playerId,
    hand: state.players[playerIndex],
  };
}

/**
 * Broadcast the authoritative public view to the whole room and each player's
 * own private hand to their current socket (via the frozen seat mapping).
 */
function broadcastGameState(io: TypedServer, roomId: string, gameState: GameState): void {
  io.to(roomId).emit('game_state_update', toPublicView(gameState, roomId));
  const seatOrder = roomManager.getSeatOrder(roomId);
  seatOrder.forEach((seatPlayerId, seat) => {
    const socketId = roomManager.getSocketId(roomId, seatPlayerId);
    if (socketId) {
      io.to(socketId).emit('hand_update', toHandPayload(gameState, roomId, seatPlayerId, seat));
    }
  });
}

/**
 * Advance the current turn past any disconnected-but-active seat so the table is
 * not blocked for the full grace window when it becomes an away player's turn
 * (R9). Skipped seats are not removed — they stay resumable until grace expiry
 * drops them. Pure turn skip; no auto-draw.
 */
function skipDisconnectedSeats(roomId: string, gameState: GameState): GameState {
  const seatOrder = roomManager.getSeatOrder(roomId);
  const total = seatOrder.length;
  if (total === 0) return gameState;
  let current = gameState.currentPlayer;
  let steps = 0;
  while (steps < total) {
    const pid = seatOrder[current];
    const player = pid ? roomManager.getPlayer(roomId, pid) : null;
    const isActive = (gameState.seatStatus?.[current] ?? 'active') === 'active';
    if (isActive && player && !player.connected) {
      current = nextActiveIndex(current, gameState.direction, total, gameState.seatStatus);
      steps += 1;
    } else {
      break;
    }
  }
  return current === gameState.currentPlayer
    ? gameState
    : { ...gameState, currentPlayer: current };
}

/**
 * If it is now a disconnected player's turn in an active game, skip past them and
 * broadcast the updated state (R9). Called when a player disconnects.
 */
export function advancePastDisconnected(io: TypedServer, roomId: string): void {
  if (roomManager.getPhase(roomId) !== 'ACTIVE') return;
  const gameState = roomManager.getGameState(roomId);
  if (!gameState) return;
  const skipped = skipDisconnectedSeats(roomId, gameState);
  if (skipped !== gameState) {
    roomManager.setGameState(roomId, skipped);
    roomManager.bumpStateVersion(roomId);
    broadcastGameState(io, roomId, skipped);
  }
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
    seatStatus: room.players.map(() => 'active' as const),
    finishedOrder: [],
    eliminatedOrder: [],
  };

  roomManager.setGameState(roomId, gameState);
  return gameState;
}

export function handleGameAction(
  io: TypedServer,
  socket: TypedSocket,
  roomId: string,
  action: 'play_cards' | 'draw_card' | 'declare_last_card',
  command?: PlayCardsCommand,
  meta?: CommandMetadata,
): void {
  // Authorize by the socket's server-issued player id — not by name and not by
  // any client-supplied value. Rejects unauthenticated, non-member, wrong-room,
  // and stale-socket commands before any game state is read or mutated.
  const auth = authorizeRoomCommand(socket, roomId);
  if (!auth.ok) {
    socket.emit('error', auth.error);
    return;
  }

  // Only an in-progress game accepts gameplay commands. A completed (or
  // otherwise non-active) game rejects them (MFP-05).
  if (roomManager.getPhase(roomId) !== 'ACTIVE') {
    socket.emit('error', 'Game is not in progress');
    return;
  }

  let gameState = roomManager.getGameState(roomId);
  if (!gameState) {
    socket.emit('error', 'Game not found');
    return;
  }

  // Resolve the player's hand/turn position through the frozen seat mapping —
  // never the mutable presentation array — so membership changes can't shift a
  // player onto the wrong hand (MFP-05).
  const playerIndex = roomManager.seatIndex(roomId, auth.playerId);
  if (playerIndex === -1) {
    socket.emit('error', 'You are not seated in this game');
    return;
  }
  const displayName = roomManager.getPlayer(roomId, auth.playerId)?.displayName ?? 'Player';

  // Idempotency + optimistic concurrency (MFP-04). Checked before turn
  // validation so a duplicate or stale retry (e.g. after a reconnect) resyncs
  // the client rather than surfacing a confusing turn/validation error.
  if (meta) {
    if (roomManager.hasSeenCommand(roomId, auth.playerId, meta.commandId)) {
      // Already applied: re-send the authoritative state; never apply twice.
      socket.emit('game_state_update', toPublicView(gameState, roomId));
      return;
    }
    if (meta.expectedStateVersion !== roomManager.getStateVersion(roomId)) {
      // Stale command: reject without mutating and push the latest snapshot so
      // the client can resynchronize.
      socket.emit('error', 'State version mismatch');
      socket.emit('game_state_update', toPublicView(gameState, roomId));
      return;
    }
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
      
      const nextPlayer = nextActiveIndex(
        playerIndex,
        gameState.direction,
        players.length,
        gameState.seatStatus,
      );
      
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
  
  // Mode-aware endgame resolution: mark any seat that just went out and, in
  // Ranking mode, keep playing until one seat remains. Runs before the state is
  // persisted so the updated seat statuses broadcast with this command.
  const endgameMode = roomManager.getRoom(roomId)?.endgameMode ?? 'first_out';
  const endgame = resolveEndgame(gameState, endgameMode);
  gameState = endgame.state;

  // If the turn landed on a disconnected-but-active player, skip past them so the
  // table isn't blocked until their grace window expires (R9).
  if (!endgame.over) {
    gameState = skipDisconnectedSeats(roomId, gameState);
  }

  // Save updated state and advance the monotonic version exactly once for this
  // accepted command; record the command id so a retry is deduplicated (MFP-04).
  roomManager.setGameState(roomId, gameState);
  roomManager.updateHandCounts(roomId, gameState);
  roomManager.bumpStateVersion(roomId);
  if (meta) {
    roomManager.recordCommand(roomId, auth.playerId, meta.commandId);
  }

  // Broadcast the public view + each player's private hand via the frozen seat map.
  broadcastGameState(io, roomId, gameState);
  const seatOrder = roomManager.getSeatOrder(roomId);

  // Gate the announcement on the single ACTIVE → COMPLETED transition so
  // `game_over` is emitted exactly once (MFP-05). Standings enrichment lands in
  // U7; for now the wire carries the winner and a win/draw reason.
  if (endgame.over && roomManager.completeGame(roomId)) {
    // The wire `winnerId` is the opaque player id, resolved through the seat
    // mapping; the message shows the human-readable display name.
    const winnerId =
      endgame.winnerSeat !== null ? seatOrder[endgame.winnerSeat] ?? null : null;
    const winner = winnerId ? roomManager.getPlayer(roomId, winnerId) : null;
    const message = winner ? `${winner.displayName} wins!` : "It's a draw!";
    recordMetric('game_completed', { reason: winnerId ? 'win' : 'draw' });
    announceGameOver(io, roomId, winnerId, message, winnerId ? 'win' : 'draw');
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

  // Idempotent + phase-guarded: a room can only be started from the lobby, so a
  // second start_game is rejected without redealing (MFP-05).
  if (roomManager.getPhase(roomId) !== 'LOBBY') {
    socket.emit('error', 'Game already started');
    return;
  }

  // At least two connected players are required to start; the upper bound is
  // already enforced at join time by the room's maxPlayers cap.
  const eligible = room.players.filter(p => p.connected).length;
  if (eligible < 2) {
    socket.emit('error', 'Need at least 2 connected players to start');
    return;
  }

  const gameState = initializeGame(roomId);
  if (!gameState) {
    socket.emit('error', 'Failed to initialize game');
    return;
  }

  logger.info('game started', { event: 'game_started', roomId });

  // Send game_start to each player with their hand via the now-frozen seat map.
  const seatOrder = roomManager.getSeatOrder(roomId);
  seatOrder.forEach((seatPlayerId, seat) => {
    const socketId = roomManager.getSocketId(roomId, seatPlayerId);
    if (socketId) {
      const publicView = toPublicView(gameState, roomId);
      const handPayload = toHandPayload(gameState, roomId, seatPlayerId, seat);
      io.to(socketId).emit('game_start', publicView, handPayload);
    }
  });
}
