/**
 * @fileoverview Crash / error reporting adapter (MFP-10).
 *
 * A provider-agnostic seam for shipping errors to an external service (e.g.
 * Sentry). It is a no-op unless an `ERROR_REPORTING_DSN` is configured, attaches
 * release + environment metadata, and redacts sensitive fields before sending.
 * The default transport routes through the structured logger so errors are
 * captured even without a provider SDK; a real deployment swaps in the SDK.
 *
 * @module server/errorReporter
 */

import { loadConfig } from './config';
import { logger, redact } from './logger';

/** Sink that receives a sanitized error payload (real provider or logger). */
export type ErrorTransport = (payload: Record<string, unknown>) => void;

interface ReporterState {
  enabled: boolean;
  release: string | undefined;
  environment: string;
  transport: ErrorTransport;
}

function defaultTransport(payload: Record<string, unknown>): void {
  // Structured capture even without a provider SDK.
  logger.error('error_report', payload);
}

let state: ReporterState = {
  enabled: false,
  release: undefined,
  environment: 'development',
  transport: defaultTransport,
};

/**
 * Initialize reporting. Enabled only when a DSN is present. `overrides` are for
 * tests (inject a DSN and a capturing transport).
 */
export function initErrorReporter(overrides: {
  dsn?: string;
  release?: string;
  environment?: string;
  transport?: ErrorTransport;
} = {}): boolean {
  const config = loadConfig();
  const dsn = overrides.dsn ?? config.errorReportingDsn;
  state = {
    enabled: Boolean(dsn),
    release: overrides.release ?? config.releaseVersion,
    environment: overrides.environment ?? config.nodeEnv,
    transport: overrides.transport ?? defaultTransport,
  };
  return state.enabled;
}

/** Whether reporting is currently active (a DSN was supplied). */
export function isErrorReportingEnabled(): boolean {
  return state.enabled;
}

/**
 * Report an error with optional context. No-op when disabled. Context is
 * redacted (tokens, hands, secrets, names) before it leaves the process, and
 * the transport can never throw into the caller.
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}): void {
  if (!state.enabled) return;
  const err = error instanceof Error ? error : new Error(String(error));
  const payload = {
    event: 'error_report',
    release: state.release ?? null,
    environment: state.environment,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack,
    context: redact(context),
  };
  try {
    state.transport(payload);
  } catch {
    // Reporting must never crash the process.
  }
}

/** Reset to disabled/default (tests). */
export function resetErrorReporter(): void {
  state = {
    enabled: false,
    release: undefined,
    environment: 'development',
    transport: defaultTransport,
  };
}
