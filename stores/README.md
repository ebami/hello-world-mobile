# Stores Module

Zustand-based state management for session and connection state across screen transitions.

## Overview

The stores module provides global state management using [Zustand](https://github.com/pmndrs/zustand), a lightweight state management library. In the multiplayer architecture, this store handles **session state only** — game state remains server-authoritative.

## Architecture

```
stores/
├── sessionStore.ts  # Connection and lobby state
└── index.ts         # Module exports
```

## Quick Start

```typescript
import { useSessionStore } from './stores';

function LobbyScreen() {
  // Read state
  const { connectionStatus, roomId, players, isHost, error } = useSessionStore();
  
  // Actions
  const { setConnectionStatus, setRoom, setError, reset } = useSessionStore();
  
  // Update connection status
  setConnectionStatus('connected');
  
  // Update room state
  setRoom({
    roomId: 'ABC123',
    hostId: 'player1',
    players: [...],
    maxPlayers: 4,
    isStarted: false,
  });
  
  // Clear error
  setError(null);
  
  // Reset to initial state (on logout/disconnect)
  reset();
}
```

## Session Store

### State Shape

```typescript
interface SessionState {
  // Connection state
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  
  // Room/lobby state
  roomId: string | null;
  playerId: string | null;
  playerName: string | null;
  players: PlayerSummary[];
  isHost: boolean;
  
  // Error state
  error: string | null;
}
```

### Initial State

```typescript
{
  connectionStatus: 'disconnected',
  roomId: null,
  playerId: null,
  playerName: null,
  players: [],
  isHost: false,
  error: null,
}
```

### Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `setConnectionStatus` | `status: ConnectionStatus` | Update connection status |
| `setRoom` | `room: RoomInfo \| null` | Set current room (or clear it) |
| `setPlayerId` | `playerId: string` | Set local player's ID |
| `setPlayerName` | `name: string` | Set local player's display name |
| `setError` | `error: string \| null` | Set or clear error message |
| `updatePlayers` | `players: PlayerSummary[]` | Update player list |
| `reset` | - | Reset to initial state |

## Usage Patterns

### Reading State (Reactive)

```typescript
function ConnectionIndicator() {
  // Component re-renders when connectionStatus changes
  const connectionStatus = useSessionStore((state) => state.connectionStatus);
  
  return <StatusDot connected={connectionStatus === 'connected'} />;
}
```

### Reading Multiple Values

```typescript
function WaitingRoom() {
  // Destructure multiple values
  const { players, isHost, roomId } = useSessionStore();
  
  return (
    <View>
      <Text>Room: {roomId}</Text>
      <PlayerList players={players} />
      {isHost && <StartButton />}
    </View>
  );
}
```

### Updating State

```typescript
function handleRoomJoined(room: RoomInfo) {
  const { setRoom, setPlayerName, setPlayerId } = useSessionStore.getState();
  
  setRoom(room);
  setPlayerName('Alice');
  setPlayerId('player-123');
}
```

### Subscribing Outside React

```typescript
// Subscribe to changes outside of React components
const unsubscribe = useSessionStore.subscribe(
  (state) => state.connectionStatus,
  (status) => {
    console.log('Connection status changed:', status);
  }
);

// Later: unsubscribe()
```

### Resetting on Disconnect

```typescript
function handleDisconnect() {
  const { reset } = useSessionStore.getState();
  reset(); // Clears all session state
}
```

## Design Decisions

### Why Zustand?

1. **Minimal boilerplate** - No providers, reducers, or action creators
2. **React Native friendly** - Works seamlessly with React Native
3. **TypeScript first** - Excellent type inference
4. **Small bundle size** - ~1KB gzipped

### Why Session State Only?

In the multiplayer architecture:

| State Type | Location | Reason |
|------------|----------|--------|
| **Game state** | Server / Transport | Server-authoritative for cheating prevention |
| **Session state** | Zustand store | Persists across screen transitions |
| **UI state** | Component state | Local to each screen |

This separation ensures:
- Game state is always consistent with the server
- Session state (room, connection) survives navigation
- UI state doesn't bloat the global store

### State Flow

```
User Action
    ↓
Transport.sendAction()
    ↓
Server validates & broadcasts
    ↓
Transport receives update
    ↓
Callback updates local state
    ↓
UI re-renders
```

The Zustand store is **not** in the game state flow — it only tracks session metadata.

## Types

### PlayerSummary

```typescript
interface PlayerSummary {
  playerId: string;
  handCount: number;
  connected: boolean;
  isBot: boolean;
}
```

### RoomInfo

```typescript
interface RoomInfo {
  roomId: string;
  hostId: string;
  players: PlayerSummary[];
  maxPlayers: number;
  isStarted: boolean;
}
```

### ConnectionStatus

```typescript
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
```
