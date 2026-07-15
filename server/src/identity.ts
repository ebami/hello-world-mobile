/**
 * @fileoverview Server-issued player identity.
 *
 * Every player gets an opaque, unguessable identifier that is independent of
 * their display name and of any socket id. This identifier — not the name and
 * not the connection — is the sole basis for membership and authorization
 * (MFP-03). Keeping issuance behind a named function makes the identity source
 * trivial to audit and to swap (e.g. for a prefixed or namespaced scheme) later.
 *
 * The player↔socket mapping itself lives in {@link module:server/roomManager}
 * (per-room `playerId → socketId`), which is already the authoritative source
 * for "which socket currently speaks for this player" used by authorization and
 * targeted emits. It is deliberately not duplicated here to avoid drift.
 *
 * @module server/identity
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a fresh, opaque player id. Uses a v4 UUID: unguessable and globally
 * unique, so two players sharing a display name (even in the same room) always
 * receive distinct identities.
 */
export function newPlayerId(): string {
  return uuidv4();
}
