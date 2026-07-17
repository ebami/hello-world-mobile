/**
 * @fileoverview Process lifecycle / readiness state (MFP-09).
 *
 * Tracks whether the instance is draining for a graceful shutdown. Readiness
 * (`/readyz`) reflects this, and new-room creation is refused while draining so
 * a rolling deploy stops taking on work before the process exits. Kept as a
 * tiny module so both the HTTP endpoints and the Socket.IO handlers can read a
 * single source of truth.
 *
 * @module server/serverLifecycle
 */

let draining = false;

/** Whether the instance is draining (shutting down); readiness is false. */
export function isDraining(): boolean {
  return draining;
}

/** Enter the draining state (idempotent). */
export function beginDrain(): void {
  draining = true;
}

/** Reset lifecycle state (tests). */
export function resetLifecycle(): void {
  draining = false;
}
