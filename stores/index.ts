/**
 * @fileoverview Stores module exports.
 * 
 * Provides Zustand-based state management for session and connection state.
 * 
 * @module stores
 */

export { useSessionStore, type SessionState } from './sessionStore';
export { useStatsStore, type PlayerStats, type StatsState, type DifficultyStats } from './statsStore';
