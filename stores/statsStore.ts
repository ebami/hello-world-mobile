/**
 * @fileoverview Zustand stats store with AsyncStorage persistence.
 *
 * Tracks player game statistics across sessions including wins, losses,
 * streaks, and play history by difficulty level.
 *
 * Note: Persistence is disabled on web due to zustand/middleware using
 * import.meta which is not supported by Metro bundler for web.
 *
 * @module stores/statsStore
 */

import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { Platform } from 'react-native';
import type { Difficulty } from '../game/ai';

/**
 * Statistics for a specific difficulty level.
 */
export interface DifficultyStats {
  played: number;
  wins: number;
}

/**
 * Complete player statistics schema.
 */
export interface PlayerStats {
  /** Total number of games played */
  gamesPlayed: number;
  /** Total wins */
  wins: number;
  /** Total losses */
  losses: number;
  /** Stats broken down by difficulty */
  byDifficulty: {
    easy: DifficultyStats;
    medium: DifficultyStats;
    hard: DifficultyStats;
  };
  /** Current consecutive win streak */
  currentWinStreak: number;
  /** Best win streak ever achieved */
  bestWinStreak: number;
  /** Total cards played across all games */
  totalCardsPlayed: number;
  /** ISO timestamp of last game played */
  lastPlayed: string | null;
}

/**
 * Store state and actions.
 */
export interface StatsState extends PlayerStats {
  /**
   * Record the outcome of a completed game.
   * @param won - Whether the player won
   * @param difficulty - Difficulty level of the game
   * @param cardsPlayed - Number of cards the player played
   */
  recordGameResult: (won: boolean, difficulty: Difficulty, cardsPlayed: number) => void;

  /**
   * Reset all statistics to initial values.
   */
  resetStats: () => void;

  /**
   * Calculate the win rate as a percentage (0-100).
   */
  getWinRate: () => number;

  /**
   * Get win rate for a specific difficulty level.
   * @param difficulty - Difficulty level to check
   */
  getDifficultyWinRate: (difficulty: Difficulty) => number;
}

/**
 * Initial statistics state.
 */
const initialStats: PlayerStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  byDifficulty: {
    easy: { played: 0, wins: 0 },
    medium: { played: 0, wins: 0 },
    hard: { played: 0, wins: 0 },
  },
  currentWinStreak: 0,
  bestWinStreak: 0,
  totalCardsPlayed: 0,
  lastPlayed: null,
};

/**
 * Stats store hook with AsyncStorage persistence.
 *
 * @example
 * ```tsx
 * const { wins, losses, recordGameResult } = useStatsStore();
 *
 * // Record a win
 * recordGameResult(true, 'medium', 15);
 *
 * // Get win rate
 * const winRate = useStatsStore.getState().getWinRate();
 * ```
 */

/**
 * Store creator function - shared logic for both persisted and non-persisted stores.
 */
const createStatsSlice: StateCreator<StatsState> = (set, get) => ({
  ...initialStats,

  recordGameResult: (won: boolean, difficulty: Difficulty, cardsPlayed: number) => {
    set((state) => {
      const newWins = won ? state.wins + 1 : state.wins;
      const newLosses = won ? state.losses : state.losses + 1;
      const newCurrentStreak = won ? state.currentWinStreak + 1 : 0;
      const newBestStreak = Math.max(state.bestWinStreak, newCurrentStreak);

      const newByDifficulty = { ...state.byDifficulty };
      newByDifficulty[difficulty] = {
        played: state.byDifficulty[difficulty].played + 1,
        wins: state.byDifficulty[difficulty].wins + (won ? 1 : 0),
      };

      return {
        gamesPlayed: state.gamesPlayed + 1,
        wins: newWins,
        losses: newLosses,
        byDifficulty: newByDifficulty,
        currentWinStreak: newCurrentStreak,
        bestWinStreak: newBestStreak,
        totalCardsPlayed: state.totalCardsPlayed + cardsPlayed,
        lastPlayed: new Date().toISOString(),
      };
    });
  },

  resetStats: () => {
    set(initialStats);
  },

  getWinRate: () => {
    const { gamesPlayed, wins } = get();
    if (gamesPlayed === 0) return 0;
    return Math.round((wins / gamesPlayed) * 100);
  },

  getDifficultyWinRate: (difficulty: Difficulty) => {
    const { byDifficulty } = get();
    const stats = byDifficulty[difficulty];
    if (stats.played === 0) return 0;
    return Math.round((stats.wins / stats.played) * 100);
  },
});

/**
 * Create the store - use persistence only on native platforms.
 * Web doesn't support zustand/middleware due to import.meta usage.
 */
function createStore() {
  if (Platform.OS === 'web') {
    // Web: Create store without persistence
    return create<StatsState>()(createStatsSlice);
  }
  
  // Native: Create store with AsyncStorage persistence
  // Dynamic import to avoid loading middleware on web
  const { persist, createJSONStorage } = require('zustand/middleware');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  return create<StatsState>()(
    persist(createStatsSlice, {
      name: 'blackjack-stats',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: PlayerStats) => ({
        gamesPlayed: state.gamesPlayed,
        wins: state.wins,
        losses: state.losses,
        byDifficulty: state.byDifficulty,
        currentWinStreak: state.currentWinStreak,
        bestWinStreak: state.bestWinStreak,
        totalCardsPlayed: state.totalCardsPlayed,
        lastPlayed: state.lastPlayed,
      }),
    })
  );
}

const useStatsStore = createStore();

export { useStatsStore };
export default useStatsStore;
