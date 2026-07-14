---
name: reconnect-resume
mfp: MFP-04
title: Implement Reconnect, Resume, Command Versions, and Deduplication
branch: 06-resilience/reconnect-resume
sequence: 6
execution: code
complexity: Large
owner: Backend + Frontend + QA
depends_on: [MFP-03, MFP-05]
---

# MFP-04 — Implement Reconnect, Resume, Command Versions, and Deduplication

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.
>
> **PR isolation:** MFP-03 → MFP-05 → MFP-04 must ship as three separate PRs. Do not combine.

## User story

As a mobile multiplayer player, I need my session to recover after temporary network loss so that changing networks, locking my device, or reconnecting does not duplicate me, lose my hand, or apply the same command twice.

## Repository context

`SocketTransport` currently marks itself connected after a Socket.IO reconnect but does not reauthenticate, rejoin the room, replace the player's socket mapping, or request the current public state and private hand.

The server starts an untracked timeout on disconnect and cannot reliably cancel it after recovery.

## Files

**Modify**
- `networking/socketTransport.ts`, `networking/types.ts` — `resume_session`, distinguish transport-reconnect from session-recovery.
- `server/src/index.ts` — `resume_session` handler; rebind socket; cancel grace timer; rotate token.
- `server/src/gameHandler.ts` — state versions, `CommandMetadata`, idempotent command handling.
- `server/src/roomManager.ts` — grace-timer registry keyed by room+player.
- `packages/game-core/src/types.ts` — `resume_session` protocol, `CommandMetadata`, versioned snapshots.
- `stores/sessionStore.ts` — secure token persistence + reconcile from snapshot.
- `screens/MultiplayerGameScreen.tsx`, `screens/WaitingRoomScreen.tsx` — gate "active" on resume success.

**Create (suggested)**
- `server/src/graceTimers.ts` — one active timer per player.
- `stores/secureTokenStore.ts` — `expo-secure-store` (native) / scoped web storage.

**Tests**
- `__tests__/networking/socketTransport.test.ts` — transport/session state transitions.
- `server/src/*.test.ts` — resume, dedup, stale-version, grace-expiry (real Socket.IO clients).

> Add `expo-secure-store`. Never place the token in an `EXPO_PUBLIC_` variable or logs.

## Implementation scope

1. Add a typed `resume_session` protocol using the signed reconnect token from MFP-03.
2. On successful resume:
   - Verify token signature, expiry, room, player ID, and session version.
   - Rebind the player to the new socket ID.
   - Revoke control from the old socket.
   - Join the Socket.IO room.
   - Mark the player connected.
   - Cancel the player's pending disconnect timer.
   - Return the current room, public game state, private hand, phase, and state version.
   - Rotate the reconnect token.
3. Add a reconnect grace timer registry keyed by room ID and player ID. There must be at most one active timer per player.
4. Distinguish:
   - Explicit leave: immediately invalidate the room session.
   - Temporary transport disconnect: preserve the session for the configured grace period.
   - Grace expiry: invoke the lifecycle/forfeit transition from MFP-05.
5. Update client connection states to distinguish transport reconnection from successful session recovery. Do not report the session as usable until resume succeeds.
6. Persist the reconnect token:
   - Use secure native storage, preferably `expo-secure-store`.
   - Use appropriately scoped browser storage on web.
   - Never put the token in an `EXPO_PUBLIC_` variable or logs.
7. Add monotonic game-state versions.
8. Add command metadata to mutating commands:

```ts
interface CommandMetadata {
  commandId: string;
  expectedStateVersion: number;
}
```

9. Make command processing idempotent:
   - Retain a bounded recent-command-ID set per player/session.
   - A duplicate command must not be applied twice.
   - A stale state version must return a stable mismatch error and the latest snapshot or trigger resynchronization.
   - Every accepted state-changing command increments the version exactly once.
10. Ensure the client reconciles its state using the authoritative resume/snapshot response.

## Verification

- A player reconnecting with a new socket ID resumes the same player identity.
- The player is not duplicated in the room.
- The resumed player receives the correct private hand.
- The latest public state and state version are restored.
- The old socket cannot submit commands.
- A pending disconnect timer is cancelled after successful resume.
- A duplicate `commandId` changes game state at most once.
- A stale `expectedStateVersion` does not mutate state.
- An invalid or expired token does not reveal private state.
- Grace expiry produces the deterministic forfeit behavior from MFP-05.
- The UI only returns to active gameplay after session resume succeeds.

## Test scenarios

Use real Socket.IO clients for:

- Disconnect and reconnect before grace expiry.
- Reconnect after grace expiry.
- Token replay from a second socket.
- Invalid, expired, and wrong-room tokens.
- Old-socket command after resume.
- Correct private-hand replay.
- Duplicate draw command.
- Duplicate play command.
- Stale version command.
- Resume while game is active.
- Resume while room is still in the lobby.
- Explicit leave followed by resume attempt.
- App/client transport state transitions.

## Scope boundaries

- Recovery after a server process restart.
- Cross-instance Socket.IO routing.
- Redis-backed command deduplication.
