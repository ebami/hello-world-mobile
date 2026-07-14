---
name: stable-player-sessions
mfp: MFP-03
title: Introduce Stable Player Identity, Session Tokens, and Command Authorization
branch: 03-security/stable-player-sessions
sequence: 3
execution: code
complexity: Large
owner: Backend + Security + Frontend
depends_on: [MFP-01]
---

# MFP-03 — Introduce Stable Player Identity, Session Tokens, and Command Authorization

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.
>
> **PR isolation:** MFP-03 → MFP-05 → MFP-04 must ship as three separate PRs. Do not combine.

## User story

As a multiplayer player, I need a stable server-issued identity that is independent of my display name and socket ID so that only my authorized session can control my room membership and game actions.

## Repository context

`RoomManager` currently uses player names as `playerId`, `hostId`, and socket-map keys. Socket IDs are passed into room methods but are not used as durable identity. The client store has compensating logic that checks both the player ID and player name when deciding whether the local player is host.

## Files

**Modify**
- `server/src/roomManager.ts` — opaque `playerId` keys; stop using names as identity.
- `server/src/gameHandler.ts` — authorize by `socket.data.playerId`.
- `server/src/index.ts` — set `socket.data.playerId`; wire session issuance.
- `server/src/types.ts`, `packages/game-core/src/types.ts` — `PlayerSummary`, `RoomInfo`, `RoomSession`, split `playerId`/`displayName`/`socketId`.
- `networking/socketTransport.ts`, `networking/localTransport.ts`, `networking/types.ts` — return/carry `RoomSession`.
- `stores/sessionStore.ts` — store `playerId` + reconnect token; fix `isHost` to compare IDs only.

**Create (suggested)**
- `server/src/identity.ts` — UUID issuance + player↔socket mapping.
- `server/src/sessionToken.ts` — HMAC-SHA256 sign/verify (constant-time), claims, expiry, nonce.

**Tests**
- `server/src/roomManager.test.ts`, `server/src/gameHandler.test.ts` — auth + identity cases.
- `server/src/sessionToken.test.ts` (new) — signature/expiry/wrong-room.
- `__tests__/stores/sessionStore.test.ts` — host-calculation tests.

> Requires `SESSION_SIGNING_KEY` in production; a deterministic test key is permitted in tests only.

## Implementation scope

1. Generate an opaque UUID for every new player session.
2. Separate identity from presentation:
   - `playerId`: immutable opaque identifier.
   - `displayName`: user-visible name.
   - `socketId`: current connection only.
3. Update `PlayerSummary`, `RoomInfo`, client rendering, tests, and store logic to use these fields correctly.
4. Introduce a room-scoped, expiring reconnect/session token:
   - Signed using HMAC-SHA256 or an equivalently secure mechanism.
   - Contains only the minimum required claims.
   - Includes player ID, room ID, expiry, and a session version or nonce.
   - Uses constant-time signature verification.
   - Is never logged.
5. Require `SESSION_SIGNING_KEY` in production. Permit a deterministic test key only in tests.
6. Return a room-session result from room creation and joining:

```ts
interface RoomSession {
  room: RoomInfo;
  playerId: string;
  reconnectToken: string;
  expiresAt: string;
}
```

7. Store the player ID and token in client session state. Durable secure persistence is completed in MFP-04.
8. Authorize every room/game command using `socket.data.playerId` and the server-side player-to-socket mapping.
9. Reject commands when:
   - The socket has no authenticated room session.
   - The player is not a member of the room.
   - The socket is no longer the current socket for that player.
   - The room in socket state does not match server membership.
10. Change host authorization to compare stable player IDs.
11. Retain display-name uniqueness within one room if desired, but never use the display name for authorization.

## Verification

- Two players with the same display name in different rooms have distinct identities.
- Changing a display name cannot grant host permissions.
- `hostId` is always an opaque player ID.
- Room methods no longer use player names as map keys.
- A socket not mapped to a player cannot start a game or submit game actions.
- A stale socket cannot continue controlling a session after its mapping has been replaced.
- Session tokens are signed, expiring, room-scoped, and omitted from logs/public state.
- The client's `isHost` calculation compares only stable IDs.
- Existing room creation and joining UI remains functional.

## Test scenarios

- Server-generated ID uniqueness.
- Host authorization using player ID.
- Display-name impersonation test.
- Invalid-signature token test.
- Expired-token test.
- Token for the wrong room test.
- Stale-socket command rejection.
- No token or signing key in captured logs.
- Client store host-calculation tests.

## Scope boundaries

- External user accounts.
- OAuth or social login.
- Global player profiles.
- Full reconnect behavior, which belongs to MFP-04.
