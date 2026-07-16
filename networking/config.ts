/**
 * @fileoverview Client runtime configuration resolution (MFP-07).
 *
 * The game server URL and environment come from Expo public env vars
 * (`EXPO_PUBLIC_GAME_SERVER_URL`, `EXPO_PUBLIC_ENVIRONMENT`), which Expo inlines
 * into the bundle at build time. A production/staging build must NOT silently
 * fall back to localhost — a missing or localhost URL there is a hard error so
 * the misconfiguration is caught immediately instead of shipping a build that
 * can't reach its backend.
 *
 * The pure {@link resolveServerUrl} takes its inputs explicitly (so it is unit
 * testable regardless of build-time inlining); {@link resolveServerUrlFromEnv}
 * wires it to the actual environment.
 *
 * @module networking/config
 */

export type ClientEnvironment = 'development' | 'test' | 'staging' | 'preview' | 'production';

/** URL used only when running against a local dev server. */
export const DEV_FALLBACK_URL = 'http://localhost:3001';

/** Normalize a raw env string to a known environment (defaulting to development). */
export function normalizeEnvironment(raw: string | undefined): ClientEnvironment {
  if (raw === 'production' || raw === 'staging' || raw === 'preview' || raw === 'test') {
    return raw;
  }
  return 'development';
}

/** Whether a URL points at a local loopback / emulator host. */
export function isLocalhostUrl(url: string): boolean {
  return /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2|\[::1\])(:|\/|$)/i.test(url);
}

/** Environments that must reach real infrastructure (never localhost). */
function isProductionLike(env: ClientEnvironment): boolean {
  return env === 'production' || env === 'staging' || env === 'preview';
}

/**
 * Resolve the game server URL for a given environment + configured URL.
 *
 * - production/staging/preview: the URL is required and must not be localhost.
 * - development/test: use the configured URL if present, else the local
 *   fallback.
 *
 * @throws Error when a production-like build has a missing or localhost URL.
 */
export function resolveServerUrl(
  rawEnvironment: string | undefined,
  serverUrl: string | undefined,
): string {
  const environment = normalizeEnvironment(rawEnvironment);
  const url = serverUrl && serverUrl.trim().length > 0 ? serverUrl.trim() : undefined;

  if (isProductionLike(environment)) {
    if (!url) {
      throw new Error(
        `EXPO_PUBLIC_GAME_SERVER_URL must be set for ${environment} builds.`,
      );
    }
    if (isLocalhostUrl(url)) {
      throw new Error(
        `EXPO_PUBLIC_GAME_SERVER_URL must not point at localhost in ${environment} builds.`,
      );
    }
    return url;
  }

  // development / test
  return url ?? DEV_FALLBACK_URL;
}

/** Resolve the server URL from the actual Expo public environment. */
export function resolveServerUrlFromEnv(): string {
  return resolveServerUrl(
    process.env.EXPO_PUBLIC_ENVIRONMENT,
    process.env.EXPO_PUBLIC_GAME_SERVER_URL,
  );
}
