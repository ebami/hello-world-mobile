// Socket.IO connection utility with reconnection handling and event typing
import 'react-native-url-polyfill/auto';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from './types';

// Default server URL - can be overridden
const DEFAULT_SERVER_URL = 'http://localhost:3001';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export interface SocketOptions {
  serverUrl?: string;
  autoConnect?: boolean;
}

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

export function getSocket(): TypedSocket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
