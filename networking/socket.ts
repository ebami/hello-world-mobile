/**
 * @fileoverview Socket.IO connection utility with reconnection handling and event typing.
 * 
 * Provides a singleton socket instance with automatic reconnection and
 * development-mode logging. Uses WebSocket transport for React Native compatibility.
 * 
 * @module networking/socket
 */

import 'react-native-url-polyfill/auto';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from './types';

/** Default server URL when none is provided */
const DEFAULT_SERVER_URL = 'http://localhost:3001';

/**
 * Type-safe Socket.IO socket with event typing.
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Singleton socket instance */
let socket: TypedSocket | null = null;

/**
 * Options for creating a socket connection.
 */
export interface SocketOptions {
  /** Server URL to connect to (default: localhost:3001) */
  serverUrl?: string;
  /** Whether to connect immediately (default: false) */
  autoConnect?: boolean;
}

/**
 * Create a new Socket.IO connection.
 * 
 * Disconnects any existing socket before creating a new one.
 * The socket is configured with:
 * - WebSocket transport only (for React Native)
 * - Automatic reconnection (5 attempts)
 * - Exponential backoff (1-5 seconds)
 * - 10 second connection timeout
 * 
 * @param options - Socket configuration options
 * @returns The created socket instance
 * 
 * @example
 * ```typescript
 * const socket = createSocket({ serverUrl: 'http://game-server.com:3001' });
 * socket.connect();
 * ```
 */
export function createSocket(options: SocketOptions = {}): TypedSocket {
  const { serverUrl = DEFAULT_SERVER_URL, autoConnect = false } = options;

  if (socket) {
    socket.disconnect();
  }

  socket = io(serverUrl, {
    autoConnect,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // Debug logging in development
  if (__DEV__) {
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error.message);
    });

    socket.io.on('reconnect', (attempt) => {
      console.log('[Socket] Reconnected after', attempt, 'attempts');
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log('[Socket] Reconnection attempt', attempt);
    });

    socket.io.on('reconnect_failed', () => {
      console.log('[Socket] Reconnection failed');
    });
  }

  return socket;
}

/**
 * Get the current socket instance, if one exists.
 * @returns The current socket or null if not created
 */
export function getSocket(): TypedSocket | null {
  return socket;
}

/**
 * Disconnect and destroy the current socket instance.
 * Safe to call even if no socket exists.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
