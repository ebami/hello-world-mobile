# Accepted review residuals — MFP-01 (socket runtime validation)

**Branch:** `01-security/socket-runtime-validation`
**Base:** `c20c321` (main)
**Recorded:** 2026-07-14
**Source:** Tier 2 `ce-code-review` (`mode:agent`) — two reviewer passes
(security/correctness on session model; contract/reliability/tests/maintainability).
**Overall verdict:** Ready to merge — no P0/P1. All P2 findings were applied.

These two **P3** findings were reviewed and **accepted** (not fixed) via the
Residual Work Gate. Both are safe today (verified) and were deferred because the
fix would edit `server/src/roomManager.ts`, which MFP-03 (identity) and MFP-05
(lifecycle) restructure — fixing here would create churn those stories redo.

## R1 — `translateRoomError` couples to RoomManager message strings

- **File:** `server/src/validation/validatedHandler.ts` (`translateRoomError`)
- **Severity:** P3 · **Confidence:** 90 · **Owner:** downstream-resolver
- **Issue:** Known domain failures are mapped to `ProtocolError` codes by exact
  `Error.message` match (`'Room is full'`, `'Game already started'`,
  `'Name already taken in this room'`). All three match `roomManager.ts` today
  (verified). If a message is reworded, the failure silently degrades to a
  generic `INTERNAL_ERROR` (still safe — no leak — but the wrong code/UX).
- **Suggested fix (later):** throw typed error classes from `RoomManager`, or
  share message constants between the two modules.
- **Why deferred:** requires editing `RoomManager`; MFP-03/05 change its error
  and identity model.

## R2 — Integration test resets RoomManager via a private-field cast

- **File:** `server/src/socketValidation.test.ts` (`beforeEach`)
- **Severity:** P3 · **Confidence:** 60 · **Owner:** downstream-resolver
- **Issue:** State is reset with
  `(roomManager as unknown as { rooms: Map<...> }).rooms.clear()`, reaching
  through a TS-private field. Works today; a field rename would break it
  silently. This matches the **existing** convention in `gameHandler.test.ts`
  and `roomManager.test.ts`.
- **Suggested fix (later):** add a test-only `RoomManager.resetForTests()` /
  `clear()` method and use it across all server test suites.
- **Why deferred:** editing `RoomManager` (restructured by MFP-03/05); the cast
  is consistent with the current test suite, so fixing it in isolation would be
  inconsistent.

## Not carried as residuals (resolved or non-defects)

- Guard's `ack` typed as `RoomAck` while the docblock frames `guard` as generic
  — no defect (only `create_room`/`join_room` use acks, both room-shaped).
- Wire-contract change (ack error `string` → `ProtocolError`) — in-scope for
  MFP-01; every in-repo consumer was updated; no external clients exist.
