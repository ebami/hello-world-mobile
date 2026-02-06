## Plan: Phase 2 Multiplayer with Socket.IO

Add real-time multiplayer to the card game using Socket.IO with transport-agnostic state sync, enabling lobby creation, room management, and synchronized gameplay between remote players.

### Steps

1. **Install Socket.IO and polyfills** — Add `socket.io-client`, `react-native-url-polyfill`, and `text-encoding` to package.json. Create a connection utility in `networking/socket.ts` with reconnection handling and event typing.

2. **Create transport-agnostic game interface** — Add `networking/types.ts` defining `GameTransport` interface with methods like `sendAction()`, `onStateUpdate()`, `connect()`, `disconnect()`. Leverage existing `PublicGameView` and `PrivateHandPayload` types from `game/types.ts`.

3. **Implement Socket transport adapter** — Create `networking/socketTransport.ts` implementing `GameTransport` for Socket.IO. Map game actions (`PLAY_CARDS`, `DRAW_CARD`, `DECLARE_LAST_CARD`) to socket events and handle incoming `game_state_update` / `hand_update` events.

4. **Implement Local transport adapter** — Create `networking/localTransport.ts` implementing `GameTransport` for single-player mode. Wrap existing reducer logic, execute synchronously, and call `onStateUpdate` immediately. Enables unified UI code across all play modes.

5. **Add Zustand for session state** — Install `zustand` and create `stores/sessionStore.ts` for connection/session state only (roomId, playerId, players, connectionStatus, error). Keep game state server-authoritative in multiplayer.

6. **Add lobby and room management** — Create `screens/LobbyScreen.tsx` for room creation/joining and `screens/WaitingRoom.tsx` for pre-game player list. Add socket events: `create_room`, `join_room`, `room_updated`, `game_start`.

7. **Build multiplayer game screen** — Create `screens/MultiplayerGameScreen.tsx` using the same reducer pattern as `GameScreen.tsx` but replacing local dispatch with transport actions. Receive state via `PublicGameView` + `PrivateHandPayload` instead of full `GameState`.

8. **Update navigation for multiplayer flow** — Extend screen switching in `HomeScreen.tsx` to include lobby → waiting room → multiplayer game flow.

9. **Create server scaffold** — Add `server/` folder with Express + Socket.IO. Import shared game logic from `game/` for server-side validation and state management. Implement room management, action validation, and state broadcast.

### Server Structure

```
server/
  index.ts          # Express + Socket.IO setup
  roomManager.ts    # Room creation, joining, player tracking
  gameHandler.ts    # Action validation, state updates, broadcasts
  types.ts          # Server-specific types (re-exports from game/types.ts)
```

### Socket Events

| Client → Server       | Server → Client         |
|-----------------------|-------------------------|
| `create_room`         | `room_created`          |
| `join_room`           | `room_joined`           |
| `leave_room`          | `room_updated`          |
| `play_cards`          | `game_state_update`     |
| `draw_card`           | `hand_update` (private) |
| `declare_last_card`   | `player_action`         |
| `start_game`          | `game_start`            |
|                       | `game_over`             |
|                       | `error`                 |

### Session Store Schema

```typescript
// stores/sessionStore.ts
interface SessionState {
  roomId: string | null;
  playerId: string | null;
  players: PlayerSummary[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  error: string | null;
}
```

### Architecture Decisions

1. **Monorepo with shared game logic** — Pure TypeScript in `game/` runs on both client and server, eliminating sync drift

2. **Unified transport interface** — `GameTransport` abstraction allows single-player, local multiplayer, and online multiplayer to share 90% of UI code

3. **Zustand scoped to session only** — Game state remains server-authoritative; Zustand handles connection state across screen transitions

4. **No auth/persistence in Phase 2** — Basic room management only; add authentication and game history in Phase 3
