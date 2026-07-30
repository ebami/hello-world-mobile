---
mode: agent
description: Add or modify a game rule or card effect in the shared game-core package
tools:
  - codebase
  - editFiles
---

# Add or Modify a Game Rule

Modify the card game's rules or add a new card effect. All shared game logic lives in **`packages/game-core/src/`** — the root `game/` folder contains only re-export shims.

## What to ask me first (if not already specified)

1. Is this a new card type, a modification to an existing card's effect, a scoring change, or a new rule (e.g., new stacking condition)?
2. Does it affect `GameState` shape (requires new fields in types)?
3. Does the AI need to learn about this card/rule?

## Source-of-truth hierarchy

```
packages/game-core/src/types.ts       ← GameState, Card, PublicGameView types
packages/game-core/src/gameLogic.ts   ← Rule logic: getValidMoves, applyCardEffect, isGameOver
packages/game-core/src/deck.ts        ← Deck generation and shuffling
game/ai.ts                            ← AI strategy (client-only, not in game-core)
```

Never modify `game/deck.ts`, `game/gameLogic.ts`, or `game/types.ts` for rule changes — they re-export from `@hello-world/game-core` and must stay as thin shims.

## Checklist

### 1. Update types (if new state is needed)

Edit `packages/game-core/src/types.ts`:
- Add new fields to `GameState` if the rule needs to track new per-game state.
- Add new fields to `PublicGameView` if clients need to see that state.
- Keep `GameState` separate from `PublicGameView` — `GameState` includes full hand arrays; `PublicGameView` exposes only hand counts to other players.

### 2. Implement rule logic in `packages/game-core/src/gameLogic.ts`

Key functions to know:
- `getValidMoves(hand, topCard, drawPressure)` — returns `{ singles: Card[], runs: Card[][] }`. Modify this to allow/restrict plays under the new rule.
- `applyCardEffect(state, cards)` — handles special card triggers (reversal, skip, draw pressure). Add new `if` branches here for new special cards.
- `isGameOver(state)` — checks win/draw conditions. Update if the new rule changes how games end.
- `declareLastCard(state, player)` — validates and records a "last card" declaration. Update if new rules affect when it's valid.

Keep all functions **pure** (no side effects, no async, return new state objects).

### 3. Rebuild the shared package

```bash
npm run build:core
```

TypeScript errors here must be fixed before proceeding.

### 4. Update single-player GameScreen (if needed)

`screens/GameScreen.tsx` has its own `gameReducer` that mirrors `game-core` logic. If the new rule changes how `PLAY_CARDS`, `DRAW_CARD`, or `DECLARE_LAST_CARD` actions work:
- Update the corresponding `case` in `gameReducer`.
- The reducer must stay pure — no direct store access, no async.

### 5. Update server-side handler (if needed)

`server/src/gameHandler.ts` calls `game-core` functions directly. If the new rule requires:
- A new socket event from client → server: add it to `ClientToServerEvents` in `packages/game-core/src/types.ts` and register a handler in `server/src/gameHandler.ts`.
- A new broadcast from server → client: add it to `ServerToClientEvents` and emit it from `gameHandler.ts`.

### 6. Update the AI (if the new card should be played strategically)

`game/ai.ts` contains `getComputerMove` and `shouldBotDeclareLastCard`. The priority list in `getComputerMove` is:
1. Go out (play all remaining cards).
2. Easy mode random play (30% chance).
3. Force draw on opponent (2s and black Jacks).
4. Shield from draw pressure (red Jacks).
5. Direction reversal / suit change (Aces).

Add a new priority entry if the new card deserves strategic weighting.

`getBotTurnDelay(difficulty)` controls the thinking delay — no changes needed unless the new rule introduces a new bot action type.

### 7. Update rules documentation

Two places must stay in sync:
- **`rules.md`** — long-form markdown reference. Add a new row to the special-cards table and/or a new section for the rule.
- **`screens/rules/SpecialCardsScreen.tsx`** (or the relevant rules screen under `screens/rules/`) — the in-app rules UI. This is handwritten React Native, not auto-generated from `rules.md`.

### 8. Write or extend tests

Rule logic tests live in `__tests__/game/gameLogic.test.ts`.

```ts
// __tests__/game/gameLogic.test.ts
import { getValidMoves, applyCardEffect } from '../../game';
import type { Card, GameState } from '../../game/types';

describe('new rule: <rule name>', () => {
  it('allows <action> when <condition>', () => {
    // arrange
    // act
    // assert
  });

  it('blocks <action> when <condition>', () => {
    // ...
  });
});
```

## Validation

```bash
npm run build:core                                     # must compile cleanly
npm test -- --runTestsByPath __tests__/game/gameLogic.test.ts --runInBand
npm test -w hello-world-mobile-server                  # server tests must pass
npm test                                               # full test suite
```
