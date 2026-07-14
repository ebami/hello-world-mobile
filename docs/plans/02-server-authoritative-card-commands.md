---
name: server-authoritative-card-commands
mfp: MFP-02
title: Make Card Commands Server-Authoritative
branch: 02-security/server-authoritative-card-commands
sequence: 2
execution: code
complexity: Medium
owner: Backend + Architecture + Security
depends_on: [MFP-01]
---

# MFP-02 — Make Card Commands Server-Authoritative

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.

## User story

As a player, I need the server to derive every played card and card effect from its own authoritative hand state so that a modified client cannot forge ranks, suits, draw penalties, or card identities.

## Repository context

The current protocol sends complete `Card[]` objects. `server/src/gameHandler.ts` checks submitted card IDs but then passes the client-supplied card objects to `applyCardEffect`. Therefore, a client can retain a valid ID while replacing the card's rank or suit.

The client also changes an Ace's `suit` property to represent the chosen active suit, which changes the identity of the physical card.

## Files

**Modify**
- `packages/game-core/src/types.ts` — replace `PlayCardsAction` payload; add active-suit to `GameState`/`PublicGameView`.
- `packages/game-core/src/gameLogic.ts` — move-validation and `applyCardEffect` to use canonical cards + active suit.
- `packages/game-core/src/index.ts` — export new command/state shapes.
- `server/src/gameHandler.ts` — resolve IDs to authoritative hand cards; reject forged/duplicate/foreign IDs.
- `networking/socketTransport.ts`, `networking/localTransport.ts`, `networking/types.ts` — send `cardIds`/`declaredSuit`.
- `game/ai.ts`, `game/gameLogic.ts` — single-player + bot declared-suit model.
- `screens/GameScreen.tsx`, `screens/MultiplayerGameScreen.tsx`, `components/SuitPicker.tsx` — emit declared suit, render active suit.

**Tests**
- `server/src/gameHandler.test.ts` — forged/duplicate/foreign ID + Ace declared-suit cases.
- `__tests__/game/gameLogic.test.ts`, `__tests__/game/ai.test.ts` — active-suit valid moves, bot Ace.

## Implementation scope

1. Replace the network `play_cards` payload with a shared command:

```ts
interface PlayCardsCommand {
  cardIds: string[];
  declaredSuit?: Suit;
}
```

2. Update the shared `GameAction` protocol, client transport, screens, local transport, server handlers, and tests.
3. On the server:
   - Locate every requested ID in the authenticated player's authoritative hand.
   - Preserve the requested order.
   - Reject missing IDs.
   - Reject duplicate IDs.
   - Reject IDs belonging to another player.
   - Run move validation using only canonical server cards.
   - Pass only canonical cards into game-rule functions.
4. Represent an Ace's selected suit separately from the card:
   - Add an authoritative `activeSuit` or equivalent field to game state and the public view.
   - Keep the discard-pile card's original suit unchanged.
   - Require `declaredSuit` when the final played card is an Ace.
   - Reject `declaredSuit` when it is not applicable.
   - Use the active suit when calculating the next player's valid moves.
5. Update single-player and AI handling to use the same declared-suit model.
6. Ensure bots choose a valid declared suit using deterministic, tested logic.
7. Do not accept rank or suit properties in the multiplayer command.

## Verification

- The client cannot submit a rank or physical card suit in `play_cards`.
- A valid `2♥` card can never be treated as a black Jack or any other card.
- The server's discard pile contains canonical cards from the player's hand.
- An Ace retains its original suit in the discard pile.
- The chosen Ace suit is reflected through the separate active-suit field.
- Valid-move calculation uses the active suit after an Ace.
- Duplicate, foreign, stale, and nonexistent card IDs are rejected.
- Single-player gameplay still supports suit selection.
- Existing draw, skip, reverse, Queen, Jack, and last-card rules remain correct.

## Test scenarios

- Reproduce the former forged-card attack and prove it is rejected or impossible.
- Submit a valid ID with extra forged rank/suit properties and prove they are ignored or rejected by validation.
- Duplicate ID test.
- Card ID from another hand test.
- Valid single-card play test.
- Valid ordered run test.
- Invalid run-order test.
- Ace without `declaredSuit` test.
- Non-Ace with `declaredSuit` test.
- Ace active-suit valid-move tests.
- Single-player Ace and bot-Ace regression tests.

## Scope boundaries

- Command deduplication and state versions; those belong to MFP-04.
- Rewriting all game rules.
