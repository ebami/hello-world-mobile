/**
 * @fileoverview Typed, validated server configuration (MFP-07).
 *
 * All environment-driven configuration is parsed and validated exactly once,
 * here, so the rest of the server works with a typed {@link ServerConfig}
 * rather than reaching into `process.env` ad hoc. Invalid configuration fails
 * fast with a clear message instead of surfacing as a confusing runtime bug.
 *
 * Secrets (the session signing key, the error-reporting DSN) live only in the
 * server environment and are never exposed to the client bundle — the client
 * receives only `EXPO_PUBLIC_*` values (see `networking/config.ts`).
 *
 * @module server/config
 */

import { z } from 'zod';

/** Non-negative integer from an env string (rejects NaN, floats, negatives). */
const nonNegativeInt = z.coerce.number().int().min(0);
/** Positive integer (>= 1). */
const positiveInt = z.coerce.number().int().min(1);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  /** Comma-separated allow-list of CORS origins; unset means allow all. */
  CORS_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ROOM_TTL_SECONDS: nonNegativeInt.default(3600),
  DISCONNECT_GRACE_SECONDS: nonNegativeInt.default(30),
  MAX_ROOMS: positiveInt.default(1000),
  MAX_CONNECTIONS_PER_IP: positiveInt.default(20),
  MAX_EVENTS_PER_MINUTE: positiveInt.default(240),
  SESSION_SIGNING_KEY: z.string().min(1).optional(),
  ERROR_REPORTING_DSN: z.string().optional(),
  RELEASE_VERSION: z.string().optional(),
  /** Commit SHA of the running build, surfaced in health output (MFP-09). */
  COMMIT_SHA: z.string().optional(),
});

export type NodeEnv = 'development' | 'test' | 'staging' | 'production';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/** Fully-resolved, typed server configuration. */
export interface ServerConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  port: number;
  /** Parsed CORS origins, or `'*'` when unrestricted. */
  corsOrigins: string[] | '*';
  logLevel: LogLevel;
  roomTtlSeconds: number;
  disconnectGraceSeconds: number;
  maxRooms: number;
  maxConnectionsPerIp: number;
  maxEventsPerMinute: number;
  /** Secret — required in production. Never sent to the client. */
  sessionSigningKey: string | undefined;
  /** Secret — never sent to the client. */
  errorReportingDsn: string | undefined;
  releaseVersion: string | undefined;
  commitSha: string | undefined;
}

/** Raised when configuration is missing or invalid. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Parse and validate configuration from an environment object (defaults to
 * `process.env`). Throws {@link ConfigError} with a clear, secret-free message
 * on any invalid or missing-required value.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const fields = Array.from(
      new Set(
        result.error.issues.map((issue) =>
          issue.path.length > 0 ? String(issue.path[0]) : '(root)',
        ),
      ),
    ).join(', ');
    throw new ConfigError(`Invalid server configuration (check: ${fields}).`);
  }

  const c = result.data;
  const isProduction = c.NODE_ENV === 'production';

  // A signing key is mandatory in production — refuse to start without it so a
  // deploy cannot silently fall back to an insecure key.
  if (isProduction && !c.SESSION_SIGNING_KEY) {
    throw new ConfigError('SESSION_SIGNING_KEY is required in production.');
  }

  const corsOrigins =
    c.CORS_ORIGINS && c.CORS_ORIGINS.trim().length > 0
      ? c.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
      : '*';

  return {
    nodeEnv: c.NODE_ENV,
    isProduction,
    port: c.PORT,
    corsOrigins,
    logLevel: c.LOG_LEVEL,
    roomTtlSeconds: c.ROOM_TTL_SECONDS,
    disconnectGraceSeconds: c.DISCONNECT_GRACE_SECONDS,
    maxRooms: c.MAX_ROOMS,
    maxConnectionsPerIp: c.MAX_CONNECTIONS_PER_IP,
    maxEventsPerMinute: c.MAX_EVENTS_PER_MINUTE,
    sessionSigningKey: c.SESSION_SIGNING_KEY,
    errorReportingDsn: c.ERROR_REPORTING_DSN,
    releaseVersion: c.RELEASE_VERSION,
    commitSha: c.COMMIT_SHA,
  };
}

// Runnable as a validation script: `node dist/config.js` (see package.json
// `validate:env`). Exits non-zero with a clear message on invalid config.
if (require.main === module) {
  try {
    const cfg = loadConfig();
    console.log(`[config] OK — environment=${cfg.nodeEnv}, port=${cfg.port}`);
  } catch (err) {
    console.error(`[config] ${(err as Error).message}`);
    process.exit(1);
  }
}
