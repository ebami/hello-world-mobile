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
import { handleGameAction, startGame } from './gameHandler';
import { guard, translateRoomError } from './validation/validatedHandler';
import { newPlayerId } from './identity';
import { signSession } from './sessionToken';
import type { TypedServer, TypedSocket } from './types';
import {
  createRoomSchema,
  joinRoomSchema,
  playCardsCommandSchema,
} from './validation/schemas';
import { makeProtocolError, type RoomSession } from '@hello-world/game-core';

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
        room = roomManager.createRoom(
          playerId,
          options.playerName,
          socket.id,
          options.maxPlayers ?? 4,
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

  socket.on('leave_room', (...args: unknown[]) => {
    guard('leave_room', null, args, socket, () => {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;

      if (roomId && playerId) {
        const room = roomManager.leaveRoom(roomId, playerId);
        socket.leave(roomId);
        socket.data.roomId = null;

        if (room) {
          io.to(roomId).emit('room_updated', room);
        }
      }
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
        handleGameAction(io, socket, roomId, 'play_cards', command);
      }
    });
  });

  socket.on('draw_card', (...args: unknown[]) => {
    guard('draw_card', null, args, socket, () => {
      const roomId = socket.data.roomId;
      if (roomId) {
        handleGameAction(io, socket, roomId, 'draw_card');
      }
    });
  });

  socket.on('declare_last_card', (...args: unknown[]) => {
    guard('declare_last_card', null, args, socket, () => {
      const roomId = socket.data.roomId;
      if (roomId) {
        handleGameAction(io, socket, roomId, 'declare_last_card');
      }
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[${timestamp()}] [Server] Client disconnected: ${socket.id}, reason: ${reason}`);

    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;

    if (roomId && playerId) {
      // Mark player as disconnected but don't remove immediately.
      roomManager.setPlayerConnected(roomId, playerId, false);

      const room = roomManager.getRoom(roomId);
      if (room) {
        io.to(roomId).emit('room_updated', room);
      }

      // Remove the player if they don't reconnect within the grace period.
      // (Reliable cancellation of this timer is completed in MFP-04.)
      // `.unref()` so a lone pending grace timer never keeps the process (or a
      // test run) alive on its own.
      setTimeout(() => {
        const currentRoom = roomManager.getRoom(roomId);
        if (currentRoom) {
          const player = currentRoom.players.find((p) => p.playerId === playerId);
          if (player && !player.connected) {
            const updatedRoom = roomManager.leaveRoom(roomId, playerId);
            if (updatedRoom) {
              io.to(roomId).emit('room_updated', updatedRoom);
            }
          }
        }
      }, 30000).unref();
    }
  });
}

/**
 * Build the Express + Socket.IO server without binding a port.
 * Call `httpServer.listen(...)` on the result to start accepting connections.
 */
export function createSocketServer(): SocketServer {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  const io: TypedServer = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => registerHandlers(io, socket));

  return { app, httpServer, io };
}
