/**
 * @fileoverview Networking module exports.
 *
 * Provides the transport-agnostic game communication layer. Online multiplayer
 * runs through {@link SocketTransport}; single-player is handled directly by
 * `screens/GameScreen` via its own reducer and does not use a transport.
 *
 * @module networking
 *
 * @example
 * ```typescript
 * import { SocketTransport } from './networking';
 * const transport = new SocketTransport('http://server:3001');
 *
 * await transport.connect();
 * transport.sendAction({ type: 'PLAY_CARDS', cards });
 * ```
 */

export * from './types';
export * from './socket';
export { SocketTransport } from './socketTransport';
