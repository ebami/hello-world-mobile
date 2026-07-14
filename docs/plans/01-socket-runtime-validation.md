---
name: socket-runtime-validation
mfp: MFP-01
title: Validate and Safely Contain Every Socket.IO Event
branch: 01-security/socket-runtime-validation
sequence: 1
execution: code
complexity: Medium
owner: Backend + Security
depends_on: []
---

# MFP-01 — Validate and Safely Contain Every Socket.IO Event

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.

## User story

As a production operator, I need every Socket.IO payload and acknowledgement callback to be validated and safely handled so that malformed or malicious client events cannot terminate the server process.

## Repository context

`server/src/index.ts` currently reads fields such as `options.playerName` before entering its `try` block. A client can send `null`, an unexpected primitive, or omit the acknowledgement callback and cause an unhandled exception.

TypeScript event interfaces do not provide runtime protection because untrusted clients do not have to follow those interfaces.

## Files

**Modify**
- `server/src/index.ts` — keep only a thin runtime entry point; move handler wiring out.
- `server/src/types.ts` — `SocketData`, `ClientToServerEvents`/`ServerToClientEvents` re-exports.
- `packages/game-core/src/types.ts` — shared protocol error type + `ClientToServerEvents` payload shapes.
- `packages/game-core/src/index.ts` — export any new shared protocol/error types.

**Create (suggested)**
- `server/src/socketServer.ts` — factory that builds the `Server` without binding a port.
- `server/src/validation/schemas.ts` — Zod schemas for every client→server event.
- `server/src/validation/validatedHandler.ts` — reusable validated-handler wrapper.
- `packages/game-core/src/protocol.ts` (or extend `types.ts`) — `ProtocolError` + error codes.

**Tests**
- `server/src/socketValidation.test.ts` (new) — real Socket.IO client/server integration.

> Add `zod` (or equivalent maintained schema library) to `server/package.json`.

## Implementation scope

1. Introduce runtime schemas for all client-to-server events. A maintained schema library such as Zod is preferred.
2. Add a reusable validated-handler wrapper that:
   - Accepts incoming values as `unknown`.
   - Validates before reading or logging fields.
   - Catches synchronous and asynchronous errors.
   - Returns a safe protocol error.
   - Calls an acknowledgement callback at most once.
   - Does not assume that a callback was supplied.
3. Cover:
   - `create_room`
   - `join_room`
   - `leave_room`
   - `start_game`
   - `play_cards`
   - `draw_card`
   - `declare_last_card`
4. Define a consistent structured protocol error with a stable machine-readable code and a safe display message.
5. Add reasonable input constraints:
   - Player names are trimmed and bounded.
   - Room codes have the expected format.
   - Numeric values are finite integers within server-approved bounds.
   - Arrays and strings have maximum sizes.
   - Unknown fields are rejected or explicitly stripped.
6. Do not log unvalidated payload contents.
7. Make the Socket.IO server constructible from tests without automatically binding a production port. Keep the runtime entry point thin.

## Verification

- Sending `null`, `undefined`, strings, numbers, arrays, or malformed objects to `create_room` and `join_room` does not crash the process.
- Omitting or falsifying an acknowledgement callback does not crash the process.
- Malformed game commands are rejected before reaching `RoomManager` or `GameHandler`.
- Validation failures return a stable error code such as `INVALID_PAYLOAD`.
- Internal exceptions return a generic client message and retain diagnostic details only in server logs.
- The server remains responsive to a valid event after receiving a malformed event.
- Existing valid room and gameplay operations continue to work.
- There are no field dereferences before successful validation.

## Test scenarios

- Real Socket.IO client/server integration test sending `create_room: null`.
- Missing callback test.
- Malformed `join_room` room code test.
- Empty and oversized player-name tests.
- Invalid `maxPlayers` tests including negative, fractional, `NaN`, and excessive values.
- Malformed `play_cards` tests.
- A regression test proving a valid room can still be created after each invalid request.

## Scope boundaries

- Player authentication.
- Reconnect tokens.
- Rate limiting.
- Redis or distributed validation state.
