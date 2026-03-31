---
mode: agent
description: Create a new animated UI component following react-native-reanimated patterns used in the project
tools:
  - codebase
  - editFiles
---

# Add a New Animated Component

Create a new UI component for the hello-world-mobile app. Follow the project's animation patterns (react-native-reanimated) and style conventions.

## What to ask me first (if not already specified)

1. What is the component name and what does it render?
2. Does it need animation (flip, scale, slide, fade)?
3. Is it interactive (pressable / selectable)?
4. Does it belong in `components/` (reusable) or inside a specific screen?

## File placement

- Reusable, domain-independent components → `components/MyComponent.tsx`
- Export via `components/index.ts` barrel
- Screen-specific sub-views → inline in the screen file or a co-located file

## Component skeleton

```tsx
// components/MyComponent.tsx
import React, { useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface MyComponentProps {
  readonly active?: boolean;
  readonly onPress?: () => void;
}

export default function MyComponent({ active = false, onPress }: MyComponentProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = active
      ? withSpring(1.1, { damping: 15, stiffness: 300 })
      : withSpring(1,   { damping: 15, stiffness: 300 });
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* content */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    // styles here, never inline
  },
});
```

## Animation recipes

### Scale pop (card selection)
```ts
// withSpring for physical feel
scale.value = withSpring(selected ? 1.05 : 1, { damping: 15, stiffness: 300 });
translateY.value = withSpring(selected ? -12 : 0, { damping: 15, stiffness: 300 });
```

### 3D card flip
```ts
// withTiming for predictable duration
flipProgress.value = withTiming(faceDown ? 0 : 1, {
  duration: 300,
  easing: Easing.inOut(Easing.ease),
});

// Two faces — front and back — both with backfaceVisibility: 'hidden'
const frontStyle = useAnimatedStyle(() => ({
  transform: [
    { perspective: 1000 },                                   // always first on Android
    { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 0])}deg` },
  ],
  backfaceVisibility: 'hidden',
}));

const backStyle = useAnimatedStyle(() => ({
  transform: [
    { perspective: 1000 },
    { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, -180])}deg` },
  ],
  backfaceVisibility: 'hidden',
  position: 'absolute',
  top: 0, left: 0,
}));
```

### Fade + slide entering animation (new card drawn)
```tsx
// Guard with Platform check — entering/layout animations are not supported on web
<Animated.View
  entering={Platform.OS !== 'web' ? FadeInDown.delay(entryDelay).duration(300) : undefined}
>
```

### Layout transition (hand reorganisation)
```tsx
import { Layout } from 'react-native-reanimated';

<Animated.View layout={Platform.OS !== 'web' ? Layout.springify() : undefined}>
```

### Pulse glow (draw pressure indicator)
```ts
const glowOpacity = useSharedValue(0);

useEffect(() => {
  if (drawPressure > 0) {
    glowOpacity.value = withRepeat(
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,   // infinite
      true  // reverse
    );
  } else {
    glowOpacity.value = withTiming(0, { duration: 300 });
  }
}, [drawPressure, glowOpacity]);
```

## Interactive components

For pressable animated components wrap `TouchableOpacity` with `Animated.createAnimatedComponent`:

```tsx
import { TouchableOpacity } from 'react-native';
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

<AnimatedTouchable
  style={[styles.card, animatedStyle]}
  onPress={handlePress}
  activeOpacity={0.9}
  accessibilityLabel="Card: 5 of Hearts"
  accessibilityRole="button"
  disabled={disabled}
>
```

## Web compatibility rules

- **Never** use `entering`, `exiting`, or `layout` props without a `Platform.OS !== 'web'` guard.
- **Always** add `perspective: 1000` as the first transform in 3D animations (required on Android).
- For confetti or particle-heavy animations, render static decoration on web and animate only on native.

## Haptic feedback in components

Components should **not** import haptic utilities directly. Instead, accept `onPress` callbacks from the parent screen and let the screen call haptics. Exception: generic wrappers (e.g., an animated button primitive) may call `hapticButtonPress()` if that feedback is always appropriate for every use.

## Casino color palette

```ts
const colors = {
  background:  '#1a1a2e',
  gold:        '#ffd700',
  red:         '#e63946',
  blue:        '#60a5fa',
  white:       '#ffffff',
  mutedText:   '#a0a0a0',
  disabled:    '#666666',
};
```

## Export the component

Add the export to `components/index.ts`:

```ts
export { default as MyComponent } from './MyComponent';
```

## Write a test

```tsx
// __tests__/components/MyComponent.test.tsx
import React from 'react';
import { render } from '../test-utils';
import MyComponent from '../../components/MyComponent';

describe('MyComponent', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<MyComponent />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders in active state', () => {
    const { getByTestId } = render(<MyComponent active testID="my-component" />);
    expect(getByTestId('my-component')).toBeTruthy();
  });
});
```

## Validation

```bash
npm test -- --runTestsByPath __tests__/components/MyComponent.test.tsx --runInBand
npm test
```
