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