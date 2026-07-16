// Runtime entry point: build the server and bind the production port.
// All handler wiring lives in ./socketServer so the server can be constructed
// from tests without binding a port.
import { createSocketServer } from './socketServer';
import { loadConfig } from './config';

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
let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`[Server] ${(err as Error).message}`);
  process.exit(1);
}

const { httpServer } = createSocketServer();

httpServer.listen(config.port, () => {
  console.log(
    `[Server] Listening on port ${config.port} (env: ${config.nodeEnv}, log: ${config.logLevel})`,
  );
});
