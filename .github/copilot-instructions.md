# Copilot Instructions

## Build, run, and test commands

- App development:
  - `npm start`
  - `npm run android`
  - `npm run ios`
  - `npm run web`
- Shared workspace and server:
  - `npm run build:core`
  - `npm run dev:server` — builds `@hello-world/game-core` first, then runs `hello-world-mobile-server` in watch mode
  - `npm run build -w hello-world-mobile-server`
- Root app tests:
  - `npm test`
  - `npm test -- --runTestsByPath __tests__\screens\LobbyScreen.test.tsx --runInBand`
  - `npm run test:coverage`
- Server tests:
  - `npm test -w hello-world-mobile-server`
  - `npm test -w hello-world-mobile-server -- --runTestsByPath src\roomManager.test.ts --runInBand`
- Lint:
  - No lint script is currently defined in the root or workspace `package.json` files.

## High-level architecture

- `App.tsx` only mounts `HomeScreen` inside `SafeAreaProvider`. `screens\HomeScreen.tsx` is a manual screen state machine; there is no React Navigation. New screen flows are wired by extending the `ScreenState` union and the prop handoff in `HomeScreen`.
- Single-player flow is `SinglePlayerSetup` -> `GameScreen`. `screens\GameScreen.tsx` uses `useReducer` plus pure helpers from `game\` and AI from `game\ai.ts`, then records post-game stats through `stores\statsStore.ts`.
- Multiplayer flow is `LobbyScreen` -> `WaitingRoomScreen` -> `MultiplayerGameScreen`. `LobbyScreen` creates the `networking\SocketTransport` instance, `HomeScreen` holds and hands that instance forward, `stores\sessionStore.ts` keeps connection and lobby metadata, and `server\src\gameHandler.ts` stays authoritative for move validation and broadcasts.
- Shared card rules, types, deck utilities, and move validation live in `packages\game-core\src`. The root `game\` folder is mostly backward-compatible re-export shims into that workspace package, while the server imports `@hello-world/game-core` directly.
- On the server, `server\src\index.ts` wires Express + Socket.IO, `server\src\roomManager.ts` manages room membership, socket IDs, and room game state, and `server\src\gameHandler.ts` converts shared `GameState` into public room state plus per-player hand payloads.

## Key conventions

- Keep multiplayer game state out of Zustand. `stores\sessionStore.ts` is only for connection, player, room, and error metadata; live multiplayer game state should come from transport callbacks and server payloads.
- Public multiplayer identity is name-based. `room.hostId` and `player.playerId` exposed to the client are player names, while socket IDs stay server-only. Preserve that distinction when touching host checks, reconnect logic, or room updates.
- Change gameplay rules in `packages\game-core\src` first. The `game\deck.ts`, `game\gameLogic.ts`, and `game\types.ts` files are shims, not the main source of truth. The main client-only exception is `game\ai.ts`.
- Single-player does not go through the transport abstraction. `GameScreen` runs local play through `useReducer` and direct game helpers; only online multiplayer uses a transport (`networking\SocketTransport`). There is intentionally no local transport.
- Root Jest maps `@hello-world/game-core` to workspace source, so root tests exercise TypeScript source directly instead of built `dist`. Server Jest also maps the workspace package to source.
- Tests are organized by domain under `__tests__\game`, `__tests__\networking`, `__tests__\screens`, `__tests__\stores`, and `__tests__\integration`. Extend the closest existing suite instead of inventing a new pattern.
- The long-form rule reference lives in `rules.md`, while the in-app rules experience under `screens\rules\` is handwritten React Native content, not generated from those markdown files. Rule changes can require updating both.
- `stores\statsStore.ts` persists stats only on native platforms. On web it intentionally falls back to a non-persisted store.
