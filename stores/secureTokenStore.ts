/**
 * @fileoverview Persistent storage for the reconnect session (MFP-04).
 *
 * Stores the opaque `playerId`, `roomId`, and signed `reconnectToken` so a
 * client can resume its session after the app is backgrounded or the transport
 * drops. Backed by AsyncStorage, which works on both native and web and is
 * already a project dependency.
 *
 * SECURITY: the reconnect token is a bearer credential. It is never placed in an
 * `EXPO_PUBLIC_` environment variable and never logged. Production hardening
 * should swap the native backend for `expo-secure-store` (encrypted at rest);
 * this module's surface is deliberately tiny so that is a single-file change.
 *
 * @module stores/secureTokenStore
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Storage key (versioned so the shape can evolve safely). */
const STORAGE_KEY = 'mp.reconnectSession.v1';

/** The persisted reconnect session. */
export interface StoredSession {
  /** Opaque, server-issued player identity. */
  playerId: string;
  /** Room the session belongs to. */
  roomId: string;
  /** Signed reconnect token (bearer credential — treat as a secret). */
  reconnectToken: string;
}

/** Persist the reconnect session. Best-effort: storage failures are swallowed. */
export async function saveSession(session: StoredSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Persistence is best-effort; a failure just means resume is unavailable.
  }
}

/** Load the persisted reconnect session, or null if absent/corrupt. */
export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StoredSession).playerId === 'string' &&
      typeof (parsed as StoredSession).roomId === 'string' &&
      typeof (parsed as StoredSession).reconnectToken === 'string'
    ) {
      return parsed as StoredSession;
    }
    return null;
  } catch {
    return null;
  }
}

/** Remove any persisted reconnect session (e.g. on explicit leave). */
export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort.
  }
}
