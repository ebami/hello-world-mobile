---
name: two-player-online-mvp
mfp: MFP-11
title: Cap Initial Production Multiplayer at Two Players
branch: 04-product/two-player-online-mvp
sequence: 4
execution: code
complexity: Small
owner: Product + Frontend + Backend + QA
depends_on: []
---

# MFP-11 — Cap Initial Production Multiplayer at Two Players

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.

## User story

As a release owner, I need online multiplayer restricted to the number of players the current UI and game lifecycle can safely support so that production behavior matches the tested product experience.

## Repository context

Rooms currently default to as many as four players, while `MultiplayerGameScreen` is primarily designed around one main opponent.

## Files

**Modify**
- `server/src/roomManager.ts` — server-authoritative max of two; `ROOM_FULL` on third join.
- `server/src/index.ts` / `server/src/validation/schemas.ts` — reject/ignore client `maxPlayers > 2`.
- `packages/game-core/src/types.ts` — `CreateRoomOptions`/`RoomInfo` where `maxPlayers` is referenced.
- `screens/HomeScreen.tsx`, `screens/LobbyScreen.tsx`, `screens/WaitingRoomScreen.tsx`, `screens/MultiplayerGameScreen.tsx` — copy + one-opponent rendering.
- `README.md`, `rules.md`, `screens/rules/*` — state two-player online MVP.

**Tests**
- `server/src/roomManager.test.ts` — cap + third-join rejection.
- `__tests__/screens/WaitingRoomScreen.test.tsx`, `__tests__/screens/MultiplayerGameScreen.test.tsx` — "2 players" copy + rendering.

## Implementation scope

1. Set the production multiplayer limit to exactly two human players.
2. Make the server authoritative:
   - Do not trust a client-provided larger `maxPlayers`.
   - Remove `maxPlayers` from client room creation or require it to equal two.
   - Reject a third join with a stable `ROOM_FULL` error.
3. Update room defaults, runtime schemas, shared types where appropriate, UI copy, and tests.
4. Remove or hide controls implying that three-to-four-player online play is supported.
5. Ensure the waiting room clearly communicates "2 players."
6. Ensure the multiplayer game screen renders the local player and exactly one opponent correctly.
7. Update the README and rules documentation to state that the production online MVP is two-player.
8. Keep shared game-core logic capable of supporting more players where this does not add risk; do not build the multi-opponent UI in this story.

## Verification

- Every newly created online room has a maximum of two players.
- A third player cannot join even with a custom client.
- The UI does not advertise four-player online support.
- Starting requires exactly two connected, non-forfeited players.
- Existing two-player multiplayer tests pass.
- New server and UI tests cover the cap.

## Test scenarios

- Third-join rejection with `ROOM_FULL` (server test).
- Client-supplied `maxPlayers > 2` is ignored/rejected.
- Waiting room communicates "2 players".
- Multiplayer game screen renders local player + one opponent.
- Existing two-player multiplayer tests still pass.

## Scope boundaries

- Three-to-four-player screen design.
- Spectators.
- Bots in online rooms.
