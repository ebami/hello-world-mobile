// Runtime entry point: build the server and bind the production port.
// All handler wiring lives in ./socketServer so the server can be constructed
// from tests without binding a port.
import { createSocketServer } from './socketServer';

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

const PORT = process.env.PORT || 3001;

const { httpServer } = createSocketServer();

httpServer.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});
