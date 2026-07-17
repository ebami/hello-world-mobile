# Black Jack Black

A real-time multiplayer card game built with React Native and Socket.IO. Play against AI or challenge friends online!

## Features

- 🎮 **Single-player mode** — Play against AI with easy, medium, or hard difficulty
- 🌐 **Multiplayer mode** — Create or join a room to play 1‑v‑1 with a friend (two‑player online MVP)
- 🃏 **Full card game rules** — Runs, special cards (Aces, Kings, Jacks), draw pressure
- 📱 **Cross-platform** — Works on iOS, Android, and web via Expo
- ✨ **Smooth animations** — Card flip, selection pop, dealing, and discard animations
- 📳 **Haptic feedback** — Touch feedback for card interactions and game events
- 📊 **Player statistics** — Track wins, streaks, and games by difficulty
- 🎉 **Win celebration** — Animated confetti and sound effects

## Tech Stack

| Layer | Technology |
|-------|------------|
| Client | React Native, Expo, TypeScript |
| State | Zustand (session + stats), useReducer (game) |
| Animations | react-native-reanimated 4.x |
| Audio | expo-audio |
| Haptics | expo-haptics |
| Networking | Socket.IO |
| Server | Express, Socket.IO, Node.js |

## Project Structure

```
hello-world-mobile/
├── game/                    # Pure TypeScript game logic
│   ├── types.ts             # Card, GameState, PublicGameView types
│   ├── deck.ts              # Deck generation and shuffling
│   ├── gameLogic.ts         # Core game rules and validation
│   └── ai.ts                # Computer opponent logic
├── networking/              # Transport-agnostic communication
│   ├── types.ts             # GameTransport interface
│   ├── socket.ts            # Socket.IO connection utility
│   ├── socketTransport.ts   # Multiplayer transport
│   └── localTransport.ts    # Single-player transport
├── stores/                  # Zustand state management
│   └── sessionStore.ts      # Connection and lobby state
├── screens/                 # UI screens
│   ├── HomeScreen.tsx       # Main menu
│   ├── GameScreen.tsx       # Single-player game
│   ├── LobbyScreen.tsx      # Room creation/joining
│   ├── WaitingRoomScreen.tsx# Pre-game lobby
│   └── MultiplayerGameScreen.tsx
├── components/              # Reusable UI components
│   ├── Card.tsx             # Animated card with flip/selection
│   ├── Hand.tsx             # Card layout with draw animations
│   ├── DiscardPile.tsx      # Deck and discard with landing fx
│   └── GameOverOverlay.tsx  # Win/lose celebration screen
├── stores/                  # Zustand state management
│   ├── sessionStore.ts      # Connection and lobby state
│   └── statsStore.ts        # Player statistics + AsyncStorage
├── utils/                   # Shared utilities
│   ├── haptics.ts           # Haptic feedback manager
│   └── soundManager.ts      # Audio playback with expo-audio
├── server/                  # Multiplayer game server
│   └── src/
│       ├── index.ts         # Express + Socket.IO setup
│       ├── roomManager.ts   # Room lifecycle
│       └── gameHandler.ts   # Action validation
└── __tests__/               # Test suites
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hello-world-mobile.git
cd hello-world-mobile

# Install client dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### Running the App

**Client (Expo):**
```bash
npm start
# Then press 'a' for Android, 'i' for iOS, or 'w' for web
```

**Server (for multiplayer):**
```bash
cd server
npm run dev
```

The server runs on `http://localhost:3001` by default.

## Environment Configuration

Configuration is externalized and validated (MFP-07) — no hard-coded server URL
or embedded secrets in production builds.

**Client (Expo, public — inlined into the bundle, never put secrets here):**

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_ENVIRONMENT` | `development` \| `test` \| `staging` \| `preview` \| `production` |
| `EXPO_PUBLIC_GAME_SERVER_URL` | Game server URL. **Required and non-localhost** in staging/preview/production; defaults to `http://localhost:3001` in development. |
| `EXPO_PUBLIC_RELEASE_VERSION` | Release version string. |

Native build identifiers (`IOS_BUNDLE_IDENTIFIER`, `ANDROID_PACKAGE`,
`EAS_PROJECT_ID`) are supplied via EAS secrets / protected build env, not tracked
source. See `.env.example` and `eas.json` (development / preview / production
profiles).

**Server (secrets live only here — never in `EXPO_PUBLIC_*`):** `NODE_ENV`,
`PORT`, `CORS_ORIGINS`, `LOG_LEVEL`, `ROOM_TTL_SECONDS`,
`DISCONNECT_GRACE_SECONDS`, `MAX_ROOMS`, `MAX_CONNECTIONS_PER_IP`,
`MAX_EVENTS_PER_MINUTE`, `SESSION_SIGNING_KEY` (**required in production**),
`ERROR_REPORTING_DSN`, `RELEASE_VERSION`. See `server/.env.example`.

**Local:** copy `.env.example` → `.env` and `server/.env.example` → `server/.env`
(both gitignored); development defaults let you run against the local server with
no changes.

**Staging / production:** set the environment via the matching EAS profile and
supply `EXPO_PUBLIC_GAME_SERVER_URL` (non-localhost) plus the server secrets
through your deployment environment. Validate server config before deploy:

```bash
npm run validate:env   # builds + validates the server configuration
```

The server refuses to start, and a production client build fails to resolve its
URL, if required configuration is missing or points at localhost.

## Release Verification

One deterministic command proves the whole system is healthy before release
(MFP-08):

```bash
npm run verify
```

It runs, in order: build the shared package → root TypeScript typecheck → build
the server → server tests (real Socket.IO integration + security regressions) →
client tests → production web export. Any failure exits non-zero.

Individual gates are also available: `npm run typecheck`, `npm run test:server`,
`npm run test:client`, `npm run build:core`, `npm run build:server`,
`npm run build:web`. From a clean checkout, `npm ci && npm run verify` should be
green.

## Security Gates

Supply-chain and source scanning gate every change and release (MFP-12):

- **PR gates** (`security-pr.yml`): GitHub dependency review (blocks new High+),
  CodeQL, `npm audit` (blocks Critical), OSV scan, and Gitleaks secret scan.
- **Image gates** (`security-image.yml` + the deploy workflows): Trivy scans the
  built/promoted image (blocks Critical) and emits a CycloneDX SBOM artifact.
- **Dependabot** (`.github/dependabot.yml`): grouped weekly dependency updates.
- **Exceptions:** time-boxed waivers with owner + expiry —
  [`docs/security/exceptions.md`](docs/security/exceptions.md).
- **Reproduce locally:** [`docs/security/local-scans.md`](docs/security/local-scans.md).

## Deployment

The server ships as an immutable, health-checked container (MFP-09):

- **Container:** root multi-stage `Dockerfile` (non-root, production deps only).
  Run locally production-like with `docker compose up --build`.
- **Health/probes:** `GET /livez` (liveness), `GET /readyz` (readiness — flips to
  `503` while draining), and `GET /health` (version + commit SHA, no secrets).
- **Graceful shutdown:** on `SIGTERM`/`SIGINT` the instance marks itself
  not-ready, refuses new rooms, notifies clients, drains, then closes cleanly.
- **Staged workflow:** `pr-verify` runs `npm run verify` on PRs; `deploy-staging`
  builds one SHA-tagged image and smoke-tests staging; `deploy-production`
  promotes the exact staging-tested digest behind protected approval.
- **Single instance:** the reference config (`deploy/cloudrun.service.yaml`) sets
  max instances to **1**. The MVP has no shared state or multi-node Socket.IO
  adapter, so it must not scale horizontally.
- **Rollback:** route to the previous healthy revision — see
  [`docs/runbooks/rollback.md`](docs/runbooks/rollback.md).

> **Limitation:** game state is in memory on a single instance, so a restart,
> deploy, or rollback **loses active in-progress games** until persistent state
> is implemented. Clients reconnect and can start new games.

Post-deploy smoke test:

```bash
SERVER_URL="https://your-server" node scripts/smoke-test.mjs
```

## How to Play

### Objective
Be the first to empty your hand by playing cards that match the top of the discard pile.

### Basic Rules
- **Match** by suit or rank to play a card
- **Draw** if you can't play
- **Declare "Last Card"** when you have one card left (before your turn)

### Special Cards

| Card | Effect |
|------|--------|
| **Ace** | Reverses play direction, choose next suit |
| **King** | Skips the next player |
| **2** | Next player draws 2 (stackable) |
| **Black Jack** | Next player draws 5 (stackable) |
| **Red Jack** | Shields from draw pressure |
| **Queen** | Wild — any card can follow |

### Runs
Play multiple cards in sequence (same suit, consecutive ranks) in a single turn.

## Animations & Polish

The app includes smooth animations powered by react-native-reanimated:

| Component | Animation | Trigger |
|-----------|-----------|---------|
| Card | 3D flip (rotateY) | Face up/down change |
| Card | Scale pop + lift | Selection toggle |
| Hand | Layout transitions | Cards rearranged |
| Hand | Slide in from right | Card drawn |
| DiscardPile | Scale + rotation | Card played |
| DiscardPile | Pulsing glow | Draw pressure active |
| GameOver | Animated confetti | Win celebration |

### Haptic Feedback

| Action | Feedback Type |
|--------|--------------|
| Button press | Light impact |
| Card selection | Selection feedback |
| Card played | Medium impact |
| Game win | Success notification |
| Game loss | Error notification |
| Invalid move | Warning notification |

> **Note:** Animations gracefully degrade on web platform for compatibility.

## Architecture

### Transport Abstraction

The `GameTransport` interface allows the same UI code to work for both single-player and multiplayer:

```typescript
interface GameTransport {
  connect(): Promise<void>;
  sendAction(action: GameAction): void;
  setCallbacks(callbacks: TransportCallbacks): void;
}
```

- **LocalTransport** — Wraps game logic for single-player
- **SocketTransport** — Connects to server for multiplayer

### State Management

| State Type | Location | Purpose |
|------------|----------|---------|
| Game state | Transport layer | Server-authoritative in multiplayer |
| Session state | Zustand store | Persists across screens |
| UI state | Component state | Local to each screen |

## Scripts

```bash
npm start             # Start Expo development server
npm test              # Run Jest tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Server Scripts

```bash
cd server
npm run dev           # Development with hot reload
npm run build         # Compile TypeScript
npm start             # Run compiled server
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.