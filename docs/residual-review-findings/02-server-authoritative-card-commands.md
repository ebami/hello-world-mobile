# Accepted review residuals — MFP-02 (server-authoritative card commands)

**Worked on:** `main` (no feature branch, per workflow choice)
**Base:** `bbce44e` (MFP-01)
**Recorded:** 2026-07-15
**Source:** Tier 2 `ce-code-review` (`mode:agent`) — two reviewer passes
(security/correctness on session model; contract/tests/maintainability).
**Overall verdict:** Ready with fixes — all P0/P1/P2 correctness + all
plan-mandated test findings were **applied**. Forgery vector confirmed closed.

## Applied during followup (not residual — listed for the record)
- Both screens' `getValidMoves` now pass `activeSuit` (the P0/P2 core bug: the
  live single-player `GameScreen` is authoritative, so its move calc must honour
  the active suit after an Ace).
- `GameScreen` bot AI now forwards `move.declaredSuit`.
- `MultiplayerGameScreen` move calc honours `activeSuit` (advisory; server
  re-validates).
- `activeSuit: null` added to both local `createInitialState()` for parity.
- Active-suit indicator ("Suit in force: X") added to both screens' status area
  (this is the plan's "render active suit"; the `SuitPicker` modal is the
  chooser, not the display, so the indicator lives in the status area instead).
- Tests backfilled: strict schema rejects forged `rank`/`suit` on a valid
  `cardIds` payload; a valid multi-card run is accepted in order; a misordered
  run is rejected.

## R1 — Duplicated action-processing in LocalTransport

- **File:** `networking/localTransport.ts` (`processAction` vs `processBotAction`)
- **Severity:** P2 · **pre-existing:** yes
- **Issue:** The two methods are near-identical switch statements (the
  `DRAW_CARD` branch is duplicated verbatim). MFP-02 added `declaredSuit`
  plumbing to both copies rather than consolidating.
- **Suggested fix (later):** extract a shared
  `applyAction(state, action, actorLabel): GameState` used by both.
- **Why deferred:** pre-existing duplication, and see R2 — the whole module is
  currently dead code, so refactoring it now is low value.

## R2 — LocalTransport is effectively dead code (informational)

- **File:** `networking/localTransport.ts`
- **Severity:** informational · **pre-existing:** yes
- **Observation:** The security reviewer found `LocalTransport` is not wired to
  any live screen — single-player runs through `screens/GameScreen.tsx`'s own
  `useReducer`, and multiplayer uses `SocketTransport`. `LocalTransport` exists
  only in tests/docs. MFP-02 kept it consistent with the new declared-suit model
  for correctness, but a future cleanup should either wire it in or remove it
  (and R1 disappears with removal).
- **Why not actioned here:** out of MFP-02 scope; removing/ rewiring a transport
  is its own change.
