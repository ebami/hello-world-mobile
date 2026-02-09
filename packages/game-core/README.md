# @hello-world/game-core

Shared game types and pure logic for the card game, consumed by both the React Native client and the Socket.IO server.

## Contents

| Module | Exports |
|--------|---------|
| `types` | `Suit`, `Rank`, `Card`, `GameState`, `PlayerSummary`, `PublicGameView`, `PrivateHandPayload`, `RoomInfo`, `CreateRoomOptions`, `JoinRoomOptions`, `GameAction*`, `ServerToClientEvents`, `ClientToServerEvents` |
| `deck` | `generateDeck`, `shuffleDeck`, `dealCards` |
| `gameLogic` | `getValidMoves`, `drawCards`, `applyCardEffect`, `applyPenalty`, `isGameOver`, `declareLastCard`, `GameOverResult` |

## Usage

```typescript
import { generateDeck, shuffleDeck, dealCards, applyCardEffect } from '@hello-world/game-core';
import type { Card, GameState } from '@hello-world/game-core';
```

## Building

```bash
# From the repo root
npm run build:core

# Or from this directory
npm run build

# Watch mode for development
npm run dev
```

The build outputs CommonJS to `dist/` with declaration files. Metro (React Native) resolves the TypeScript source directly via the `source` field in `package.json`.

## Architecture Notes

- All functions are **pure** — no side effects, no platform dependencies.
- The client's `game/` directory contains thin re-export shims pointing here.
- The server imports directly from `@hello-world/game-core`.
- AI logic (`getComputerMove`, `getBotTurnDelay`) remains client-only in `game/ai.ts`.
