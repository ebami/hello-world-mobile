// Express + Socket.IO server setup
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomManager } from './roomManager';
import { handleGameAction, startGame } from './gameHandler';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './types';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log(`[Server] Client connected: ${socket.id}`);

  // Create room
  socket.on('create_room', (options, callback) => {
    try {
      const playerId = socket.id;
      const room = roomManager.createRoom(
        playerId,
        options.playerName,
        socket.id,
        options.maxPlayers ?? 4
      );

      socket.data.playerId = playerId;
      socket.data.playerName = options.playerName;
      socket.data.roomId = room.roomId;

      socket.join(room.roomId);
      callback(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create room';
      callback(null, message);
    }
  });

  // Join room
  socket.on('join_room', (options, callback) => {
    try {
      const room = roomManager.joinRoom(
        options.roomId,
        socket.id,
        options.playerName,
        socket.id
      );

      if (!room) {
        callback(null, 'Room not found');
        return;
      }

      socket.data.playerId = socket.id;
      socket.data.playerName = options.playerName;
      socket.data.roomId = room.roomId;

      socket.join(room.roomId);
      callback(room);

      // Notify other players
      socket.to(room.roomId).emit('room_updated', room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join room';
      callback(null, message);
    }
  });

  // Leave room
  socket.on('leave_room', () => {
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

  // Start game
  socket.on('start_game', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      startGame(io, socket, roomId);
    } else {
      socket.emit('error', 'Not in a room');
    }
  });

  // Game actions
  socket.on('play_cards', (cards) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      handleGameAction(io, socket, roomId, 'play_cards', cards);
    }
  });

  socket.on('draw_card', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      handleGameAction(io, socket, roomId, 'draw_card');
    }
  });

  socket.on('declare_last_card', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      handleGameAction(io, socket, roomId, 'declare_last_card');
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`[Server] Client disconnected: ${socket.id}, reason: ${reason}`);

    const roomId = socket.data.roomId;
    const playerName = socket.data.playerName;

    if (roomId && playerName) {
      // Mark player as disconnected but don't remove immediately
      roomManager.setPlayerConnected(roomId, playerName, false);

      const room = roomManager.getRoom(roomId);
      if (room) {
        io.to(roomId).emit('room_updated', room);
      }

      // Optional: Set a timeout to remove player if they don't reconnect
      setTimeout(() => {
        const currentRoom = roomManager.getRoom(roomId);
        if (currentRoom) {
          const player = currentRoom.players.find(p => p.playerId === playerName);
          if (player && !player.connected) {
            const updatedRoom = roomManager.leaveRoom(roomId, playerName);
            if (updatedRoom) {
              io.to(roomId).emit('room_updated', updatedRoom);
            }
          }
        }
      }, 30000); // 30 second grace period
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});
