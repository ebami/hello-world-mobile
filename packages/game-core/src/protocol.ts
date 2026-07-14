/**
 * @fileoverview Shared Socket.IO protocol error contract.
 *
 * Both the server and client agree on a structured error shape so that
 * failures carry a stable, machine-readable `code` alongside a safe,
 * user-displayable `message`. Servers must never place internal diagnostic
 * detail (stack traces, raw payloads) into `message`.
 *
 * @module @hello-world/game-core/protocol
 */

/**
 * Stable, machine-readable protocol error codes.
 *
 * Codes are part of the wire contract: clients may branch on them. Add new
 * codes here (never repurpose an existing one) as later stories introduce
 * new failure modes (e.g. rate limiting, capacity — MFP-06).
 */
export type ProtocolErrorCode =
  | "INVALID_PAYLOAD"
  | "INTERNAL_ERROR"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "GAME_ALREADY_STARTED"
  | "NAME_TAKEN";

/**
 * Structured error returned through Socket.IO acknowledgement callbacks.
 * `message` is always safe to display to an end user.
 */
export interface ProtocolError {
  /** Stable machine-readable identifier for the failure. */
  code: ProtocolErrorCode;
  /** Safe, user-displayable description. Never contains internal detail. */
  message: string;
}

/** Construct a {@link ProtocolError}. */
export function makeProtocolError(
  code: ProtocolErrorCode,
  message: string,
): ProtocolError {
  return { code, message };
}
