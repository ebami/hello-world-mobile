/**
 * @fileoverview Socket.IO transport adapter implementing GameTransport interface.
 * 
 * Provides real-time multiplayer communication via Socket.IO, including
 * room management, game actions, and server event handling.
 * 
 * @module networking/socketTransport
 */

import type {
  GameTransport,
  GameAction,
  TransportCallbacks,
  ConnectionStatus,
  RoomInfo,
  CreateRoomOptions,
  JoinRoomOptions,
} from './types';
import { createSocket, disconnectSocket, type TypedSocket } from './socket';

/**
 * Socket.IO transport adapter for online multiplayer.
 * 
 * Implements the GameTransport interface using Socket.IO for real-time
 * communication with the game server.
 * 
 * @example
 * ```typescript
 * const transport = new SocketTransport('http://game-server.com:3001');
 * 
 * transport.setCallbacks({
 *   onConnectionChange: (status) => console.log('Status:', status),
 *   onStateUpdate: (state) => updateGameUI(state),
 *   onError: (error) => showError(error),
 * });
 * 
 * await transport.connect();
 * const room = await transport.createRoom({ playerName: 'Alice' });
 * transport.startGame();
 * transport.sendAction({ type: 'PLAY_CARDS', cards: [card] });
 * ```
 */
export class SocketTransport implements GameTransport {
  private socket: TypedSocket | null = null;
  private callbacks: Partial<TransportCallbacks> = {};
  private connectionStatus: ConnectionStatus = 'disconnected';
  private readonly serverUrl: string;

  /**
   * Create a new SocketTransport instance.
   * @param serverUrl - Server URL to connect to (default: localhost:3001)
   */
  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl ?? 'http://localhost:3001';
  }

  /**
   * Connect to the game server.
   * @returns Promise that resolves when connected
   * @throws Error if connection fails
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.updateConnectionStatus('connecting');
      
      this.socket = createSocket({ serverUrl: this.serverUrl, autoConnect: false });
      
      const onConnect = () => {
        this.updateConnectionStatus('connected');
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        resolve();
      };

      const onError = (error: Error) => {
        this.updateConnectionStatus('disconnected');
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        reject(error);
      };

      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onError);
      
      // Set up persistent event handlers
      this.setupEventHandlers();
      
      this.socket.connect();
    });
  }

  disconnect(): void {
    disconnectSocket();
    this.socket = null;
    this.updateConnectionStatus('disconnected');
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.callbacks.onConnectionChange?.(status);
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('disconnect', () => {
      this.updateConnectionStatus('disconnected');
    });

    this.socket.io.on('reconnect', () => {
      this.updateConnectionStatus('connected');
    });

    this.socket.on('game_state_update', (state) => {
      this.callbacks.onStateUpdate?.(state);
    });

    this.socket.on('hand_update', (payload) => {
      this.callbacks.onHandUpdate?.(payload);
    });

    this.socket.on('room_updated', (room) => {
      this.callbacks.onRoomUpdated?.(room);
    });

    this.socket.on('game_start', (state, hand) => {
      this.callbacks.onGameStart?.(state, hand);
    });

    this.socket.on('game_over', (winnerId, message) => {
      this.callbacks.onGameOver?.(winnerId, message);
    });

    this.socket.on('player_action', (playerId, action) => {
      this.callbacks.onPlayerAction?.(playerId, action);
    });

    this.socket.on('error', (message) => {
      this.callbacks.onError?.(message);
    });
  }

  async createRoom(options: CreateRoomOptions): Promise<RoomInfo> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('create_room', options, (room, error) => {
        if (error || !room) {
          reject(new Error(error ?? 'Failed to create room'));
        } else {
          resolve(room);
        }
      });
    });
  }

  async joinRoom(options: JoinRoomOptions): Promise<RoomInfo> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('join_room', options, (room, error) => {
        if (error || !room) {
          reject(new Error(error ?? 'Failed to join room'));
        } else {
          resolve(room);
        }
      });
    });
  }

  leaveRoom(): void {
    this.socket?.emit('leave_room');
  }

  startGame(): void {
    this.socket?.emit('start_game');
  }

  sendAction(action: GameAction): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.('Not connected to server');
      return;
    }

    switch (action.type) {
      case 'PLAY_CARDS':
        this.socket.emit('play_cards', action.cards);
        break;
      case 'DRAW_CARD':
        this.socket.emit('draw_card');
        break;
      case 'DECLARE_LAST_CARD':
        this.socket.emit('declare_last_card');
        break;
    }
  }

  setCallbacks(callbacks: Partial<TransportCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}
