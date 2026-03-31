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
- Do not assume single-player already goes through the transport abstraction. `networking\LocalTransport` exists and has tests, but the live `GameScreen` still runs local play through `useReducer` and direct game helpers. Keep both paths consistent when changing single-player behavior.
- Root Jest maps `@hello-world/game-core` to workspace source, so root tests exercise TypeScript source directly instead of built `dist`. Server Jest also maps the workspace package to source.
- Tests are organized by domain under `__tests__\game`, `__tests__\networking`, `__tests__\screens`, `__tests__\stores`, and `__tests__\integration`. Extend the closest existing suite instead of inventing a new pattern.
- The long-form rule reference lives in `rules.md`, while the in-app rules experience under `screens\rules\` is handwritten React Native content, not generated from those markdown files. Rule changes can require updating both.
- `stores\statsStore.ts` persists stats only on native platforms. On web it intentionally falls back to a non-persisted store.

## Testing patterns

- Import from `__tests__/test-utils.tsx` instead of `@testing-library/react-native` directly — it re-exports everything and adds project-specific helpers (`renderWithProviders`, `createMockTransport`, `createMockSocket`, `testData.*`).
- Use `testData.card()`, `testData.hand()`, `testData.roomInfo()`, `testData.publicGameView()`, and `testData.privateHandPayload()` for consistent domain fixtures. Pass partial overrides to tailor specific test scenarios.
- Use `createMockTransport()` for any test that renders a screen or component that receives a `GameTransport` prop. The mock pre-wires `connect`, `disconnect`, `sendAction`, and `setCallbacks` as `jest.fn()`.
- Call `useSessionStore.getState().reset()` inside `beforeEach` for every test that touches `sessionStore` — the store is a module singleton and state leaks between tests otherwise.
- Mock game modules at the top of the file with `jest.mock('../../game', () => ({ ... }))` for transport/screen tests that should not run actual game logic.
- Use `jest.useFakeTimers()` / `jest.runAllTimers()` / `jest.useRealTimers()` for tests involving bot move scheduling in `LocalTransport` or any `setTimeout`-based logic.
- Wrap async state-updating test steps in `await waitFor(() => expect(...))` from Testing Library, not in raw `await act(...)`.
- Server tests (under `server/src/*.test.ts`) use `ts-jest` and have their own `jest.config.js`. Run them with `npm test -w hello-world-mobile-server`.
- Integration tests live under `__tests__/integration/` and cover cross-screen navigation and rules content. Keep them coarse-grained (render + assert presence) rather than unit-level.

## Component and UI patterns

- All interactive elements must include `accessibilityLabel` and `accessibilityRole` props — see `HomeScreen.tsx` button examples.
- Wrap `TouchableOpacity` in `Animated.createAnimatedComponent(TouchableOpacity)` when it needs animation-driven transforms; otherwise use plain `TouchableOpacity`.
- All styles are defined with `StyleSheet.create({...})` at the bottom of each file, never inline.
- Casino color palette: background `#1a1a2e`, gold `#ffd700`, red `#e63946`, blue `#60a5fa`, muted text `#a0a0a0`, disabled `#666`.
- Screens use `SafeAreaView` from `react-native-safe-area-context` as their root container. `StatusBar` comes from `expo-status-bar` (not `react-native`).
- Call `hapticButtonPress()` from `utils/haptics` at the start of every `onPress` handler that is a primary user action. Use `hapticCardPlayed`, `hapticDrawCard`, `hapticInvalidMove`, `hapticGameWin`, and `hapticGameLoss` for game-specific actions. All haptic helpers are fire-and-forget — do not `await` them in event handlers.
- Play sounds via the named helpers from `utils/soundManager` (`playCardPlay`, `playDrawCard`, etc.). Sound files are optional — the manager degrades silently when assets are absent.
- Components receive only what they need through props; never import `useSessionStore` or `useStatsStore` inside a component — pass data down from the screen.

## Animation patterns (react-native-reanimated)

- Use `useSharedValue` + `useAnimatedStyle` for declarative transform animations. Trigger changes inside `useEffect` with `withSpring` or `withTiming`.
- Use `withSpring` for interactive/physical motion (card selection lift: `stiffness: 300, damping: 15`). Use `withTiming` with `Easing.inOut(Easing.ease)` for state transitions (card flip: 300 ms).
- Wrap entering animations in a `Platform.OS !== 'web'` guard — `FadeInDown`, `SlideInRight`, and `Layout` transitions are not supported on web and must be conditionally omitted via the `entering` and `layout` props.
- Use `backfaceVisibility: 'hidden'` on both faces of flip animations.
- Always add `perspective: 1000` inside the transform array before `rotateY` for correct 3D rendering on Android.
- Confetti and particle-heavy animations must also degrade gracefully on web (static decoration only).

## State management patterns

- `useReducer` is used in `GameScreen` for single-player game state. Keep the reducer pure: no side effects, no async, no store access inside it.
- `useSessionStore` (Zustand) is for connection/lobby metadata only. Call `useSessionStore.getState()` for imperative updates from callbacks or event handlers outside React; use the hook inside components.
- `useStatsStore` is for aggregated stats that outlive a single game session. It persists to AsyncStorage on native via `zustand/middleware`'s `persist`. Never call `persist` on web — the store creates a plain in-memory store via the `Platform.OS === 'web'` branch.
- When resetting to home, call `transport.disconnect()` before clearing transport state, then call `useSessionStore.getState().reset()` to flush session metadata.

## Networking / transport patterns

- `GameTransport` (defined in `networking/types.ts`) is the only interface screens and components should depend on — never import `SocketTransport` or `LocalTransport` directly inside game UI components.
- `SocketTransport` is instantiated once in `LobbyScreen` and passed through `HomeScreen` state to the game screens. Never re-instantiate it mid-flow.
- `setCallbacks` is idempotent — calling it again merges with existing callbacks. In `useEffect`, always register callbacks and return `transport.disconnect` (or a no-op) as the cleanup.
- On the server, all player identity in `RoomInfo.players` uses `playerName` as `playerId`. The `socketIds` map (`playerId → socketId`) is internal to `RoomManager` and must never be sent to clients.

## Adding a new screen

1. Create `screens/MyScreen.tsx` with `SafeAreaView` root and `StyleSheet.create` styles at the bottom.
2. Add `'my-screen'` to the `ScreenState` union in `HomeScreen.tsx`.
3. Add an `if (currentScreen === 'my-screen')` branch rendering `<MyScreen>` in `HomeScreen.tsx`.
4. Provide `onBack: () => void` (calls `handleBackToHome`) and any data props needed.
5. Add a test file at `__tests__/screens/MyScreen.test.tsx` following the pattern of nearby screen tests.

## Adding a new game rule or card effect

1. Modify `packages/game-core/src/gameLogic.ts` first (shared by client and server).
2. Update `packages/game-core/src/types.ts` if new fields are needed on `GameState` or `PublicGameView`.
3. Run `npm run build:core` to rebuild the shared package.
4. Reflect the change in `GameScreen.tsx` reducer if the single-player path needs to handle new state.
5. Update `server/src/gameHandler.ts` if the server-side action handler needs adjustment.
6. Update both `rules.md` (long-form reference) and the relevant screen under `screens/rules/` (in-app UI).
7. Update or add tests in `__tests__/game/gameLogic.test.ts` for the rule logic.

## Anti-patterns to avoid

- Do not import `SocketTransport` or `LocalTransport` inside `components/` or game screen `useEffect`/render paths.
- Do not store live game state (`PublicGameView`, `Card[]`) in `useSessionStore` — that store is session metadata only.
- Do not call `StyleSheet.create` inside a component function body — always define styles in module scope.
- Do not use `Platform.select` for animation enabling/disabling — use `Platform.OS !== 'web'` guards for the specific animation prop.
- Do not mutate `GameState` directly — always return a new object from the reducer or `game-core` helpers.
- Do not add `async`/`await` inside the Zustand store creator functions — all actions are synchronous.
- Do not add new top-level files to `game/` — that folder contains only re-export shims. New shared logic belongs in `packages/game-core/src/`.
