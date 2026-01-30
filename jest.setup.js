// Import jest-native matchers (built into @testing-library/react-native v12.4+)
import '@testing-library/react-native';

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
