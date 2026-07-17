// Runtime entry point: build the server and bind the production port.
// All handler wiring lives in ./socketServer so the server can be constructed
// from tests without binding a port.
import { createSocketServer } from './socketServer';
import { loadConfig, type ServerConfig } from './config';
import { roomManager } from './roomManager';
import { beginDrain } from './serverLifecycle';

// Defense-in-depth crash containment. The per-event `guard` wrapper already
// contains all client-triggered errors; this last-resort net logs anything
// that still escapes (e.g. a future async handler) rather than letting a
// single stray error terminate the process. Graceful shutdown/draining is
// deferred to MFP-09. Installed here (not in the factory) so test-constructed
// servers don't accumulate duplicate process listeners.
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
});

// Validate configuration once at startup (MFP-07). Invalid or missing required
// configuration (e.g. no SESSION_SIGNING_KEY in production) fails fast with a
// clear, secret-free message rather than surfacing as a later runtime bug.
let config: ServerConfig;
try {
  config = loadConfig();
} catch (err) {
  console.error(`[Server] ${(err as Error).message}`);
  process.exit(1);
}

const { httpServer, io } = createSocketServer();

// Graceful shutdown (MFP-09): on SIGTERM/SIGINT, mark not-ready (readiness flips
// to 503 and new rooms are refused), notify connected clients, allow a bounded
// drain, then close Socket.IO + HTTP cleanly. NOTE: active in-memory games are
// lost on restart until persistent state exists (single-instance MVP).
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] ${signal} received — draining before shutdown`);
  beginDrain();
  io.emit('server_shutdown', 'The server is restarting. You may briefly disconnect.');

  const drainMs = Math.max(1000, config.disconnectGraceSeconds * 1000);
  const forceExit = setTimeout(() => {
    console.error('[Server] Drain timeout exceeded — forcing exit');
    process.exit(1);
  }, drainMs + 5000);
  forceExit.unref();

  setTimeout(() => {
    io.close(() => {
      httpServer.close(() => {
        console.log('[Server] Closed cleanly');
        process.exit(0);
      });
    });
  }, drainMs);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

httpServer.listen(config.port, () => {
  console.log(
    `[Server] Listening on port ${config.port} (env: ${config.nodeEnv}, log: ${config.logLevel})`,
  );
});

// Periodic room-TTL cleanup (MFP-06): remove idle lobbies, finished, and empty
// rooms so memory cannot grow unbounded. ACTIVE rooms are always retained.
// Installed here (runtime entry) — not in the server factory — so
// test-constructed servers don't accumulate intervals. `.unref()` keeps it from
// holding the process open on its own.
const ttlMs = config.roomTtlSeconds * 1000;
const cleanupInterval = setInterval(() => {
  const removed = roomManager.sweepExpired(Date.now(), {
    emptyMs: Math.min(60_000, ttlMs),
    idleLobbyMs: ttlMs,
    completedMs: ttlMs,
  });
  if (removed.length > 0) {
    console.log(`[Server] Cleaned up ${removed.length} expired room(s)`);
  }
}, 60_000);
cleanupInterval.unref();
