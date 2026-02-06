## Plan: Phase 3 Polish — Animations, Sound, and Stats

Add visual polish with react-native-reanimated card animations, audio feedback with expo-av, and player progression tracking via AsyncStorage persistence.

### Steps

1. **Install polish dependencies** — Add `react-native-reanimated` (v3+), `react-native-gesture-handler`, `expo-av`, `expo-haptics`, and `@react-native-async-storage/async-storage` to `package.json`. Configure reanimated babel plugin.

2. **Create animated Card component** — Refactor `components/Card.tsx` to use `Animated.View` with `useSharedValue` and `useAnimatedStyle`. Add flip animation (faceDown ↔ faceUp), selection scale/pop effect, and play animation (fly to discard pile).

3. **Add Hand dealing and draw animations** — Update `components/Hand.tsx` with staggered entry animations for initial deal and smooth card insertion for draws. Use `Layout` transitions from reanimated for automatic reorganization.

4. **Animate discard pile and deck** — Enhance `components/DiscardPile.tsx` with card landing animation, deck shuffle effect when reshuffled, and pulsing draw pressure indicator.

5. **Create sound manager** — Add `utils/soundManager.ts` using `expo-av` with preloaded sounds for card-flip, card-play, draw-card, shuffle, win, lose, and button-tap. Create `assets/sounds/` folder with audio files.

6. **Add haptic feedback** — Integrate `expo-haptics` for button presses (light impact), card selection (selection feedback), and game over (success/error notification).

7. **Design stats schema and persistence** — Create `stores/statsStore.ts` with Zustand + AsyncStorage persist middleware. Track games played, wins/losses by difficulty, win streaks, and timestamps.

8. **Build stats tracking in GameScreen** — Update `screens/GameScreen.tsx` game over handler to call stats store with outcome, difficulty, turns played, and cards played.

9. **Create Stats screen** — Add `screens/StatsScreen.tsx` displaying win rate, games by difficulty, current/best streaks, and total cards played. Add navigation button to `screens/HomeScreen.tsx`.

10. **Add win/lose celebration** — Create animated overlay in GameScreen with confetti (win) or subtle effect (loss), victory/defeat sound, and "Play Again" / "View Stats" actions.

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
