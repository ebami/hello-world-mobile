---
mode: agent
description: Add a new screen to the hello-world-mobile app following established patterns
tools:
  - codebase
  - editFiles
---

# Add a New Screen

Add a new screen to the hello-world-mobile app. Follow the project's manual state-machine navigation pattern — there is **no React Navigation**.

## What to ask me first (if not already specified)

1. What is the screen name and its purpose?
2. What props does it need (e.g., `onBack`, data passed in from `HomeScreen`)?
3. Is it part of the single-player flow, multiplayer flow, or standalone (e.g., stats, rules)?

## Checklist

### 1. Create `screens/MyScreen.tsx`

- Root element must be `<SafeAreaView>` from `react-native-safe-area-context`.
- `<StatusBar>` uses `expo-status-bar`, not `react-native`.
- All styles defined with `StyleSheet.create({...})` at the **bottom** of the file (never inline, never inside the component function).
- All `TouchableOpacity` buttons must include `accessibilityLabel` and `accessibilityRole="button"`.
- Call `hapticButtonPress()` from `utils/haptics` at the start of every primary `onPress` handler.
- Use the casino color palette: background `#1a1a2e`, gold `#ffd700`, red `#e63946`, blue `#60a5fa`.
- Declare props interface with `readonly` modifiers.

```tsx
// screens/MyScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { hapticButtonPress } from '../utils/haptics';

interface MyScreenProps {
  readonly onBack: () => void;
  // add other props here
}

export default function MyScreen({ onBack }: MyScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <TouchableOpacity
        onPress={() => { hapticButtonPress(); onBack(); }}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    color: '#ffd700',
    fontSize: 16,
    padding: 16,
  },
});
```

### 2. Wire up in `screens/HomeScreen.tsx`

- Add the new screen name to the `ScreenState` union type.
- Add an `if (currentScreen === 'my-screen')` branch that renders `<MyScreen>`.
- Pass `onBack={handleBackToHome}` plus any data props held in `HomeScreen` state.
- If the screen needs multiplayer transport or game state, store those in `HomeScreen` state and pass them down — do **not** import stores inside the screen component itself.

```tsx
// In HomeScreen.tsx

type ScreenState = 'home' | 'rules' | 'setup' | 'game' | 'lobby' | 'waiting' | 'multiplayer-game' | 'stats' | 'my-screen';

// Add rendering branch:
if (currentScreen === 'my-screen') {
  return <MyScreen onBack={handleBackToHome} />;
}
```

### 3. Add a navigation entry point

- Add a `TouchableOpacity` button to `HomeScreen`'s home menu (or the screen that should lead to it).
- Call `hapticButtonPress()` in its `onPress`.

### 4. Write a test file at `__tests__/screens/MyScreen.test.tsx`

- Import `render`, `fireEvent`, and helpers from `../__tests__/test-utils` (not `@testing-library/react-native` directly).
- Organize with `describe('MyScreen', () => { describe('rendering', ...) describe('interactions', ...) })`.
- Test: renders expected elements, back button calls `onBack`.
- If the screen uses `useSessionStore`, call `useSessionStore.getState().reset()` in `beforeEach`.
- If the screen uses a transport, use `createMockTransport()` from test-utils.

```tsx
// __tests__/screens/MyScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '../test-utils';
import MyScreen from '../../screens/MyScreen';

describe('MyScreen', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the screen', () => {
      const { getByText } = render(<MyScreen onBack={mockOnBack} />);
      expect(getByText('← Back')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onBack when back button is pressed', () => {
      const { getByText } = render(<MyScreen onBack={mockOnBack} />);
      fireEvent.press(getByText('← Back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });
});
```

### 5. Export from `screens/` if needed

If the project uses an index barrel file for screens, add the export there.

## Validation

After completing the above:
1. Run `npm test -- --runTestsByPath __tests__/screens/MyScreen.test.tsx --runInBand` to verify the new test passes.
2. Run `npm test` to ensure no existing tests are broken.
