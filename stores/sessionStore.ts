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
import type { ConnectionStatus, RoomInfo } from '../networking/types';

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
  
  /** Local player's unique identifier */
  playerId: string | null;
  
  /** Local player's display name */
  playerName: string | null;
  
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
  
  /** Set or clear the error message */
  setError: (error: string | null) => void;
  
  /** Update the player list */
  updatePlayers: (players: PlayerSummary[]) => void;
  
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

  setRoom: (room) =>
    set(room ? {
      roomId: room.roomId,
      players: room.players,
      isHost: room.hostId === get().playerId,
    } : {
      roomId: null,
      players: [],
      isHost: false,
    }),

  setPlayerId: (playerId) =>
    set({ playerId }),

  setPlayerName: (name) =>
    set({ playerName: name }),

  setError: (error) =>
    set({ error }),

  updatePlayers: (players) =>
    set({ players }),

  reset: () =>
    set(initialState),
}));
