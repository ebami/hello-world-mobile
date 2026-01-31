/**
 * @fileoverview Tests for Socket.IO connection utility.
 */

// Mock react-native-url-polyfill before imports
jest.mock('react-native-url-polyfill/auto', () => ({}));

import { io } from 'socket.io-client';
import { createSocket, getSocket, disconnectSocket } from '../../networking/socket';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    id: 'mock-socket-id',
    io: {
      on: jest.fn(),
    },
  })),
}));

// Mock __DEV__ global
(global as unknown as { __DEV__: boolean }).__DEV__ = false;

describe('socket', () => {
  const mockIo = io as jest.MockedFunction<typeof io>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton by disconnecting
    disconnectSocket();
  });

  describe('createSocket', () => {
    it('should create a socket with default options', () => {
      const socket = createSocket();

      expect(mockIo).toHaveBeenCalledWith('http://localhost:3001', {
        autoConnect: false,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      expect(socket).toBeDefined();
    });

    it('should create a socket with custom server URL', () => {
      createSocket({ serverUrl: 'http://custom-server.com:8080' });

      expect(mockIo).toHaveBeenCalledWith(
        'http://custom-server.com:8080',
        expect.any(Object)
      );
    });

    it('should create a socket with autoConnect enabled', () => {
      createSocket({ autoConnect: true });

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ autoConnect: true })
      );
    });

    it('should disconnect existing socket before creating new one', () => {
      const firstSocket = createSocket();
      const disconnectMock = firstSocket.disconnect as jest.Mock;

      createSocket();

      expect(disconnectMock).toHaveBeenCalled();
    });
  });

  describe('getSocket', () => {
    it('should return null when no socket exists', () => {
      expect(getSocket()).toBeNull();
    });

    it('should return the socket after creation', () => {
      const socket = createSocket();
      expect(getSocket()).toBe(socket);
    });
  });

  describe('disconnectSocket', () => {
    it('should disconnect and clear the socket', () => {
      const socket = createSocket();
      const disconnectMock = socket.disconnect as jest.Mock;

      disconnectSocket();

      expect(disconnectMock).toHaveBeenCalled();
      expect(getSocket()).toBeNull();
    });

    it('should do nothing when no socket exists', () => {
      // Should not throw
      expect(() => disconnectSocket()).not.toThrow();
    });
  });

  describe('development logging', () => {
    it('should set up debug logging in development mode', () => {
      (global as unknown as { __DEV__: boolean }).__DEV__ = true;

      const socket = createSocket();
      const onMock = socket.on as jest.Mock;

      // Should have registered connect and disconnect handlers
      expect(onMock).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('disconnect', expect.any(Function));

      (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    });
  });
});
