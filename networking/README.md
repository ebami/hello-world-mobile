# Networking Module

Transport-agnostic networking layer enabling unified game UI across single-player, local multiplayer, and online multiplayer modes.

## Overview

The networking module provides a `GameTransport` interface that abstracts communication between the game UI and the game state, whether that state lives locally (single-player) or on a remote server (multiplayer).

## Architecture

```
networking/
├── types.ts           # Core interfaces and type definitions
├── socket.ts          # Socket.IO connection utility
├── socketTransport.ts # Online multiplayer transport
├── localTransport.ts  # Single-player transport (wraps game logic)
└── index.ts           # Module exports
```

## Quick Start

### Single-Player Mode

```typescript
import { LocalTransport } from './networking';

const transport = new LocalTransport('medium');
transport.setCallbacks({
  onStateUpdate: (state) => updateUI(state),
  onHandUpdate: (hand) => updatePlayerHand(hand),
  onGameOver: (winnerId, message) => showGameOver(message),
});

await transport.connect(); // Initializes game immediately

// Player actions
transport.sendAction({ type: 'PLAY_CARDS', cards: [card] });
transport.sendAction({ type: 'DRAW_CARD' });
transport.sendAction({ type: 'DECLARE_LAST_CARD', player: 0 });
```

### Multiplayer Mode

```typescript
import { SocketTransport } from './networking';

const transport = new SocketTransport('http://localhost:3001');
transport.setCallbacks({
  onConnectionChange: (status) => updateConnectionUI(status),
  onRoomUpdated: (room) => updateLobby(room),
  onGameStart: (state, hand) => startGame(state, hand),
  onStateUpdate: (state) => updateUI(state),
  onHandUpdate: (hand) => updatePlayerHand(hand),
  onGameOver: (winnerId, message) => showGameOver(message),
  onError: (error) => showError(error),
});

await transport.connect();

// Room management
const room = await transport.createRoom({ playerName: 'Alice', maxPlayers: 4 });
// or
const room = await transport.joinRoom({ roomId: 'ABC123', playerName: 'Bob' });

// Start game (host only)
transport.startGame();

// Game actions (same as single-player)
transport.sendAction({ type: 'PLAY_CARDS', cards: [card] });
```

## Core Types

### GameTransport Interface

The main abstraction that all transport implementations must satisfy:

```typescript
interface GameTransport {
  // Connection lifecycle
  connect(): Promise<void>;
  disconnect(): void;
  getConnectionStatus(): ConnectionStatus;

  // Room management (multiplayer only)
  createRoom?(options: CreateRoomOptions): Promise<RoomInfo>;
  joinRoom?(options: JoinRoomOptions): Promise<RoomInfo>;
  leaveRoom?(): void;
  startGame?(): void;

  // Game actions
  sendAction(action: GameAction): void;

  // Event registration
  setCallbacks(callbacks: Partial<TransportCallbacks>): void;
}
```

### Game Actions

Actions that can be sent via `sendAction()`:

| Action | Payload | Description |
|--------|---------|-------------|
| `PLAY_CARDS` | `{ cards: Card[] }` | Play one or more cards from hand |
| `DRAW_CARD` | - | Draw card(s) from deck |
| `DECLARE_LAST_CARD` | `{ player: number }` | Declare last card before going out |

### Transport Callbacks

Events emitted by the transport:

| Callback | Payload | Description |
|----------|---------|-------------|
| `onStateUpdate` | `PublicGameView` | Game state changed |
| `onHandUpdate` | `PrivateHandPayload` | Player's hand updated |
| `onRoomUpdated` | `RoomInfo` | Room/lobby state changed |
| `onGameStart` | `PublicGameView, PrivateHandPayload` | Game has started |
| `onGameOver` | `winnerId, message` | Game ended |
| `onPlayerAction` | `playerId, action` | Another player acted |
| `onError` | `string` | Error occurred |
| `onConnectionChange` | `ConnectionStatus` | Connection status changed |

### Connection Status

```typescript
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
```

## Transport Implementations

### LocalTransport

For single-player mode against AI. Wraps the existing game logic from `game/` and executes synchronously.

**Features:**
- Immediate state updates (no network latency)
- Configurable AI difficulty
- Automatic bot turn scheduling
- Same callback interface as multiplayer

**Constructor:**
```typescript
new LocalTransport(difficulty: 'easy' | 'medium' | 'hard')
```

### SocketTransport

For online multiplayer via Socket.IO.

**Features:**
- Automatic reconnection (5 attempts)
- Typed event handling
- Room creation/joining
- Server-authoritative game state

**Constructor:**
```typescript
new SocketTransport(serverUrl?: string)  // defaults to localhost:3001
```

## State Types

### PublicGameView

Server-to-client game state (excludes other players' hands):

```typescript
interface PublicGameView {
  roomId: string;
  deckCount: number;
  discardPile: Card[];
  currentPlayer: number;
  direction: number;
  message: string;
  lastCardCalled: boolean[];
  drawPressure: number;
  hasPlayed: boolean[];
  players: PlayerSummary[];
}
```

### PrivateHandPayload

Player's private hand (sent only to that player):

```typescript
interface PrivateHandPayload {
  roomId: string;
  playerId: string;
  hand: Card[];
}
```

### RoomInfo

Lobby/room state:

```typescript
interface RoomInfo {
  roomId: string;
  hostId: string;
  players: PlayerSummary[];
  maxPlayers: number;
  isStarted: boolean;
}
```

## Design Decisions

1. **Transport Abstraction** - UI code doesn't know if it's playing locally or online
2. **Server-Authoritative** - In multiplayer, server validates all actions
3. **Callbacks over Observables** - Simple function callbacks for event handling
4. **Typed Socket Events** - Full TypeScript safety for Socket.IO messages
