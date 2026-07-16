/**
 * @fileoverview Express + Socket.IO server composition root.
 *
 * {@link createSocketServer} builds the HTTP + Socket.IO server and wires every
 * client event through the crash-safe {@link guard} wrapper, but it does NOT
 * bind a port. Tests construct it and listen on an ephemeral port; the runtime
 * entry point (`index.ts`) is the only place that binds the production port.
 *
 * @module server/socketServer
 */

import express, { type Express } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomManager } from './roomManager';
import {
  handleGameAction,
  startGame,
  forfeitAndComplete,
  buildResumeSnapshot,
} from './gameHandler';
import { guard, translateRoomError } from './validation/validatedHandler';
import { newPlayerId } from './identity';
import { signSession, verifySession } from './sessionToken';
import { armGraceTimer, cancelGraceTimer } from './graceTimers';
import { loadConfig } from './config';
import type { TypedServer, TypedSocket } from './types';
import {
  createRoomSchema,
  joinRoomSchema,
  playCardsCommandSchema,
  optionalCommandMetaSchema,
  resumeSessionSchema,
} from './validation/schemas';
import {
  makeProtocolError,
  type RoomSession,
  type ResumeResult,
} from '@hello-world/game-core';

/** Grace period before a transport disconnect is treated as permanent (MFP-04). */
const DISCONNECT_GRACE_MS = 30_000;

export interface SocketServer {
  app: Express;
  httpServer: HttpServer;
  io: TypedServer;
}

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Assemble the {@link RoomSession} returned to a client on create/join: the
 * public room, the caller's opaque player id, and a freshly signed, room-scoped
 * reconnect token with its expiry. The token is a secret and is never logged.
 */
function issueSession(playerId: string, room: RoomSession['room']): RoomSession {
  const { token, expiresAt } = signSession(playerId, room.roomId);
  return { room, playerId, reconnectToken: token, expiresAt };
}

/** Register every client-to-server handler on a freshly connected socket. */
function registerHandlers(io: TypedServer, socket: TypedSocket): void {
  console.log(`[${timestamp()}] [Server] Client connected: ${socket.id}`);

  socket.on('create_room', (...args: unknown[]) => {
    guard('create_room', createRoomSchema, args, socket, (options, ack) => {
      // Mint an opaque, server-issued identity — independent of the socket id
      // and the display name — and bind it to this connection.
      const playerId = newPlayerId();
      let room;
      try {
        // Server-authoritative room size (MFP-11): the client-requested
        // `maxPlayers` is never trusted; rooms are capped at two players by the
        // RoomManager default. The strict schema also rejects any value > 2.
        room = roomManager.createRoom(
          playerId,
          options.playerName,
          socket.id,
        );
      } catch (err) {
        throw translateRoomError(err);
      }

      socket.data.playerId = playerId;
      socket.data.playerName = options.playerName;
      socket.data.roomId = room.roomId;

      socket.join(room.roomId);
      // Never log the reconnect token — it is a signed credential.
      console.log(`[${timestamp()}] [Server] Room created: ${room.roomId}`);
      ack?.(issueSession(playerId, room));
    });
  });

  socket.on('join_room', (...args: unknown[]) => {
    guard('join_room', joinRoomSchema, args, socket, (options, ack) => {
      // Each join gets its own opaque identity; two players sharing a display
      // name (even the same name across rooms) always get distinct ids.
      const playerId = newPlayerId();
      let room;
      try {
        room = roomManager.joinRoom(
          options.roomId,
          playerId,
          options.playerName,
          socket.id,
        );
      } catch (err) {
        throw translateRoomError(err);
      }

      if (!room) {
        ack?.(null, makeProtocolError('ROOM_NOT_FOUND', 'Room not found.'));
        return;
      }

      socket.data.playerId = playerId;
      socket.data.playerName = options.playerName;
      socket.data.roomId = room.roomId;

      socket.join(room.roomId);
      console.log(`[${timestamp()}] [Server] Player joined room: ${room.roomId}`);
      ack?.(issueSession(playerId, room));

      socket.to(room.roomId).emit('room_updated', room);
    });
  });

  socket.on('resume_session', (...args: unknown[]) => {
    guard('resume_session', resumeSessionSchema, args, socket, (options, ack) => {
      // Verify the signed token (signature, expiry, room scope) and that its
      // player id matches the claimed identity (MFP-04). An invalid or expired
      // token reveals nothing about the room's private state.
      const claims = verifySession(options.reconnectToken, options.roomId);
      if (!claims || claims.playerId !== options.playerId) {
        ack?.(null, makeProtocolError('SESSION_INVALID', 'Invalid or expired session.'));
        return;
      }

      const player = roomManager.getPlayer(options.roomId, options.playerId);
      const phase = roomManager.getPhase(options.roomId);
      // Resume only into a live session (lobby or active). A completed/abandoned
      // game — or an explicit leave that removed the player — is not resumable,
      // which is how an explicit leave "immediately invalidates" the session.
      if (!player || (phase !== 'LOBBY' && phase !== 'ACTIVE')) {
        ack?.(null, makeProtocolError('SESSION_INVALID', 'Session is no longer valid.'));
        return;
      }

      // Rebind the player to this socket; the previous socket becomes stale and
      // can no longer submit commands (its isCurrentSocket check now fails).
      roomManager.setSocketId(options.roomId, options.playerId, socket.id);
      roomManager.setPlayerConnected(options.roomId, options.playerId, true);
      cancelGraceTimer(options.roomId, options.playerId);

      socket.data.playerId = options.playerId;
      socket.data.playerName = player.displayName;
      socket.data.roomId = options.roomId;
      socket.join(options.roomId);

      // Rotate the reconnect token so the presented one cannot be reused.
      const { token, expiresAt } = signSession(options.playerId, options.roomId);
      const snapshot = buildResumeSnapshot(options.roomId, options.playerId);
      const result: ResumeResult = {
        room: roomManager.getRoom(options.roomId)!,
        state: snapshot.state,
        hand: snapshot.hand,
        playerId: options.playerId,
        reconnectToken: token,
        expiresAt,
        stateVersion: snapshot.stateVersion,
      };
      // Never log the rotated token.
      console.log(`[${timestamp()}] [Server] Session resumed in room ${options.roomId}`);
      ack?.(result);

      // Let the other player observe the reconnection.
      socket.to(options.roomId).emit('room_updated', roomManager.getRoom(options.roomId)!);
    });
  });

  socket.on('leave_room', (...args: unknown[]) => {
    guard('leave_room', null, args, socket, () => {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;
      if (!roomId || !playerId) return;

      // An explicit leave immediately invalidates the session — cancel any
      // pending grace timer so it cannot fire a duplicate transition (MFP-04).
      cancelGraceTimer(roomId, playerId);

      if (roomManager.getPhase(roomId) === 'ACTIVE') {
        // Leaving an active game is a forfeit: the opponent wins and a single
        // game_over is emitted (MFP-05). The seat order is never mutated.
        forfeitAndComplete(io, roomId, playerId);
      } else {
        const room = roomManager.leaveRoom(roomId, playerId);
        if (room) {
          io.to(roomId).emit('room_updated', room);
        }
      }

      socket.leave(roomId);
      socket.data.roomId = null;
    });
  });

  socket.on('start_game', (...args: unknown[]) => {
    guard('start_game', null, args, socket, () => {
      const roomId = socket.data.roomId;
      if (roomId) {
        startGame(io, socket, roomId);
      } else {
        socket.emit('error', 'Not in a room');
      }
    });
  });

  socket.on('play_cards', (...args: unknown[]) => {
    guard('play_cards', playCardsCommandSchema, args, socket, (command) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        handleGameAction(io, socket, roomId, 'play_cards', command, command.meta);
      }
    });
  });

  socket.on('draw_card', (...args: unknown[]) => {
    guard('draw_card', optionalCommandMetaSchema, args, socket, (meta) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        handleGameAction(io, socket, roomId, 'draw_card', undefined, meta ?? undefined);
      }
    });
  });

  socket.on('declare_last_card', (...args: unknown[]) => {
    guard('declare_last_card', optionalCommandMetaSchema, args, socket, (meta) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        handleGameAction(io, socket, roomId, 'declare_last_card', undefined, meta ?? undefined);
      }
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[${timestamp()}] [Server] Client disconnected: ${socket.id}, reason: ${reason}`);

    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;

    // Ignore a stale socket's disconnect: if the player already resumed on a
    // newer socket, this one is no longer current and must not disturb the live
    // session (MFP-04).
    if (roomId && playerId && roomManager.isCurrentSocket(roomId, playerId, socket.id)) {
      // Mark player as disconnected but keep the seat; begin a grace period via
      // the registry, which guarantees at most one pending timer per player and
      // lets a successful resume cancel it reliably (MFP-04).
      roomManager.setPlayerConnected(roomId, playerId, false);

      const room = roomManager.getRoom(roomId);
      if (room) {
        io.to(roomId).emit('room_updated', room);
      }

      armGraceTimer(roomId, playerId, DISCONNECT_GRACE_MS, () => {
        const player = roomManager.getPlayer(roomId, playerId);
        if (!player || player.connected) {
          return; // reconnected, or already removed
        }
        if (roomManager.getPhase(roomId) === 'ACTIVE') {
          // Grace expired mid-game → forfeit; the opponent wins (MFP-05).
          forfeitAndComplete(io, roomId, playerId);
        } else {
          // Lobby/completed → remove the player and clean up empty rooms.
          const updatedRoom = roomManager.leaveRoom(roomId, playerId);
          if (updatedRoom) {
            io.to(roomId).emit('room_updated', updatedRoom);
          }
        }
      });
    }
  });
}

/**
 * Build the Express + Socket.IO server without binding a port.
 * Call `httpServer.listen(...)` on the result to start accepting connections.
 */
export function createSocketServer(): SocketServer {
  // Validated configuration (MFP-07): the CORS allow-list is environment-driven
  // rather than hard-coded. Unset origins default to '*' (dev/test convenience).
  const config = loadConfig();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  const io: TypedServer = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => registerHandlers(io, socket));

  return { app, httpServer, io };
}
