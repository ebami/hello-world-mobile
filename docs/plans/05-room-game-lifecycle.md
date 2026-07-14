---
name: room-game-lifecycle
mfp: MFP-05
title: Correct Room Membership and Game Lifecycle State
branch: 05-architecture/room-game-lifecycle
sequence: 5
execution: code
complexity: Large
owner: Backend + Architecture
depends_on: [MFP-03, MFP-11]
---

# MFP-05 — Correct Room Membership and Game Lifecycle State

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.
>
> **PR isolation:** MFP-03 → MFP-05 → MFP-04 must ship as three separate PRs. Do not combine.

## User story

As a multiplayer player, I need room membership, hands, turns, and winners tied to stable player identity so that leaving, disconnecting, restarting, or completing a game cannot assign the wrong hand or corrupt the match.

## Repository context

The server currently correlates `room.info.players[index]` with `gameState.players[index]`. Removing a player from the room array after a game starts changes indexes without changing game-state arrays. Private hands and winner IDs can consequently be assigned to the wrong player.

## Files

**Modify**
- `server/src/roomManager.ts` — `RoomPhase`, immutable `seatOrder`, `playerId → seatIndex`, host transfer, cleanup.
- `server/src/gameHandler.ts` — hand/turn/winner lookup via seat mapping; reject post-completion actions; single `game_over`.
- `server/src/index.ts` — `start_game` idempotency + phase guards; forfeit-on-leave wiring.
- `server/src/types.ts`, `packages/game-core/src/types.ts` — `RoomPhase`, seat mapping, phase in `RoomInfo`/`PublicGameView`.

**Tests**
- `server/src/roomManager.test.ts` — lifecycle transitions, host transfer, seat stability.
- `server/src/gameHandler.test.ts` — private-hand correctness across membership changes, forfeit winner, single game_over.

## Implementation scope

1. Add an explicit room lifecycle, for example:

```ts
type RoomPhase =
  | "LOBBY"
  | "ACTIVE"
  | "COMPLETED"
  | "ABANDONED"
  | "CLOSED";
```

2. Replace `isStarted` as the primary lifecycle representation, or derive it from the phase for temporary compatibility.
3. Introduce a stable seat/player mapping:
   - Immutable `seatOrder: playerId[]` once the game starts.
   - A reliable `playerId -> seatIndex` lookup.
   - Never derive a hand index from a mutable presentation array.
4. Arrays may remain inside game-core only when every server access uses the immutable seat mapping.
5. Define transitions:
   - A lobby player may leave and be removed.
   - The lobby host may leave and host ownership transfers.
   - An active player is never spliced out of the seat order.
   - An explicit active-game leave is a forfeit.
   - A network disconnect begins a grace state rather than immediate removal.
   - Grace expiry becomes a forfeit; the timer is completed in MFP-04.
   - In the two-player MVP, a forfeit completes the game and awards the opponent the win.
   - Completed games reject gameplay commands.
6. Make `start_game` idempotent and phase guarded:
   - Only the host can start.
   - Exactly two eligible players are required.
   - A room cannot be started twice.
7. Record game completion once and emit `game_over` once.
8. Ensure hand counts, private-hand payloads, turn ownership, and winner lookup all use stable player identity.
9. Decide and implement room cleanup behavior after completion without deleting it before clients receive the final result.

## Verification

- Removing or forfeiting a player never shifts another player onto the wrong hand.
- Private hand payloads always contain the recipient's authoritative hand.
- Winner IDs are derived through the stable seat mapping.
- A second `start_game` request is rejected without redealing.
- Actions after game completion are rejected.
- A lobby host leaving transfers host status correctly.
- An active-game leave produces a deterministic forfeit result.
- `game_over` is emitted only once.
- No active-game code uses `room.players.findIndex(...)` as the source of hand identity unless that list is the immutable seat order.

## Test scenarios

- Lobby host leaves.
- Non-host lobby player leaves.
- Start game twice.
- Submit action after completion.
- Active player explicitly leaves.
- Correct winner after forfeit.
- Correct private hands before and after disconnect status changes.
- Stable hand mapping when room presentation data changes.
- Game-over emitted once.
- Wrong or unknown player ID rejected.

## Scope boundaries

- Three-to-four-player elimination logic.
- Redis persistence.
- Match rematches.
