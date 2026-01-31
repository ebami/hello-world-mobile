/**
 * Jest setup for server tests
 * 
 * This file runs before each test file and sets up common mocks
 * and test environment configuration.
 */

// Increase timeout for async tests
jest.setTimeout(10000);

// Mock console.log to reduce noise in tests (optional)
// Uncomment if you want to suppress logs during testing
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
