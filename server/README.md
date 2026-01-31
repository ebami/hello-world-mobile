# Multiplayer Game Server

Socket.IO server for real-time multiplayer card game.

## Quick Start

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## Configuration

The server runs on port `3001` by default. Set the `PORT` environment variable to change this:

```bash
PORT=4000 npm run dev
```

## Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create_room` | `{ playerName, maxPlayers? }` | Create a new game room |
| `join_room` | `{ roomId, playerName }` | Join an existing room |
| `leave_room` | - | Leave current room |
| `start_game` | - | Start the game (host only) |
| `play_cards` | `Card[]` | Play cards from hand |
| `draw_card` | - | Draw card(s) from deck |
| `declare_last_card` | - | Declare last card |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room_created` | `RoomInfo` | Room successfully created |
| `room_joined` | `RoomInfo` | Successfully joined room |
| `room_updated` | `RoomInfo` | Room state changed |
| `game_state_update` | `PublicGameView` | Game state updated |
| `hand_update` | `PrivateHandPayload` | Player's hand updated |
| `game_start` | `PublicGameView, PrivateHandPayload` | Game has started |
| `game_over` | `winnerId, message` | Game ended |
| `error` | `string` | Error message |

## Architecture

```
server/
├── src/
│   ├── index.ts        # Express + Socket.IO setup
│   ├── roomManager.ts  # Room creation, joining, player tracking
│   ├── gameHandler.ts  # Action validation, state updates, broadcasts
│   └── types.ts        # Type definitions (mirrors game/types.ts)
├── package.json
└── tsconfig.json
```

## Development Notes

- Game logic is duplicated from `../game/` for server-side validation
- In production, consider extracting shared logic to a common package
- Player disconnections have a 30-second grace period for reconnection
