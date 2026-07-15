/**
 * @fileoverview Reusable, crash-safe wrapper for Socket.IO event handlers.
 *
 * Untrusted clients can send anything: a `null` payload, a wrong primitive,
 * extra arguments, a missing acknowledgement callback, or a non-function where
 * a callback is expected. {@link guard} contains all of that so a single
 * malformed event can never terminate the process:
 *
 *  - the payload is treated as `unknown` and validated *before* any field read;
 *  - the acknowledgement callback is optional and invoked at most once;
 *  - synchronous and asynchronous handler errors are caught;
 *  - failures return a structured {@link ProtocolError} with a stable code and
 *    a safe display message — never the raw payload or a stack trace.
 *
 * @module server/validation/validatedHandler
 */

import type { ZodType, ZodError } from 'zod';
import type {
  RoomSession,
  ProtocolError,
  ProtocolErrorCode,
} from '@hello-world/game-core';
import { makeProtocolError } from '@hello-world/game-core';
import type { TypedSocket } from '../types';

/**
 * Shape of the acknowledgement callback for room events. Success returns a
 * {@link RoomSession} (room + opaque identity + reconnect token); failure
 * returns `null` plus a {@link ProtocolError}.
 */
export type RoomAck = (session: RoomSession | null, error?: ProtocolError) => void;

/**
 * Error carrying a client-safe {@link ProtocolError}. Handlers throw this for
 * *expected* domain failures (e.g. room full); {@link guard} forwards the
 * embedded error to the client verbatim. Anything else that throws is treated
 * as an unexpected internal error and hidden behind a generic message.
 */
export class ProtocolErrorException extends Error {
  constructor(public readonly error: ProtocolError) {
    super(error.message);
    this.name = 'ProtocolErrorException';
  }
}

/** Convenience constructor for a thrown domain error. */
export function domainError(
  code: ProtocolErrorCode,
  message: string,
): ProtocolErrorException {
  return new ProtocolErrorException(makeProtocolError(code, message));
}

/**
 * Map a known `RoomManager` error message to a thrown {@link ProtocolError}.
 * Unknown errors are returned as-is so {@link guard} logs them and replies
 * with a generic `INTERNAL_ERROR` — never leaking internal detail.
 */
export function translateRoomError(error: unknown): unknown {
  const message = error instanceof Error ? error.message : '';
  switch (message) {
    case 'Room is full':
      return domainError('ROOM_FULL', 'This room is full.');
    case 'Game already started':
      return domainError('GAME_ALREADY_STARTED', 'The game has already started.');
    case 'Name already taken in this room':
      return domainError('NAME_TAKEN', 'That name is already taken in this room.');
    default:
      return error;
  }
}

/**
 * Wrap a callback so it can be invoked at most once. Preserves call arity: a
 * success `ack(room)` must not forward a trailing `undefined`, because
 * Socket.IO serializes that to `null` on the wire and the client would then
 * see a truthy-ish `error` of `null` instead of a clean success.
 */
function once(fn: RoomAck): RoomAck {
  let called = false;
  return (...args: Parameters<RoomAck>) => {
    if (called) return;
    called = true;
    fn(...args);
  };
}

/** Summarize which fields failed validation — names only, never values. */
function summarizeIssues(error: ZodError): string {
  const paths = error.issues.map((issue) =>
    issue.path.length > 0 ? issue.path.join('.') : '(root)',
  );
  return Array.from(new Set(paths)).join(', ');
}

/**
 * Register-time context: the raw arguments Socket.IO delivered for one event.
 * The last argument is treated as the acknowledgement callback only when it is
 * actually a function.
 */
function extractArgs(args: unknown[]): {
  payload: unknown;
  ack: RoomAck | undefined;
} {
  const last = args.length > 0 ? args[args.length - 1] : undefined;
  const rawAck = typeof last === 'function' ? (last as RoomAck) : undefined;
  const ack = rawAck ? once(rawAck) : undefined;
  // Payload is the first positional argument, unless the only argument was the
  // callback itself (client sent an ack but no payload).
  const payload =
    args.length === 0 || (rawAck && args.length === 1) ? undefined : args[0];
  return { payload, ack };
}

/**
 * Validate and safely run a Socket.IO event handler.
 *
 * @param event   Event name — used for logging and error messages only.
 * @param schema  Zod schema for the payload, or `null` for no-payload events.
 * @param args    Raw arguments as delivered by Socket.IO (treated as unknown).
 * @param socket  The typed socket (used to emit `error` when no ack exists).
 * @param run     The actual handler, receiving the validated payload and the
 *                (optional, once-guarded) acknowledgement callback.
 */
export function guard<T>(
  event: string,
  schema: ZodType<T> | null,
  args: unknown[],
  socket: TypedSocket,
  run: (payload: T, ack: RoomAck | undefined) => void | Promise<void>,
): void {
  const { payload, ack } = extractArgs(args);

  const fail = (error: ProtocolError): void => {
    if (ack) {
      ack(null, error);
    } else {
      socket.emit('error', error.message);
    }
  };

  const handleUnexpected = (err: unknown): void => {
    if (err instanceof ProtocolErrorException) {
      fail(err.error);
      return;
    }
    // Full detail stays server-side only.
    console.error(`[Server] Unexpected error handling ${event}:`, err);
    fail(makeProtocolError('INTERNAL_ERROR', 'An unexpected error occurred.'));
  };

  try {
    let value: T;
    if (schema) {
      const result = schema.safeParse(payload);
      if (!result.success) {
        // Log field names only — never the rejected payload contents.
        console.warn(
          `[Server] Rejected ${event}: invalid payload (fields: ${summarizeIssues(result.error)})`,
        );
        fail(makeProtocolError('INVALID_PAYLOAD', `Invalid ${event} request.`));
        return;
      }
      value = result.data;
    } else {
      value = undefined as T;
    }

    const outcome = run(value, ack);
    if (outcome instanceof Promise) {
      outcome.catch(handleUnexpected);
    }
  } catch (err) {
    handleUnexpected(err);
  }
}
