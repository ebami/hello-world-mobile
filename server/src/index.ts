// Runtime entry point: build the server and bind the production port.
// All handler wiring lives in ./socketServer so the server can be constructed
// from tests without binding a port.
import { createSocketServer } from './socketServer';
import { loadConfig, type ServerConfig } from './config';
import { roomManager } from './roomManager';
import { beginDrain } from './serverLifecycle';
import { logger } from './logger';
import { recordMetric } from './metricsHooks';
import { startProcessSampling } from './metrics';
import { initErrorReporter, reportError } from './errorReporter';

// Report crashes/errors to the configured provider (no-op without a DSN) and
// begin sampling event-loop lag for the metrics snapshot (MFP-10).
initErrorReporter();
startProcessSampling();

// Defense-in-depth crash containment. The per-event `guard` wrapper already
// contains all client-triggered errors; these last-resort handlers report and
// log anything that still escapes. Installed here (not in the factory) so
// test-constructed servers don't accumulate duplicate process listeners.
process.on('unhandledRejection', (reason) => {
  recordMetric('uncaught_exception', { kind: 'unhandledRejection' });
  reportError(reason, { kind: 'unhandledRejection' });
  logger.error('unhandled promise rejection', {
    event: 'unhandled_rejection',
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});
process.on('uncaughtException', (error) => {
  recordMetric('uncaught_exception', { kind: 'uncaughtException' });
  reportError(error, { kind: 'uncaughtException' });
  logger.error('uncaught exception', { event: 'uncaught_exception', error: error.message });
  // Controlled termination after reporting: the process is in an unknown state.
  setTimeout(() => process.exit(1), 100).unref();
});

// Validate configuration once at startup (MFP-07). Invalid or missing required
// configuration (e.g. no SESSION_SIGNING_KEY in production) fails fast with a
// clear, secret-free message rather than surfacing as a later runtime bug.
let config: ServerConfig;
try {
  config = loadConfig();
} catch (err) {
  logger.error('invalid configuration', {
    event: 'config_invalid',
    error: (err as Error).message,
  });
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
  logger.info('shutdown initiated', { event: 'shutdown', signal });
  beginDrain();
  io.emit('server_shutdown', 'The server is restarting. You may briefly disconnect.');

  const drainMs = Math.max(1000, config.disconnectGraceSeconds * 1000);
  const forceExit = setTimeout(() => {
    logger.error('drain timeout exceeded — forcing exit', { event: 'shutdown_forced' });
    process.exit(1);
  }, drainMs + 5000);
  forceExit.unref();

  setTimeout(() => {
    io.close(() => {
      httpServer.close(() => {
        logger.info('closed cleanly', { event: 'shutdown_complete' });
        process.exit(0);
      });
    });
  }, drainMs);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

httpServer.listen(config.port, () => {
  logger.info('server listening', {
    event: 'listening',
    port: config.port,
    environment: config.nodeEnv,
    logLevel: config.logLevel,
    release: config.releaseVersion ?? null,
  });
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
    removed.forEach(() => recordMetric('room_expired'));
    logger.info('rooms cleaned', { event: 'rooms_cleaned', count: removed.length });
  }
}, 60_000);
cleanupInterval.unref();
