/**
 * @fileoverview Typed domain errors thrown by {@link RoomManager}.
 *
 * These represent *expected*, client-facing failure conditions (the room is
 * full, the game already started, the name is taken). Handlers classify them by
 * **type** — see `translateRoomError` in `validation/validatedHandler.ts` —
 * rather than by matching `Error.message`. That decoupling means rewording a
 * message (for logs or i18n) can never silently degrade a known failure into a
 * generic `INTERNAL_ERROR` with the wrong client code.
 *
 * @module server/roomErrors
 */

/** Base class for all expected RoomManager domain failures. */
export abstract class RoomManagerError extends Error {}

/** A player tried to join a room that is already at `maxPlayers`. */
export class RoomFullError extends RoomManagerError {
  constructor(message = 'Room is full') {
    super(message);
    this.name = 'RoomFullError';
  }
}

/** A player tried to join a room that is no longer in the LOBBY phase. */
export class GameAlreadyStartedError extends RoomManagerError {
  constructor(message = 'Game already started') {
    super(message);
    this.name = 'GameAlreadyStartedError';
  }
}

/** A player tried to join under a display name already used in that room. */
export class NameTakenError extends RoomManagerError {
  constructor(message = 'Name already taken in this room') {
    super(message);
    this.name = 'NameTakenError';
  }
}
