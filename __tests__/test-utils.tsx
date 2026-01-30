/**
 * Test utilities and helpers
 * 
 * This file provides reusable test utilities that can be extended
 * as the project grows. Import these helpers in your test files.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

/**
 * Custom render function that can be extended with providers
 * (e.g., ThemeProvider, NavigationContainer, Redux store, etc.)
 * 
 * As the project grows, add providers here to wrap all tests automatically.
 * 
 * @example
 * // In your test file:
 * import { renderWithProviders } from '../test-utils';
 * 
 * it('renders with all providers', () => {
 *   renderWithProviders(<MyComponent />);
 * });
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Add providers here as the project grows
  // Example with a theme provider:
  // const Wrapper = ({ children }: { children: React.ReactNode }) => (
  //   <ThemeProvider theme={defaultTheme}>
  //     {children}
  //   </ThemeProvider>
  // );
  
  return render(ui, { ...options });
}

/**
 * Creates a mock function with typed return value
 */
export function createMockFn<T = void>() {
  return jest.fn<T, []>();
}

/**
 * Waits for a specified amount of time
 * Useful for testing animations or delayed effects
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Common test data factories
 * Extend with factories for your domain objects as the project grows
 */
export const testData = {
  // Example: Create test card data
  // card: (overrides = {}) => ({
  //   suit: 'hearts',
  //   rank: 'A',
  //   value: 11,
  //   ...overrides,
  // }),
};

/**
 * Re-export everything from @testing-library/react-native for convenience
 */
export * from '@testing-library/react-native';
