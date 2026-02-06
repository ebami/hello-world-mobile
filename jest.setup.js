// Import jest-native matchers (built into @testing-library/react-native v12.4+)
import '@testing-library/react-native';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  
  const Animated = {
    View,
    Text,
    call: () => {},
    createAnimatedComponent: (component) => component,
  };
  
  return {
    default: Animated,
    View: Animated.View,
    Text: Animated.Text,
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withSpring: (value) => value,
    withTiming: (value) => value,
    withDelay: (_, value) => value,
    withRepeat: (value) => value,
    withSequence: (...values) => values[0],
    interpolate: (value) => value,
    Easing: { inOut: () => {}, ease: {}, linear: {} },
    FadeInDown: { delay: () => ({ duration: () => ({ springify: () => ({}) }) }) },
    FadeInRight: { delay: () => ({ springify: () => ({ damping: () => ({}) }) }) },
    SlideInRight: { delay: () => ({ springify: () => ({ damping: () => ({}) }) }) },
    LinearTransition: { springify: () => ({ damping: () => ({ stiffness: () => ({}) }) }) },
    ZoomIn: { springify: () => ({ damping: () => ({}) }) },
    Layout: { springify: () => ({ damping: () => ({ stiffness: () => ({}) }) }) },
    createAnimatedComponent: (component) => component,
  };
});

// Mock expo-audio
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    release: jest.fn(),
  })),
  AudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock console.warn to reduce noise in tests (optional)
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated') || args[0].includes('useNativeDriver'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};
