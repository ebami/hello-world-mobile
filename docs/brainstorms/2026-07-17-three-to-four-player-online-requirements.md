---
date: 2026-07-17
topic: three-to-four-player-online
---

# 3-4 Player Online Multiplayer — Requirements

## Summary

Extend online play from the shipped two-player MVP to 3-4 players by generalizing a room from a fixed two-player cap to a host-chosen cap of 2-4, adding a host-selected endgame mode (play to a full ranking, or first-out-wins), grace-then-drop handling for mid-game departures, and a multi-opponent game screen. The card engine already runs any number of players; this epic lifts the two-player policy cap and builds the multi-player endgame, drop, and UI behavior that today exist only in two-player form.

---

## Problem Frame

The production online MVP is deliberately two-player. Two places bake that in: a hard capacity policy (rooms cap at two and the server refuses larger client-requested sizes) and end-of-game logic written for exactly one opponent (a forfeit "awards the opponent the win"; the game ends the instant the first player empties their hand). The game screen renders exactly one opponent.

The underlying rules engine, by contrast, was written generic over player count from the start — turn advancement, skips, direction reversals, and draw-pressure chaining all key off the number of players. So the gap between "two-player only" and "3-4 players" is not a rules rewrite. It is a policy cap to lift, a genuine multi-player endgame to design (what happens after the first player goes out, and when someone leaves mid-game), and a table UI that can show more than one opponent. This epic was named as the next step after the MVP shipped.

---

## Key Decisions

- **Generalize the room, don't fork a "party mode."** A room becomes a variable-capacity room with a host-chosen cap of 2-4. Two-player play is just cap = 2 on the same path, not a separate feature.
- **Endgame is a host choice, not a fixed rule.** At room creation the host picks Ranking (play continues until only one player still holds cards, producing a full finishing order) or First-out (the first player to empty their hand wins and the game ends immediately). Round-based scoring is out.
- **Grace-then-drop-and-continue for departures.** A mid-game disconnect is held through the existing reconnect grace window (turns auto-advance meanwhile); on grace expiry or an explicit quit the player is removed and the game continues. Removal only ends the game if it leaves one active player. A removed player's cards are shuffled back into the draw deck.
- **A dropped player ranks below everyone still in.** In Ranking mode, a removed player is placed below every player still holding cards at removal time; a later removal ranks below an earlier one. Leaving is treated as effectively coming last.
- **Table-perimeter layout for opponents.** Opponents sit around the table edges (top / left / right) with name and hand count, and a clear turn indicator. The layout degrades so two-player keeps today's single-opponent-at-top screen.
- **The two-player experience is preserved.** Because Ranking and First-out are identical at two players, the mode choice is not offered at two players, and the two-player screen is unchanged.

---

## Actors

- A1. Host — creates the room, sets the target player count and endgame mode, and starts the game.
- A2. Joining player — joins by room code up to the cap and plays.
- A3. Server (authoritative) — enforces the cap, runs turn order, detects go-outs, manages the grace window and drops, and computes final standings. All limits are server-owned.

---

## Key Flows

- F1. Room setup and start
  - **Trigger:** A2. Host creates a room.
  - **Steps:** Host picks a target size (2-4) and, when target is 3+, an endgame mode; players join up to the cap; host taps Start once at least two players are present.
  - **Outcome:** Game begins with whoever is present (2, 3, or 4), seat order frozen.
  - **Covered by:** R1, R2, R3, R4.

- F2. A player goes out
  - **Trigger:** An active player empties their hand with a valid last-card declaration.
  - **Steps (First-out):** Game ends; that player is the winner.
  - **Steps (Ranking):** That player finishes and stops playing; remaining players continue; repeat until one player still holds cards.
  - **Outcome:** A single winner (First-out) or a full finishing order (Ranking).
  - **Covered by:** R5, R6, R7, R8.

- F3. Mid-game disconnect
  - **Trigger:** An active player disconnects during the game.
  - **Steps:** Their turns auto-advance during the grace window; on reconnect they resume; on grace expiry or explicit quit they are removed and play continues.
  - **Outcome:** Game continues with remaining players; ends only if one active player is left.
  - **Covered by:** R9, R10, R11, R12.

---

## Requirements

**Room setup and start**

- R1. The host chooses a target player count of 2, 3, or 4 at room creation; the target is a cap, not a required fill count.
- R2. When the target is 3 or 4, the host chooses an endgame mode (Ranking or First-out) at room creation.
- R3. The host can start the game at any time once at least two players are present, even if the target is not yet reached.
- R4. Players may join up to the target cap while the room is in the lobby; a join beyond the cap is rejected with a stable error.

**Endgame and standings**

- R5. In First-out mode, the game ends the moment a player empties their hand with a valid last-card declaration; that player wins and no order beyond the winner is produced.
- R6. In Ranking mode, a player who empties their hand with a valid declaration finishes and stops playing while the remaining players continue.
- R7. In Ranking mode, final standings order players by the sequence in which they went out (first out is first place); the single player left holding cards is last.
- R8. In Ranking mode the game ends when exactly one active player (not finished, not dropped) remains.

**Disconnect and drop**

- R9. A disconnected player is held through the existing reconnect grace window, and their turns are auto-advanced while they are away.
- R10. On grace expiry or an explicit mid-game quit, the player is removed and play continues; removal ends the game only when it leaves one active player.
- R11. In Ranking mode a removed player is ranked below every player still in the game at removal time; among multiple removals, a later removal ranks below an earlier one.
- R12. When a player is removed, the cards from their hand are shuffled back into the draw deck.

**Game screen**

- R13. The game screen shows every opponent around the table perimeter, each with name and current hand count.
- R14. A clear turn indicator marks whose turn it is.
- R15. The perimeter layout degrades gracefully: one opponent (two-player) renders in the top position as today; two opponents (three-player) split across the available edges.
- R16. Finished and dropped players are visually distinguished from still-active opponents.

**Compatibility**

- R17. The two-player online experience is preserved unchanged, and at two players the endgame-mode choice is not offered.
- R18. All limits stay server-owned; the server never trusts a client-supplied player count outside the allowed 2-4 range.

---

## Acceptance Examples

- AE1. First-out win
  - **Covers R5.**
  - **Given** a 4-player game in First-out mode, **when** any player empties their hand with a valid declaration, **then** the game ends immediately and that player is the sole winner.

- AE2. Ranking finishing order
  - **Covers R6, R7.**
  - **Given** a 4-player game in Ranking mode, **when** players empty their hands in the order C, then A, then B, **then** the final standings are C (1st), A (2nd), B (3rd), and the last player still holding cards is 4th.

- AE3. Ranking ends at one remaining
  - **Covers R8.**
  - **Given** a 3-player Ranking game where two players have already gone out, **when** the moment reaches the single remaining player, **then** the game ends and that player is last.

- AE4. Dropped player placement (Ranking)
  - **Covers R10, R11.**
  - **Given** a 4-player Ranking game where one player has gone out (1st) and three are still in, **when** one of the three drops after grace expiry, **then** the game continues with the other two and the dropped player ranks below both of them.

- AE5. Drop reduces to one active player
  - **Covers R10.**
  - **Given** a 3-player Ranking game where one player has already gone out, **when** a drop leaves a single active player, **then** the game ends and that player is last.

- AE6. Start with fewer than target
  - **Covers R3.**
  - **Given** a room with target 4 and only 3 players present, **when** the host taps Start, **then** the game begins as a 3-player game.

- AE7. Two-player equivalence
  - **Covers R17.**
  - **Given** a room with target 2, **when** the host sets it up, **then** no endgame-mode choice is presented and the game plays exactly as the current two-player MVP.

---

## Scope Boundaries

- Round-based scoring and rematches (someone goes out, others tally penalty points across multiple rounds).
- Spectators.
- Bots in online rooms.
- 5+ players.
- Redis, multi-instance, and horizontal scaling. These are triggered by running more than one server process, not by more players per room; 3-4 players stays single-instance and in-memory.

---

## Dependencies / Assumptions

- Reuses the existing reconnect/grace mechanism from the reconnect-resume work; this epic does not build a new disconnect system.
- The rules engine already supports any player count (turn order, skips, direction reversal, draw pressure), so no core rule changes are required to support more players.
- The host sets target size and endgame mode at room creation; these are not a vote or a per-player choice.
- Deployment stays single-instance with in-memory room state; no new infrastructure.
- The frozen seat-order model (seat → player) carries over; multi-player turn/hand/standings lookups go through it.

---

## Outstanding Questions

**Deferred to planning**

- At two players, is the mode selector hidden entirely, or shown disabled with a short explanation? R17 leaves the exact treatment open — a UX call.
- Turn-order handling as finished/dropped seats accumulate (advancing past seats that are out) — engine detail on top of the existing seat model.
- End-of-game standings presentation (the results screen for a full ranking vs a single winner).

---

## Sources / Research

- `packages/game-core/src/gameLogic.ts` — engine is already player-count generic (`nextPlayerIndex`, `applyCardEffect`); `isGameOver` currently returns the first empty hand as the winner (First-out shape only) and needs Ranking/continue semantics; `declareLastCard` already generalizes.
- `server/src/roomManager.ts` — `forfeitActivePlayer` is two-player-only ("award the opponent the win") and must become remove-and-continue; `createRoom` defaults `maxPlayers` to 2; the frozen `seatOrder` model is already N-player shaped.
- `server/src/validation/schemas.ts` — `MIN_MAX_PLAYERS` and `MAX_MAX_PLAYERS` are both 2; widen the allowed range to 2-4.
- `screens/GameScreen.tsx` — hard-codes `players[0]` (you) and `players[1]` (the one opponent); the multi-opponent layout replaces this.
- `docs/plans/04-two-player-online-mvp.md`, `docs/plans/05-room-game-lifecycle.md` — prior scope boundaries that named this epic ("three-to-four-player elimination logic", "screen design").
- `docs/plans/06-reconnect-resume.md` — the reconnect/grace behavior this epic reuses for drops.
