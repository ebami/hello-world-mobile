# Plan: Integrate Black-Jack-Urban Game into Mobile App

Migrate the black-jack-urban web game into hello-world-mobile (Expo). After integration, **hello-world-mobile becomes the source of truth** — the web version will be deprecated.

## Definition of Done

MVP complete when a user can play a full single-player game against AI on iOS/Android.

## Pre-existing (No Work Needed)

- ✅ Rules screens fully implemented (6 screens with RulesNavigator)
- ✅ Home screen UI complete (casino-themed with PLAY NOW button)
- ✅ Testing infrastructure configured (Jest + React Native Testing Library)
- ✅ State-based navigation pattern established
- ✅ Styling conventions established (casino theme, colors, typography)

---

## Steps

### 1. Verify shared logic compatibility
- Review `black-jack-urban/shared/game/src/` (types, gameLogic, deck, ai) for browser-only dependencies
- Confirm no usage of `crypto`, `fs`, `localStorage`, or incompatible APIs
- **Acceptance:** All game logic files pass a dry import in React Native

### 2. Move game logic into mobile project
- Copy `shared/game/src/` contents into `hello-world-mobile/game/`
- Update import paths as needed
- **Acceptance:** TypeScript compiles with no errors

### 3. Port card assets
- Copy PNGs from `bj-card-game/src/assets/cards/` to `hello-world-mobile/assets/cards/`
- Generate @1x/@2x/@3x variants for React Native resolution scaling
- **Acceptance:** Card images render correctly on device

### 4. Extend state-based navigation
- Add screen states to `HomeScreen.tsx`: `'home' | 'rules' | 'setup' | 'game'`
- Wire screen rendering based on state
- Define flow: Home → Setup → Game → Result → Home
- **Acceptance:** Navigation between screens works via state

### 5. Create native game components
Use **existing hello-world-mobile styling patterns** (casino theme, colors, button styles from `HomeScreen.tsx` and rules screens).

Components to create:
- `Card.tsx` — card image display
- `Hand.tsx` — player/opponent hand layout (use `FlatList` or `ScrollView`)
- `ActionButtons.tsx` — draw, pass, etc. (match existing button styles)
- `PlayerArea.tsx` — score and hand container

**Acceptance:** Components render with consistent casino-themed styling; snapshot tests pass

### 6. Build SinglePlayerSetup screen
- Difficulty picker (Easy / Medium / Hard)
- Start game button
- Use existing screen layout and button patterns from rules screens
- **Acceptance:** User can select difficulty and proceed to game

### 7. Build GameScreen
- Port `CardGameUI.tsx` logic
- Integrate AI opponent from `game/ai.ts`
- Use React Native Context + useReducer for game state
- Apply existing hello-world-mobile styling throughout
- Handle: draw, play, pass, win/lose conditions
- **Acceptance:** Full game loop works against AI

### 8. Add error handling
- Create `ErrorBoundary` component for game screens
- Handle edge cases (empty deck, invalid moves)
- **Acceptance:** App doesn't crash on errors; shows friendly message

### 9. Wire PLAY NOW button
- Add `onPress` handler to existing PLAY NOW button in `HomeScreen.tsx`
- Navigate to SinglePlayerSetup screen
- **Acceptance:** Tapping PLAY NOW opens setup screen

### 10. Accessibility pass
- Add `accessibilityLabel` to cards and buttons (VoiceOver/TalkBack)
- Ensure touch targets are ≥44pt
- **Acceptance:** Basic screen reader navigation works

### 11. End-to-end smoke test
- Test full flow on iOS simulator and Android emulator
- Verify game completes without crashes
- **Acceptance:** One full game played successfully on each platform

---

## Architecture Decisions

| Decision | Choice |
|----------|--------|
| **Source of truth** | hello-world-mobile — web version deprecated |
| **State management** | React Native Context + useReducer |
| **Animations** | React Native Animated API |
| **Navigation** | State-based (extend current pattern) |
| **Styling** | Use existing hello-world-mobile patterns (no porting) |
| **Components** | React Native primitives (View, Text, Image, TouchableOpacity, FlatList, ScrollView) |
| **Storage** | React Native AsyncStorage (if persistence needed) |
| **Testing** | React Native Testing Library + Jest |

> **Principle:** All implementation choices must be React Native native. Styling follows existing hello-world-mobile conventions.

---

## Future Phases

### Phase 2: Multiplayer
- Add Socket.IO with React Native polyfills
- Design transport-agnostic game state interface
- Server sync and lobby UI

### Phase 3: Polish
- Advanced animations (card flip, dealing) with react-native-reanimated
- Sound effects
- Leaderboards / stats persistence with AsyncStorage
