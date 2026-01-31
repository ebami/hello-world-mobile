// Zustand session store for connection/session state management
import { create } from 'zustand';
import type { PlayerSummary } from '../game/types';
import type { ConnectionStatus, RoomInfo } from '../networking/types';

export interface SessionState {
  // Connection state
  connectionStatus: ConnectionStatus;
  
  // Room/lobby state
  roomId: string | null;
  playerId: string | null;
  playerName: string | null;
  players: PlayerSummary[];
  isHost: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRoom: (room: RoomInfo | null) => void;
  setPlayerId: (playerId: string) => void;
  setPlayerName: (name: string) => void;
  setError: (error: string | null) => void;
  updatePlayers: (players: PlayerSummary[]) => void;
  reset: () => void;
}

const initialState = {
  connectionStatus: 'disconnected' as ConnectionStatus,
  roomId: null,
  playerId: null,
  playerName: null,
  players: [],
  isHost: false,
  error: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setConnectionStatus: (status) =>
    set({ connectionStatus: status }),

  setRoom: (room) =>
    set(room ? {
      roomId: room.roomId,
      players: room.players,
      isHost: room.hostId === (room.players.find(p => !p.isBot)?.playerId ?? null),
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
