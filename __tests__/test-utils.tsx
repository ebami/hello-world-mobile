/**
 * Test utilities and helpers
 * 
 * This file provides reusable test utilities that can be extended
 * as the project grows. Import these helpers in your test files.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import type { Card, PlayerSummary, PublicGameView, PrivateHandPayload } from '../game/types';
import type { RoomInfo, GameTransport, TransportCallbacks, ConnectionStatus } from '../networking/types';

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
  /**
   * Create a test card
   */
  card: (overrides: Partial<Card> = {}): Card => ({
    suit: 'hearts',
    rank: '5',
    id: `card-${Math.random().toString(36).slice(2, 9)}`,
    ...overrides,
  }),

  /**
   * Create a test hand of cards
   */
  hand: (count = 5): Card[] =>
    Array.from({ length: count }, (_, i) =>
      testData.card({ id: `card-${i}` })
    ),

  /**
   * Create a test player summary
   */
  playerSummary: (overrides: Partial<PlayerSummary> = {}): PlayerSummary => ({
    playerId: `player-${Math.random().toString(36).slice(2, 9)}`,
    handCount: 5,
    connected: true,
    isBot: false,
    ...overrides,
  }),

  /**
   * Create a test room info
   */
  roomInfo: (overrides: Partial<RoomInfo> = {}): RoomInfo => ({
    roomId: 'ABC123',
    hostId: 'player-1',
    players: [
      testData.playerSummary({ playerId: 'player-1' }),
      testData.playerSummary({ playerId: 'player-2' }),
    ],
    ...overrides,
  }),

  /**
   * Create a test public game view
   */
  publicGameView: (overrides: Partial<PublicGameView> = {}): PublicGameView => ({
    roomId: 'ABC123',
    deckCount: 40,
    discardPile: [testData.card()],
    currentPlayer: 0,
    direction: 1,
    message: 'Your turn',
    lastCardCalled: [false, false],
    drawPressure: 0,
    hasPlayed: [false, false],
    players: [
      testData.playerSummary({ playerId: 'player-1' }),
      testData.playerSummary({ playerId: 'player-2' }),
    ],
    ...overrides,
  }),

  /**
   * Create a test private hand payload
   */
  privateHandPayload: (overrides: Partial<PrivateHandPayload> = {}): PrivateHandPayload => ({
    roomId: 'ABC123',
    playerId: 'player-1',
    hand: testData.hand(5),
    ...overrides,
  }),
};

/**
 * Create a mock GameTransport for testing
 */
export function createMockTransport(
  overrides: Partial<GameTransport> = {}
): jest.Mocked<GameTransport> {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    getConnectionStatus: jest.fn().mockReturnValue('connected' as ConnectionStatus),
    sendAction: jest.fn(),
    setCallbacks: jest.fn(),
    ...overrides,
  };
}

/**
 * Create a mock socket for Socket.IO testing
 */
export function createMockSocket() {
  return {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    id: 'mock-socket-id',
    io: {
      on: jest.fn(),
    },
  };
}

/**
 * Socket.IO client mock factory
 * Use this in jest.mock('socket.io-client', ...)
 */
export function createSocketIoMock() {
  const mockSocket = createMockSocket();
  return {
    io: jest.fn(() => mockSocket),
    mockSocket,
  };
}

/**
 * Re-export everything from @testing-library/react-native for convenience
 */
export * from '@testing-library/react-native';
