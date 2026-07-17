/**
 * @fileoverview Structured JSON logger with redaction (MFP-10).
 *
 * Emits one JSON object per line with a stable envelope (timestamp, severity,
 * service, environment, release, event, correlation id) so logs are queryable
 * in aggregation without parsing free text. Sensitive values are redacted
 * recursively — reconnect tokens, signing keys, DSNs, card hands, and (by
 * default) raw display names never reach the log sink.
 *
 * A dependency-free implementation is used here so it is fully unit-testable and
 * adds no runtime dependency; production may swap in Pino behind the same
 * {@link Logger} surface.
 *
 * @module server/logger
 */

import { loadConfig, type LogLevel } from './config';

const LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

const SERVICE = 'game-server';

/** Field names whose values are always redacted (case-insensitive, substring). */
const REDACT_KEYS = [
  'token',
  'reconnecttoken',
  'signingkey',
  'session_signing_key',
  'secret',
  'dsn',
  'authorization',
  'password',
  'hand', // card hands
  'cards',
  'displayname', // raw display names not logged by default
  'playername',
];

const REDACTED = '[REDACTED]';

function shouldRedact(key: string): boolean {
  const k = key.toLowerCase();
  return REDACT_KEYS.some((r) => k.includes(r));
}

/** Recursively redact sensitive fields; caps depth to avoid pathological input. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = shouldRedact(k) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

export interface LogFields {
  /** Event name (e.g. 'room_created', 'command_rejected'). */
  event?: string;
  /** Correlation id tying a request/command chain together. */
  correlationId?: string;
  [key: string]: unknown;
}

export interface Logger {
  error(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  /** Derive a logger that always includes the given fields (e.g. a correlationId). */
  child(bound: LogFields): Logger;
}

interface LoggerConfig {
  level: LogLevel;
  environment: string;
  release: string | undefined;
  sink: (line: string) => void;
}

function makeLogger(cfg: LoggerConfig, bound: LogFields = {}): Logger {
  const threshold = LEVELS[cfg.level];

  const log = (severity: LogLevel, message: string, fields?: LogFields) => {
    if (LEVELS[severity] > threshold) return;
    const merged = { ...bound, ...fields };
    const entry = {
      timestamp: new Date().toISOString(),
      severity,
      service: SERVICE,
      environment: cfg.environment,
      release: cfg.release ?? null,
      message,
      ...(redact(merged) as Record<string, unknown>),
    };
    cfg.sink(JSON.stringify(entry));
  };

  return {
    error: (m, f) => log('error', m, f),
    warn: (m, f) => log('warn', m, f),
    info: (m, f) => log('info', m, f),
    debug: (m, f) => log('debug', m, f),
    child: (childBound) => makeLogger(cfg, { ...bound, ...childBound }),
  };
}

/**
 * Create a logger. Defaults pull level/environment/release from validated
 * config; `sink` and overrides are injectable for tests.
 */
export function createLogger(overrides: Partial<LoggerConfig> = {}): Logger {
  // Resolve from config, but never throw at import time: startup config
  // validation (with its clean failure message) lives in index.ts. If config is
  // not yet valid, fall back to safe defaults so importing the logger is safe.
  let level: LogLevel = 'info';
  let environment = 'development';
  let release: string | undefined;
  try {
    const config = loadConfig();
    level = config.logLevel;
    environment = config.nodeEnv;
    release = config.releaseVersion;
  } catch {
    // Keep defaults.
  }
  const resolvedEnv = overrides.environment ?? environment;
  // Stay silent by default under test to keep suite output clean; production and
  // dev write one JSON line per entry to stdout.
  const defaultSink =
    resolvedEnv === 'test'
      ? () => {}
      : (line: string) => process.stdout.write(`${line}\n`);
  return makeLogger({
    level: overrides.level ?? level,
    environment: resolvedEnv,
    release: overrides.release ?? release,
    sink: overrides.sink ?? defaultSink,
  });
}

/** Process-wide default logger. */
export const logger: Logger = createLogger();
