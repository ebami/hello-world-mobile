---
mode: agent
description: Add a new multiplayer feature — socket event, server handler, and client transport wiring
tools:
  - codebase
  - editFiles
---

# Add a Multiplayer Feature

Extend the real-time multiplayer system with a new feature. The project uses Socket.IO with a typed event system shared between client and server via `packages/game-core/src/types.ts`.

## What to ask me first (if not already specified)

1. What is the feature? (e.g., spectator mode, rematch vote, in-game chat, player ready indicator)
2. Who initiates it: client → server, server → all clients, or server → specific client?
3. Does it change `GameState` or `RoomInfo`, or is it a side-channel event?

## Architecture overview

```
Client screen
    │  transport.sendAction() or new transport method
    ▼
SocketTransport (networking/socketTransport.ts)
    │  socket.emit('event_name', payload, callback?)
    ▼
server/src/index.ts  →  socket.on('event_name', handler)
    │
    ├── server/src/roomManager.ts   (room & player lookups)
    └── server/src/gameHandler.ts   (game state mutations)
    │
    ▼
io.to(roomId).emit('server_event', payload)  or  socket.emit(...)
    ▼
SocketTransport callbacks  →  screen state updates
```

## Checklist

### 1. Declare the new socket events in `packages/game-core/src/types.ts`

All Socket.IO events are fully typed here. Add to the appropriate interface:

```ts
// Client → Server
export interface ClientToServerEvents {
  // ...existing events...
  my_new_event: (
    payload: MyEventPayload,
    callback: (result: MyResult | null, error?: string) => void
  ) => void;
}

// Server → Client (broadcast)
export interface ServerToClientEvents {
  // ...existing events...
  my_new_broadcast: (data: MyBroadcastData) => void;
}
```

Keep event names `snake_case`. Use a callback pattern for request-response events; use plain emit for one-way broadcasts.

Rebuild after changes:
```bash
npm run build:core
```

### 2. Handle the event on the server (`server/src/index.ts` or `gameHandler.ts`)

Register the handler where the socket listeners are set up:

```ts
// server/src/index.ts  (inside the io.on('connection') block)
socket.on('my_new_event', async (payload, callback) => {
  try {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (!room) { callback(null, 'Not in a room'); return; }

    // validate & mutate via roomManager or gameHandler
    const result = doSomething(room, payload);

    // broadcast to all players in the room
    io.to(room.info.roomId).emit('my_new_broadcast', result);

    callback(result);
  } catch (err) {
    callback(null, err instanceof Error ? err.message : 'Unknown error');
  }
});
```

**Important:** `room.hostId` and all `player.playerId` values are **player names**, not socket IDs. Use `roomManager.getSocketId(playerName)` to convert when you need to target a specific socket.

### 3. Expose the feature in `SocketTransport` (`networking/socketTransport.ts`)

Add a new method (for client-initiated actions) and/or a new callback registration in `registerEventHandlers`:

```ts
// New client-initiated method
async myNewAction(payload: MyEventPayload): Promise<MyResult> {
  return new Promise((resolve, reject) => {
    this.socket?.emit('my_new_event', payload, (result, error) => {
      if (error || !result) { reject(new Error(error ?? 'Failed')); return; }
      resolve(result);
    });
  });
}

// New inbound event — inside registerEventHandlers()
this.socket.on('my_new_broadcast', (data) => {
  this.callbacks.onMyNewEvent?.(data);
});
```

### 4. Add the new callback to `TransportCallbacks` (`networking/types.ts`)

```ts
export interface TransportCallbacks {
  // ...existing callbacks...
  onMyNewEvent?: (data: MyBroadcastData) => void;
}
```

### 5. Add the optional method to `GameTransport` (`networking/types.ts`)

Screens should keep depending on `GameTransport`, not on `SocketTransport` directly. Add the new action as an optional transport method:

```ts
export interface GameTransport {
  // ...existing methods...
  myNewAction?(payload: MyEventPayload): Promise<MyResult>;
}
```

### 6. Wire up in the screen

In the screen that needs this feature (e.g., `WaitingRoomScreen`, `MultiplayerGameScreen`):

```ts
useEffect(() => {
  transport.setCallbacks({
    onMyNewEvent: (data) => {
      // update local state
    },
  });
}, [transport]);

// To send the event:
const handleAction = async () => {
  hapticButtonPress();
  if (!transport.myNewAction) {
    Alert.alert('Error', 'This action is not available in the current play mode');
    return;
  }

  try {
    await transport.myNewAction(payload);
  } catch (err) {
    Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
  }
};
```

**Note:** Do not cast to `SocketTransport` in UI code. Keep screens transport-agnostic by extending `GameTransport`; `LocalTransport` can simply omit the optional method when the feature is multiplayer-only.

### 7. Update `LocalTransport` if needed

If the feature has a single-player analogue (e.g., a practice mode rematch), add the corresponding behaviour to `networking/localTransport.ts`. If it's multiplayer-only, document that the method is not available on `LocalTransport` with a comment.

### 8. Update `useSessionStore` if the feature introduces new lobby/session metadata

`sessionStore` is for connection/room metadata only — not game state. If the feature adds persistent lobby data (e.g., player ready flags), add a field to `SessionState` and a setter action.

Do **not** add live game state (card arrays, current player) to the store.

### 9. Write tests

**Server handler test** (`server/src/gameHandler.test.ts`):
```ts
it('emits my_new_broadcast to all room members', () => {
  // set up room, call handler, assert io.to().emit was called
});
```

**SocketTransport test** (`__tests__/networking/socketTransport.test.ts`):
```ts
it('invokes onMyNewEvent callback when server broadcasts', () => {
  // trigger the socket event on the mock socket, assert callback was called
});
```

**Screen test** (`__tests__/screens/WaitingRoomScreen.test.tsx`):
```ts
it('renders updated state after my_new_broadcast', async () => {
  // render screen with mock transport, simulate callback, assert UI update
});
```

## Validation

```bash
npm run build:core                          # shared types must compile
npm test -w hello-world-mobile-server       # server tests
npm test -- --runTestsByPath __tests__/networking/socketTransport.test.ts --runInBand
npm test                                    # full suite
```
