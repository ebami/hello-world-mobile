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
import { loadConfig, type ServerConfig } from './config';
import { rateLimiter, connectionTracker } from './rateLimiter';
import { recordMetric } from './metricsHooks';
import { registerGauge, snapshotMetrics } from './metrics';
import { isDraining } from './serverLifecycle';
import { logger } from './logger';
import type { TypedServer, TypedSocket } from './types';
import {
  createRoomSchema,
  joinRoomSchema,
  playCardsCommandSchema,
  optionalCommandMetaSchema,
  resumeSessionSchema,
  MAX_MAX_PLAYERS,
} from './validation/schemas';
import {
  makeProtocolError,
  type RoomSession,
  type ResumeResult,
} from '@hello-world/game-core';

/** Grace period before a transport disconnect is treated as permanent (MFP-04). */
const DISCONNECT_GRACE_MS = 30_000;

/** Rate-limit window for per-key event limits (MFP-06). */
const RATE_WINDOW_MS = 60_000;
/** Connection attempts allowed per IP per minute (server-owned, MFP-06). */
const CONNECTION_ATTEMPTS_PER_MINUTE = 120;
/**
 * Max Socket.IO message size. Game commands are tiny (a few card ids); this
 * rejects oversized frames at the transport before any handler runs (MFP-06).
 */
const MAX_HTTP_BUFFER_SIZE = 16 * 1024; // 16 KB

/** Origin allow-list check: unrestricted ('*') always passes. */
function isOriginAllowed(origin: string | undefined, allowed: string[] | '*'): boolean {
  if (allowed === '*') return true;
  if (!origin) return false; // a browser must send an Origin to be allow-listed
  return allowed.includes(origin);
}

export interface SocketServer {
  app: Express;
  httpServer: HttpServer;
  io: TypedServer;
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

/** Per-command rate check keyed by the player (falls back to socket id). */
function commandAllowed(socket: TypedSocket, config: ServerConfig): boolean {
  const key = `cmd:${socket.data.playerId ?? socket.id}`;
  return rateLimiter.tryConsume(key, config.maxEventsPerMinute, RATE_WINDOW_MS);
}

/** Register every client-to-server handler on a freshly connected socket. */
function registerHandlers(io: TypedServer, socket: TypedSocket, config: ServerConfig): void {
  logger.debug('client connected', { event: 'client_connected', socketId: socket.id });

  socket.on('create_room', (...args: unknown[]) => {
    guard('create_room', createRoomSchema, args, socket, (options, ack) => {
      // Stop accepting new rooms while draining for shutdown (MFP-09).
      if (isDraining()) {
        ack?.(null, makeProtocolError('SERVER_CAPACITY_REACHED', 'The server is restarting. Please try again shortly.'));
        return;
      }
      const ip = socket.handshake.address;
      // Throttle room creation per IP (MFP-06).
      if (!rateLimiter.tryConsume(`create:${ip}`, config.maxEventsPerMinute, RATE_WINDOW_MS)) {
        recordMetric('rate_limited', { event: 'create_room' });
        ack?.(null, makeProtocolError('RATE_LIMITED', 'Too many requests. Please slow down.'));
        return;
      }
      // Hard server-owned room cap (MFP-06) — never raisable by a client.
      if (roomManager.roomCount() >= config.maxRooms) {
        recordMetric('capacity_rejected', { kind: 'rooms' });
        ack?.(null, makeProtocolError('SERVER_CAPACITY_REACHED', 'The server is at capacity. Please try again later.'));
        return;
      }
      // Mint an opaque, server-issued identity — independent of the socket id
      // and the display name — and bind it to this connection.
      const playerId = newPlayerId();
      let room;
      try {
        // Server-authoritative room size: the client-requested `maxPlayers` is
        // validated by the strict schema (2-4) before it reaches here, so any
        // value outside the range is already rejected. When omitted, RoomManager
        // defaults to two.
        room = roomManager.createRoom(
          playerId,
          options.playerName,
          socket.id,
          options.maxPlayers,
        );
      } catch (err) {
        throw translateRoomError(err);
      }

      socket.data.playerId = playerId;
      socket.data.playerName = options.playerName;
      socket.data.roomId = room.roomId;

      socket.join(room.roomId);
      // Never log the reconnect token — it is a signed credential.
      recordMetric('room_created');
      ack?.(issueSession(playerId, room));
    });
  });

  socket.on('join_room', (...args: unknown[]) => {
    guard('join_room', joinRoomSchema, args, socket, (options, ack) => {
      const ip = socket.handshake.address;
      // Throttle join attempts per IP — this is what bounds room-code
      // brute-force guessing (MFP-06).
      if (!rateLimiter.tryConsume(`join:${ip}`, config.maxEventsPerMinute, RATE_WINDOW_MS)) {
        recordMetric('rate_limited', { event: 'join_room' });
        ack?.(null, makeProtocolError('RATE_LIMITED', 'Too many requests. Please slow down.'));
        return;
      }
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
        recordMetric('reconnect_failure', { reason: 'invalid_token' });
        ack?.(null, makeProtocolError('SESSION_INVALID', 'Invalid or expired session.'));
        return;
      }

      const player = roomManager.getPlayer(options.roomId, options.playerId);
      const phase = roomManager.getPhase(options.roomId);
      // Resume only into a live session (lobby or active). A completed/abandoned
      // game — or an explicit leave that removed the player — is not resumable,
      // which is how an explicit leave "immediately invalidates" the session.
      if (!player || (phase !== 'LOBBY' && phase !== 'ACTIVE')) {
        recordMetric('reconnect_failure', { reason: 'not_resumable' });
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
      recordMetric('reconnect_success');
      logger.info('session resumed', { event: 'session_resumed', roomId: options.roomId, playerId: options.playerId });
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
      if (!roomId) return;
      if (!commandAllowed(socket, config)) {
        recordMetric('rate_limited', { event: 'play_cards' });
        socket.emit('error', 'Too many requests. Please slow down.');
        return;
      }
      handleGameAction(io, socket, roomId, 'play_cards', command, command.meta);
    });
  });

  socket.on('draw_card', (...args: unknown[]) => {
    guard('draw_card', optionalCommandMetaSchema, args, socket, (meta) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      if (!commandAllowed(socket, config)) {
        recordMetric('rate_limited', { event: 'draw_card' });
        socket.emit('error', 'Too many requests. Please slow down.');
        return;
      }
      handleGameAction(io, socket, roomId, 'draw_card', undefined, meta ?? undefined);
    });
  });

  socket.on('declare_last_card', (...args: unknown[]) => {
    guard('declare_last_card', optionalCommandMetaSchema, args, socket, (meta) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      if (!commandAllowed(socket, config)) {
        recordMetric('rate_limited', { event: 'declare_last_card' });
        socket.emit('error', 'Too many requests. Please slow down.');
        return;
      }
      handleGameAction(io, socket, roomId, 'declare_last_card', undefined, meta ?? undefined);
    });
  });

  socket.on('disconnect', (reason) => {
    logger.debug('client disconnected', { event: 'client_disconnected', socketId: socket.id, reason });

    // Free the connection-concurrency slot acquired at handshake (MFP-06).
    connectionTracker.release(socket.handshake.address);

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
export function createSocketServer(overrides: Partial<ServerConfig> = {}): SocketServer {
  // Validated configuration (MFP-07). `overrides` lets tests exercise tight
  // limits without mutating the environment. The CORS allow-list and all abuse
  // limits are server-owned; a client can never raise them (MFP-06).
  const config: ServerConfig = { ...loadConfig(), ...overrides };

  const app = express();
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '16kb' }));

  // Health / probes (MFP-09). Version + commit are surfaced for operability;
  // no secret is ever included.
  const healthInfo = () => ({
    status: 'ok',
    version: config.releaseVersion ?? null,
    commit: config.commitSha ?? null,
    timestamp: new Date().toISOString(),
  });

  app.get('/health', (_req, res) => {
    res.json(healthInfo());
  });

  // Liveness: the process is up. Independent of drain state.
  app.get('/livez', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Readiness: ready to accept work. Flips to 503 while draining so a load
  // balancer stops routing new traffic before shutdown.
  app.get('/readyz', (_req, res) => {
    if (isDraining()) {
      res.status(503).json({ status: 'draining' });
    } else {
      res.json({ ...healthInfo(), status: 'ready' });
    }
  });

  // Live gauges for the metrics snapshot (MFP-10).
  registerGauge('connected_sockets', () => connectionTracker.activeTotal);
  registerGauge('active_rooms', () => roomManager.roomCount());
  registerGauge('active_games', () => roomManager.activeGameCount());

  // Protected internal metrics endpoint (MFP-10). Requires the configured
  // token; when no token is set it is available in non-production only.
  app.get('/metrics', (req, res) => {
    if (config.metricsToken) {
      if (req.headers['x-metrics-token'] !== config.metricsToken) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
    } else if (config.isProduction) {
      res.status(404).end();
      return;
    }
    res.json(snapshotMetrics(config.releaseVersion));
  });

  const httpServer = createServer(app);

  const maxTotalConnections = config.maxRooms * MAX_MAX_PLAYERS; // up to MAX_MAX_PLAYERS per room

  const io: TypedServer = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    // Reject oversized frames at the transport (MFP-06).
    maxHttpBufferSize: MAX_HTTP_BUFFER_SIZE,
  });

  // Connection-level abuse controls (MFP-06): origin allow-list, per-IP
  // connection-attempt rate, and concurrency caps. Rejections surface as a
  // stable connect_error code and never leak internal configuration. We use the
  // socket's own remote address, not proxy headers, unless a trusted-proxy
  // setup is explicitly configured.
  io.use((socket, next) => {
    const ip = socket.handshake.address;
    const origin = socket.handshake.headers.origin;

    if (!isOriginAllowed(origin, config.corsOrigins)) {
      recordMetric('origin_rejected');
      next(new Error('ORIGIN_NOT_ALLOWED'));
      return;
    }
    if (!rateLimiter.tryConsume(`conn:${ip}`, CONNECTION_ATTEMPTS_PER_MINUTE, RATE_WINDOW_MS)) {
      recordMetric('rate_limited', { event: 'connection' });
      next(new Error('RATE_LIMITED'));
      return;
    }
    const acquired = connectionTracker.acquire(ip, maxTotalConnections, config.maxConnectionsPerIp);
    if (!acquired.ok) {
      recordMetric('connection_rejected', { reason: acquired.reason });
      next(new Error('SERVER_CAPACITY_REACHED'));
      return;
    }
    next();
  });

  io.on('connection', (socket) => registerHandlers(io, socket, config));

  return { app, httpServer, io };
}
