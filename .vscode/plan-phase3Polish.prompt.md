## Plan: Phase 3 Polish — Animations, Sound, and Stats ✅ COMPLETED

> **Status:** Implemented February 2026  
> **Dependencies:** react-native-reanimated@4.2.1, react-native-gesture-handler@2.30.0, expo-audio@1.1.1, expo-haptics@15.0.8, @react-native-async-storage/async-storage@2.2.0

Add visual polish with react-native-reanimated card animations, audio feedback with expo-audio, and player progression tracking via AsyncStorage persistence.

### Steps

1. ✅ **Install polish dependencies** — Added `react-native-reanimated` (v4.2.1), `react-native-gesture-handler` (v2.30.0), `expo-audio` (v1.1.1), `expo-haptics`, and `@react-native-async-storage/async-storage` to `package.json`. Configured reanimated babel plugin.

2. ✅ **Create animated Card component** — Refactored `components/Card.tsx` to use `Animated.View` with `useSharedValue` and `useAnimatedStyle`. Added flip animation (faceDown ↔ faceUp), selection scale/pop effect with lift, and press feedback animation.

3. ✅ **Add Hand dealing and draw animations** — Updated `components/Hand.tsx` with `Layout` transitions from reanimated for automatic reorganization. Added `SlideInRight` entering animation for newly drawn cards.

4. ✅ **Animate discard pile and deck** — Enhanced `components/DiscardPile.tsx` with card landing animation (scale + rotation), and pulsing glow effect for draw pressure indicator.

5. ✅ **Create sound manager** — Added `utils/soundManager.ts` using `expo-audio` with preloaded sounds API. Created `assets/sounds/` folder structure (audio files to be added).

6. ✅ **Add haptic feedback** — Integrated `expo-haptics` for button presses (light impact), card selection (selection feedback), card played (medium impact), draw card (light), and game over (success/error notification).

7. ✅ **Design stats schema and persistence** — Created `stores/statsStore.ts` with Zustand + AsyncStorage persist middleware. Tracks games played, wins/losses by difficulty, win streaks, and timestamps. Uses conditional persistence (native only) to avoid web compatibility issues.

8. ✅ **Build stats tracking in GameScreen** — Updated `screens/GameScreen.tsx` game over handler to call stats store with outcome, difficulty, and cards played count.

9. ✅ **Create Stats screen** — Added `screens/StatsScreen.tsx` displaying win rate, games by difficulty, current/best streaks, and total cards played. Added navigation button to `screens/HomeScreen.tsx`.

10. ✅ **Add win/lose celebration** — Created `components/GameOverOverlay.tsx` with animated confetti (win), fade overlay (loss), victory/defeat sounds, haptics, and "Play Again" / "View Stats" / "Main Menu" actions.

### Web Compatibility Notes

All animations include `Platform.OS !== 'web'` checks to gracefully degrade on web:
- **Card flip:** Works on all platforms
- **Layout transitions:** Disabled on web
- **Entering animations:** Disabled on web  
- **Confetti particles:** Static decoration on web, animated on native
- **Stats persistence:** In-memory only on web (zustand/middleware uses import.meta)

### Sound Assets Needed

```
assets/sounds/
├── card-flip.mp3      # 0.2s, subtle paper sound
├── card-play.mp3      # 0.3s, card slap on table
├── draw-card.mp3      # 0.2s, card slide
├── shuffle.mp3        # 1.0s, deck riffle
├── win.mp3            # 1.5s, triumphant jingle
├── lose.mp3           # 1.0s, subtle disappointment
├── button-tap.mp3     # 0.1s, soft click
└── last-card.mp3      # 0.3s, alert chime
```

### Stats Schema

```typescript
interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  byDifficulty: {
    easy: { played: number; wins: number };
    medium: { played: number; wins: number };
    hard: { played: number; wins: number };
  };
  currentWinStreak: number;
  bestWinStreak: number;
  totalCardsPlayed: number;
  lastPlayed: string;
}
```

### Animation Components

| Component | Animation | Trigger |
|-----------|-----------|---------|
| `Card` | 3D flip (rotateY 0→180°) | `faceDown` prop change |
| `Card` | Scale pop (1→1.1→1) | `selected` prop change |
| `Card` | Fly to position | Card played to discard |
| `Hand` | Staggered fade+slide in | Initial deal |
| `Hand` | Slide in from deck | Card drawn |
| `Hand` | Layout transition | Cards rearranged |
| `DiscardPile` | Scale + drop shadow | Card lands |
| `DiscardPile` | Shuffle riffle | Deck reshuffled |
| `DiscardPile` | Pulse glow | Draw pressure active |
| `GameOver` | Confetti burst | Player wins |
| `GameOver` | Fade overlay | Player loses |

### Haptic Feedback Map

| Action | Haptic Type | Notes |
|--------|-------------|-------|
| Button press | `impactLight` | All touchable buttons |
| Card selection | `selection` | Toggle card selected state |
| Card played | `impactMedium` | Confirm action |
| Draw card | `impactLight` | Subtle feedback |
| Game win | `notificationSuccess` | Celebration |
| Game loss | `notificationError` | Disappointment |
| Invalid move | `notificationWarning` | Error feedback |

### Architecture Decisions

1. **Sound manager singleton** — Preload core sounds at app launch, expose `playSound(name)` function. Lazy-load win/lose sounds when game starts.

2. **Animation timing** — Card flip: 300ms, selection pop: 150ms, card fly: 400ms with spring physics. All use `useNativeDriver` for 60fps.

3. **Stats persistence** — Zustand store with `persist` middleware using AsyncStorage. Auto-save on every game outcome. Hydrate on app launch.

4. **Performance budget** — Target 60fps on mid-range Android. Reduce particle count in confetti if frame drops detected. Disable animations in accessibility reduced-motion mode.

### Implementation Priority

| Feature | Complexity | Impact | Order |
|---------|------------|--------|-------|
| AsyncStorage stats | Low | Medium | 1st |
| Button haptics | Low | Low | 2nd |
| Sound effects | Medium | High | 3rd |
| Card play animation | Medium | High | 4th |
| Card draw animation | Medium | Medium | 5th |
| Card flip animation | High | Medium | 6th |
| Dealing animation | High | Low | 7th |
| Stats screen UI | Medium | Medium | 8th |
| Win celebration | Medium | High | 9th |
