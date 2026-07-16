/**
 * @fileoverview Zustand session store for connection and session state management.
 * 
 * This store manages session-level state that persists across screen transitions,
 * including connection status, room information, and player identity.
 * 
 * Game state is NOT stored here - it remains server-authoritative in multiplayer
 * and is managed by the transport layer in single-player.
 * 
 * @module stores/sessionStore
 */

import { create } from 'zustand';
import type { PlayerSummary } from '../game/types';
import type { ConnectionStatus, RoomInfo, ResumeResult } from '../networking/types';

/**
 * Session state shape and actions.
 * 
 * State is divided into three categories:
 * - Connection state: WebSocket connection status
 * - Room/lobby state: Current room and player information
 * - Error state: Latest error message for display
 */
export interface SessionState {
  // ═══════════════════════════════════════════════════════════════════════════
  // Connection State
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Current connection status to the game server */
  connectionStatus: ConnectionStatus;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Room/Lobby State
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Current room ID (null if not in a room) */
  roomId: string | null;
  
  /** Local player's opaque, server-issued identifier (never the display name) */
  playerId: string | null;

  /** Local player's display name */
  playerName: string | null;

  /**
   * Signed, room-scoped reconnect token issued by the server (MFP-03).
   * Treated as a secret. Durable secure persistence is completed in MFP-04.
   */
  reconnectToken: string | null;
  
  /** List of players in the current room */
  players: PlayerSummary[];
  
  /** Whether the local player is the room host */
  isHost: boolean;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Error State
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Latest error message (null if no error) */
  error: string | null;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Update the connection status */
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  /** Set the current room (or clear it with null) */
  setRoom: (room: RoomInfo | null) => void;
  
  /** Set the local player's ID */
  setPlayerId: (playerId: string) => void;

  /** Set the local player's display name */
  setPlayerName: (name: string) => void;

  /** Set or clear the reconnect token */
  setReconnectToken: (token: string | null) => void;
  
  /** Set or clear the error message */
  setError: (error: string | null) => void;
  
  /** Update the player list */
  updatePlayers: (players: PlayerSummary[]) => void;

  /**
   * Reconcile session state from an authoritative resume snapshot (MFP-04):
   * restores identity, room, players, host status, and the rotated token, and
   * marks the connection usable again.
   */
  applyResume: (result: ResumeResult) => void;

  /** Reset all state to initial values */
  reset: () => void;
}

/**
 * Initial state values.
 * Used for initialization and reset.
 */
const initialState = {
  connectionStatus: 'disconnected' as ConnectionStatus,
  roomId: null,
  playerId: null,
  playerName: null,
  reconnectToken: null,
  players: [],
  isHost: false,
  error: null,
};

/**
 * Session store hook for managing connection and lobby state.
 * 
 * @example
 * ```typescript
 * // In a React component
 * function LobbyScreen() {
 *   const { connectionStatus, players, isHost } = useSessionStore();
 *   const { setRoom, setError } = useSessionStore();
 *   
 *   // State is reactive - component re-renders on changes
 *   return (
 *     <View>
 *       <Text>Status: {connectionStatus}</Text>
 *       <PlayerList players={players} />
 *       {isHost && <StartButton />}
 *     </View>
 *   );
 * }
 * 
 * // Outside React (e.g., in transport callbacks)
 * const { setConnectionStatus } = useSessionStore.getState();
 * setConnectionStatus('connected');
 * ```
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  setConnectionStatus: (status) =>
    set({ connectionStatus: status }),

  setRoom: (room) => {
    const state = get();
    // Host is determined by stable opaque identity only — never the display
    // name. A renamed player can never gain host permissions (MFP-03).
    const isHost = room ? room.hostId === state.playerId : false;

    set(room ? {
      roomId: room.roomId,
      players: room.players,
      isHost,
    } : {
      roomId: null,
      players: [],
      isHost: false,
    });
  },

  setPlayerId: (playerId) =>
    set({ playerId }),

  setPlayerName: (name) =>
    set({ playerName: name }),

  setReconnectToken: (token) =>
    set({ reconnectToken: token }),

  setError: (error) =>
    set({ error }),

  updatePlayers: (players) =>
    set({ players }),

  applyResume: (result) =>
    set({
      roomId: result.room.roomId,
      playerId: result.playerId,
      players: result.room.players,
      // Host is decided by stable opaque identity only (MFP-03).
      isHost: result.room.hostId === result.playerId,
      reconnectToken: result.reconnectToken,
      connectionStatus: 'connected',
      error: null,
    }),

  reset: () =>
    set(initialState),
}));
