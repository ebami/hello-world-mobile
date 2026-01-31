/**
 * @fileoverview Networking module exports.
 * 
 * Provides transport-agnostic game communication layer supporting both
 * local (single-player) and remote (multiplayer) play modes.
 * 
 * @module networking
 * 
 * @example
 * ```typescript
 * // Single-player
 * import { LocalTransport } from './networking';
 * const transport = new LocalTransport('medium');
 * 
 * // Multiplayer
 * import { SocketTransport } from './networking';
 * const transport = new SocketTransport('http://server:3001');
 * 
 * // Same interface for both
 * await transport.connect();
 * transport.sendAction({ type: 'PLAY_CARDS', cards });
 * ```
 */

export * from './types';
export * from './socket';
export { SocketTransport } from './socketTransport';
export { LocalTransport } from './localTransport';
