---
name: release-verification
mfp: MFP-08
title: Establish Green, Repeatable Release Gates
branch: 09-quality/release-verification
sequence: 9
execution: code
complexity: Medium
owner: QA + Frontend + Backend
depends_on: [MFP-01, MFP-02, MFP-03, MFP-11, MFP-05, MFP-04, MFP-07, MFP-06]
---

# MFP-08 — Establish Green, Repeatable Release Gates

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.
>
> **Stale-premise check:** the context below claims two failing `StatsScreen` tests. Recent
> commits added StatsScreen coverage — verify the current failing/passing state before starting.

## User story

As an engineering manager, I need one deterministic verification command that proves the shared package, client, server, security regressions, and web build are healthy before a change can be released.

## Repository context

The current client test run has two failing `StatsScreen` tests, root TypeScript checking detects stale fixtures, and the production web export has not been proven to complete. Existing server tests do not meaningfully exercise actual Socket.IO handlers.

## Files

**Modify**
- `package.json` — add `typecheck`, `test:client`, `test:server`, `build:core`, `build:server`, `build:web`, `verify` scripts.
- `screens/StatsScreen.tsx`, `stores/statsStore.ts` — explicit local calendar-day semantics.
- `__tests__/screens/StatsScreen.test.tsx` — deterministic fake time + boundary tests.
- `jest.config.js`, `jest.setup.js` — fake timers; no wall-clock/sleep reliance; clean teardown.
- Stale fixtures across `__tests__/**` and `server/src/*.test.ts` — suit glyphs, `roomId` (not `roomCode`), required `RoomInfo` fields, typed Jest mocks.

**Create (suggested)**
- `server/src/testSupport/socketHarness.ts` — real Socket.IO server on an ephemeral port.
- Consolidated regression suites for the security fixes from MFP-01…06.

## Implementation scope

1. Fix the `StatsScreen` date behavior and tests:
   - Make "today," "yesterday," and day counts use explicit local calendar-day semantics.
   - Use deterministic fake time.
   - Add midnight, daylight-saving, and timezone-safe boundary tests.
2. Correct stale test fixtures:
   - Use shared suit glyph types.
   - Replace obsolete `roomCode` fields with `roomId`.
   - Include required `RoomInfo` fields.
   - Correct Jest mock types without unsafe casts.
3. Add root scripts:

```text
typecheck
test:client
test:server
build:core
build:server
build:web
verify
```

4. Make `verify` run all required checks in a deterministic order.
5. Add real Socket.IO integration tests using a server bound to an ephemeral port.
6. Consolidate regression coverage for:
   - Malformed payload process crash.
   - Forged card data.
   - Unauthorized socket commands.
   - Duplicate command handling.
   - Reconnect/resume.
   - Leave/forfeit lifecycle.
   - Room and rate limits.
7. Ensure test processes close all sockets, timers, and HTTP servers.
8. Ensure `npx expo export --platform web` completes and generates the expected output.
9. Eliminate test reliance on the actual wall clock and arbitrary sleeps.
10. Do not reduce existing assertions or exclude failing source directories.

## Verification

From a clean checkout:

```bash
rm -rf node_modules server/node_modules packages/game-core/dist server/dist .expo coverage
npm ci
npm run verify
```

must exit with status zero.

Additionally:

- No test is skipped, focused, or conditionally ignored.
- No TypeScript error is suppressed.
- The web export completes.
- Integration tests use real Socket.IO network behavior.
- Test runs terminate cleanly without open-handle warnings.
- Security regression tests fail when the corresponding protection is intentionally removed.
- The verification command is documented.

## Test scenarios

- `StatsScreen` midnight / DST / timezone boundary tests under fake time.
- Real Socket.IO integration tests on an ephemeral port.
- Regression suites (malformed payload, forged card, unauthorized command, duplicate command, reconnect, forfeit, limits) that fail when the protection is removed.
- Open-handle / clean-teardown assertions.

## Scope boundaries

- Production deployment.
- Cloud credentials.
- Full performance or load testing.
