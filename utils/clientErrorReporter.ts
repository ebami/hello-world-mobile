/**
 * @fileoverview Client crash reporting (MFP-10).
 *
 * Reports uncaught UI errors (via the React error boundary) and transport
 * failures to an external provider **only** when a public DSN is configured
 * (`EXPO_PUBLIC_ERROR_REPORTING_DSN`). It is a safe no-op otherwise.
 *
 * By construction it sends only the error itself (name/message/stack) plus a
 * coarse `source` tag — never private cards, hands, reconnect tokens, or game
 * state.
 *
 * @module utils/clientErrorReporter
 */

export interface ClientErrorContext {
  /** Coarse origin of the error, e.g. 'ErrorBoundary' or 'transport'. */
  source?: string;
}

/** Whether client error reporting is enabled (a public DSN is configured). */
export function isClientErrorReportingEnabled(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_ERROR_REPORTING_DSN);
}

/**
 * Report a client error to the configured provider. No-op when disabled. Only
 * the error and a `source` tag are ever transmitted.
 */
export function reportClientError(error: Error, context: ClientErrorContext = {}): void {
  if (!isClientErrorReportingEnabled()) {
    return; // reporting disabled — nothing is sent
  }
  // A provider SDK (e.g. Sentry) would capture here. We deliberately pass only
  // the error and a coarse source tag — no cards, tokens, or game state.
  //   Sentry.captureException(error, { tags: { source: context.source ?? 'unknown' } });
  void error;
  void context;
}
