---
mode: agent
description: Write tests for any part of the hello-world-mobile app following established test patterns
tools:
  - codebase
  - editFiles
---

# Write Tests

Write Jest tests for the hello-world-mobile project. Follow established patterns from the existing test suites.

## What to ask me first (if not already specified)

1. What are you testing? (screen, component, game logic, store, transport, server handler, integration)
2. Is this a new test file or extending an existing one?
3. Are there specific scenarios or edge cases to cover?

## Test file placement

| What you're testing | Test file location |
|---|---|
| Screen (e.g., `HomeScreen`) | `__tests__/screens/HomeScreen.test.tsx` |
| Component (e.g., `Card`) | `__tests__/components/Card.test.tsx` |
| Game logic | `__tests__/game/gameLogic.test.ts` |
| AI logic | `__tests__/game/ai.test.ts` |
| Transport (LocalTransport / SocketTransport) | `__tests__/networking/localTransport.test.ts` |
| Zustand stores | `__tests__/stores/sessionStore.test.ts` |
| Server RoomManager | `server/src/roomManager.test.ts` |
| Server GameHandler | `server/src/gameHandler.test.ts` |
| Cross-screen flows | `__tests__/integration/navigation.test.tsx` |

## Import conventions

**Always** import from the project's test-utils barrel, not from Testing Library directly:

```ts
// ✅ correct
import { render, fireEvent, waitFor } from '../test-utils';
import { testData, createMockTransport } from '../test-utils';

// ❌ avoid
import { render } from '@testing-library/react-native';
```

The barrel at `__tests__/test-utils.tsx` re-exports everything from `@testing-library/react-native` plus project-specific helpers.

## Test data factories

Use `testData.*` factories for consistent domain objects:

```ts
import { testData } from '../test-utils';

const card      = testData.card({ rank: '2', suit: '♠' });
const hand      = testData.hand(3);               // 3 cards
const room      = testData.roomInfo({ roomId: 'XYZ999' });
const gameView  = testData.publicGameView({ currentPlayer: 1 });
const handLoad  = testData.privateHandPayload({ playerId: 'alice' });
```

## Mock patterns by category

### Screen tests (React component + store)

```tsx
// Mock external dependencies at the top of the file
jest.mock('../../networking', () => ({
  SocketTransport: jest.fn().mockImplementation(() => createMockTransport()),
}));

jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

describe('MyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset(); // prevent state leaks between tests
  });

  it('renders the screen', () => {
    const { getByText } = render(<MyScreen onBack={jest.fn()} />);
    expect(getByText('Expected Text')).toBeTruthy();
  });
});
```

### Transport tests (LocalTransport / SocketTransport)

```ts
describe('LocalTransport', () => {
  let transport: LocalTransport;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    transport = new LocalTransport('medium');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits onGameStart after connect', async () => {
    const onGameStart = jest.fn();
    transport.setCallbacks({ onGameStart });
    await transport.connect();
    jest.runAllTimers();
    expect(onGameStart).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'local-game' }),
      expect.objectContaining({ playerId: 'player' })
    );
  });
});
```

Use `jest.useFakeTimers()` whenever testing bot move scheduling or any `setTimeout`-based logic.

### Game logic tests (pure functions)

```ts
import { getValidMoves, applyCardEffect } from '../../game';
import type { Card } from '../../game/types';

describe('getValidMoves', () => {
  it('returns only draw cards under draw pressure', () => {
    const hand: Card[] = [
      { id: '1', rank: '2', suit: '♠' },
      { id: '2', rank: '5', suit: '♥' },
    ];
    const top: Card = { id: '0', rank: 'K', suit: '♦' };
    const result = getValidMoves(hand, top, 2);
    expect(result.singles).toHaveLength(1);
    expect(result.singles[0].rank).toBe('2');
  });
});
```

No mocking required for pure game-logic tests.

### Zustand store tests

```ts
import { useSessionStore } from '../../stores/sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('sets connection status', () => {
    useSessionStore.getState().setConnectionStatus('connected');
    expect(useSessionStore.getState().connectionStatus).toBe('connected');
  });
});
```

### Server tests (RoomManager / GameHandler)

Server tests live inside `server/src/` and run with `ts-jest`:

```ts
// server/src/roomManager.test.ts
import { roomManager } from './roomManager';

describe('RoomManager', () => {
  beforeEach(() => {
    // reset internal state if the manager exposes a reset, or re-require the module
  });

  it('creates a room with unique code', () => {
    const room = roomManager.createRoom('host', 'Alice', 'socket-1');
    expect(room.roomId).toHaveLength(6);
    expect(room.hostId).toBe('Alice'); // hostId is player NAME, not socket ID
  });
});
```

Run with: `npm test -w hello-world-mobile-server -- --runTestsByPath src/roomManager.test.ts --runInBand`

## Async assertions

```ts
// ✅ use waitFor for async state updates
await waitFor(() => expect(getByText('Connected')).toBeTruthy());

// ❌ avoid raw act() wrapping
```

## Accessibility queries (preferred)

```ts
// Prefer queries that match how users perceive the UI
getByRole('button', { name: /create room/i })
getByLabelText('Enter your name')

// Fallback to text when no accessible name is set
getByText('Create Room')
getByPlaceholderText('Enter your name')
```

## Describe block structure

```ts
describe('ComponentName', () => {
  describe('rendering', () => {
    it('renders expected elements', ...);
    it('renders in loading state', ...);
  });

  describe('interactions', () => {
    it('calls callback when button pressed', ...);
  });

  describe('error handling', () => {
    it('shows alert on error', ...);
  });
});
```

## Validation

```bash
# Run only your new test file
npm test -- --runTestsByPath __tests__/screens/MyScreen.test.tsx --runInBand

# Run all tests to check for regressions
npm test
```
