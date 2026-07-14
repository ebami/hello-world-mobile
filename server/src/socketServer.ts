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
import type { TypedServer, TypedSocket } from './types';
import {
  createRoomSchema,
  joinRoomSchema,
  playCardsSchema,
} from './validation/schemas';
import { makeProtocolError } from '@hello-world/game-core';

export interface SocketServer {
  app: Express;
  httpServer: HttpServer;
  io: TypedServer;
}

function timestamp(): string {
  return new Date().toISOString();
}

/** Register every client-to-server handler on a freshly connected socket. */
function registerHandlers(io: TypedServer, socket: TypedSocket): void {
  console.log(`[${timestamp()}] [Server] Client connected: ${socket.id}`);

  socket.on('create_room', (...args: unknown[]) => {
    guard('create_room', createRoomSchema, args, socket, (options, ack) => {
      const playerId = socket.id;
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
      console.log(`[${timestamp()}] [Server] Room created: ${room.roomId}`);
      ack?.(room);
    });
  });

  socket.on('join_room', (...args: unknown[]) => {
    guard('join_room', joinRoomSchema, args, socket, (options, ack) => {
      let room;
      try {
        room = roomManager.joinRoom(
          options.roomId,
          socket.id,
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

      socket.data.playerId = socket.id;
      socket.data.playerName = options.playerName;
      socket.data.roomId = room.roomId;

      socket.join(room.roomId);
      console.log(`[${timestamp()}] [Server] Player joined room: ${room.roomId}`);
      ack?.(room);

      socket.to(room.roomId).emit('room_updated', room);
    });
  });

  socket.on('leave_room', (...args: unknown[]) => {
    guard('leave_room', null, args, socket, () => {
      const roomId = socket.data.roomId;
      const playerName = socket.data.playerName;

      if (roomId && playerName) {
        const room = roomManager.leaveRoom(roomId, playerName);
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
    guard('play_cards', playCardsSchema, args, socket, (cards) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        handleGameAction(io, socket, roomId, 'play_cards', cards);
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
    const playerName = socket.data.playerName;

    if (roomId && playerName) {
      // Mark player as disconnected but don't remove immediately.
      roomManager.setPlayerConnected(roomId, playerName, false);

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
          const player = currentRoom.players.find((p) => p.playerId === playerName);
          if (player && !player.connected) {
            const updatedRoom = roomManager.leaveRoom(roomId, playerName);
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
