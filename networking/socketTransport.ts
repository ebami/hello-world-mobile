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
  RoomSession,
  ResumeResult,
  CommandMetadata,
  CreateRoomOptions,
  JoinRoomOptions,
} from './types';
import { createSocket, disconnectSocket, type TypedSocket } from './socket';
import {
  saveSession,
  loadSession,
  clearSession,
  type StoredSession,
} from '../stores/secureTokenStore';

/** Generate a unique-enough command id for idempotency keys (MFP-04). */
function newCommandId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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
  /** Current session identity + reconnect token (MFP-04); null until create/join. */
  private session: StoredSession | null = null;
  /**
   * Latest known authoritative state version (MFP-04), echoed back on every
   * mutating command as `expectedStateVersion` for optimistic concurrency.
   */
  private stateVersion = 0;

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
    // An explicit disconnect (e.g. quitting) ends the session; drop the
    // persisted token so it cannot be resumed.
    this.session = null;
    void clearSession();
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

    // A transport reconnect is NOT yet a usable session (MFP-04). Report
    // 'connecting' and attempt to resume; only a successful resume returns the
    // status to 'connected'.
    this.socket.io.on('reconnect', () => {
      this.updateConnectionStatus('connecting');
      void this.attemptResume();
    });

    this.socket.on('game_state_update', (state) => {
      if (typeof state.stateVersion === 'number') {
        this.stateVersion = state.stateVersion;
      }
      this.callbacks.onStateUpdate?.(state);
    });

    this.socket.on('hand_update', (payload) => {
      this.callbacks.onHandUpdate?.(payload);
    });

    this.socket.on('room_updated', (room) => {
      this.callbacks.onRoomUpdated?.(room);
    });

    this.socket.on('game_start', (state, hand) => {
      if (typeof state.stateVersion === 'number') {
        this.stateVersion = state.stateVersion;
      }
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

  async createRoom(options: CreateRoomOptions): Promise<RoomSession> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('create_room', options, (session, error) => {
        if (error || !session) {
          reject(new Error(error?.message ?? 'Failed to create room'));
        } else {
          this.rememberSession(session);
          resolve(session);
        }
      });
    });
  }

  async joinRoom(options: JoinRoomOptions): Promise<RoomSession> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.log('[SocketTransport] joinRoom failed: not connected');
        reject(new Error('Not connected to server'));
        return;
      }

      console.log('[SocketTransport] Sending join_room:', options);
      // Never log the session — it carries a signed reconnect token.
      this.socket.emit('join_room', options, (session, error) => {
        if (error || !session) {
          console.log('[SocketTransport] joinRoom error:', error?.code);
          reject(new Error(error?.message ?? 'Failed to join room'));
        } else {
          console.log('[SocketTransport] joinRoom success:', session.room.roomId);
          this.rememberSession(session);
          resolve(session);
        }
      });
    });
  }

  /**
   * Record and persist the session credentials from a create/join/resume
   * result so the session can be recovered after a transport drop (MFP-04).
   * The lobby has no game state yet, so the version resets to 0.
   */
  private rememberSession(session: {
    playerId: string;
    room: { roomId: string };
    reconnectToken: string;
  }): void {
    this.session = {
      playerId: session.playerId,
      roomId: session.room.roomId,
      reconnectToken: session.reconnectToken,
    };
    this.stateVersion = 0;
    void saveSession(this.session);
  }

  /**
   * Attempt to resume the session after a transport reconnect (MFP-04). Uses the
   * in-memory session, falling back to persisted storage (e.g. after an app
   * restart). On success the rotated token is persisted, local version tracking
   * is restored, and the authoritative snapshot is delivered via callbacks so
   * the UI reconciles; only then is the status reported 'connected'. On failure
   * the caller is notified and the stale session is cleared.
   */
  private async attemptResume(): Promise<void> {
    const stored = this.session ?? (await loadSession());
    if (!stored || !this.socket) {
      // Nothing to resume (e.g. reconnected before ever joining).
      this.updateConnectionStatus('connected');
      return;
    }

    this.socket.emit(
      'resume_session',
      {
        roomId: stored.roomId,
        playerId: stored.playerId,
        reconnectToken: stored.reconnectToken,
      },
      (result, error) => {
        if (error || !result) {
          // Session could not be recovered; drop it and surface the failure.
          this.session = null;
          void clearSession();
          this.callbacks.onError?.(error?.message ?? 'Could not resume session');
          this.updateConnectionStatus('disconnected');
          return;
        }

        // Rotate + persist the new token, restore version tracking.
        this.rememberSession(result);
        this.stateVersion = result.stateVersion;

        // Reconcile the UI from the authoritative snapshot.
        if (result.state) {
          this.callbacks.onStateUpdate?.(result.state);
        }
        if (result.hand) {
          this.callbacks.onHandUpdate?.(result.hand);
        }
        this.callbacks.onRoomUpdated?.(result.room);
        this.callbacks.onSessionResumed?.(result);

        // Only now is the session usable again.
        this.updateConnectionStatus('connected');
      },
    );
  }

  /**
   * Explicitly resume a session (e.g. on app launch with a persisted token).
   * Resolves with the authoritative snapshot or rejects if the session is no
   * longer valid.
   */
  async resumeSession(stored: StoredSession): Promise<ResumeResult> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }
      this.socket.emit(
        'resume_session',
        {
          roomId: stored.roomId,
          playerId: stored.playerId,
          reconnectToken: stored.reconnectToken,
        },
        (result, error) => {
          if (error || !result) {
            reject(new Error(error?.message ?? 'Could not resume session'));
          } else {
            this.rememberSession(result);
            this.stateVersion = result.stateVersion;
            resolve(result);
          }
        },
      );
    });
  }

  leaveRoom(): void {
    this.socket?.emit('leave_room');
    // Explicit leave invalidates the session server-side; drop it locally too.
    this.session = null;
    void clearSession();
  }

  startGame(): void {
    this.socket?.emit('start_game');
  }

  sendAction(action: GameAction): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.('Not connected to server');
      return;
    }

    // Attach idempotency + version metadata to every mutating command (MFP-04):
    // a fresh command id lets the server discard duplicates (e.g. a retry after
    // reconnect), and the current state version guards against acting on stale
    // state.
    const meta: CommandMetadata = {
      commandId: newCommandId(),
      expectedStateVersion: this.stateVersion,
    };

    switch (action.type) {
      case 'PLAY_CARDS':
        // Send only card IDs + the declared suit — never card rank/suit. The
        // server resolves IDs against the player's authoritative hand.
        this.socket.emit('play_cards', {
          cardIds: action.cards.map((c) => c.id),
          declaredSuit: action.declaredSuit,
          meta,
        });
        break;
      case 'DRAW_CARD':
        this.socket.emit('draw_card', meta);
        break;
      case 'DECLARE_LAST_CARD':
        this.socket.emit('declare_last_card', meta);
        break;
    }
  }

  setCallbacks(callbacks: Partial<TransportCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}
