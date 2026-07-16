/**
 * @fileoverview Tests for the typed server configuration module (MFP-07).
 */

import { loadConfig, ConfigError } from './config';

// A minimal valid production environment.
function prodEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    PORT: '8080',
    SESSION_SIGNING_KEY: 'a-strong-production-key',
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe('server config (MFP-07)', () => {
  describe('defaults', () => {
    it('applies safe defaults for an empty (development) environment', () => {
      const cfg = loadConfig({} as NodeJS.ProcessEnv);
      expect(cfg.nodeEnv).toBe('development');
      expect(cfg.isProduction).toBe(false);
      expect(cfg.port).toBe(3001);
      expect(cfg.corsOrigins).toBe('*');
      expect(cfg.disconnectGraceSeconds).toBe(30);
      expect(cfg.maxRooms).toBe(1000);
      expect(cfg.sessionSigningKey).toBeUndefined();
    });
  });

  describe('production', () => {
    it('loads a valid production configuration', () => {
      const cfg = loadConfig(prodEnv());
      expect(cfg.nodeEnv).toBe('production');
      expect(cfg.isProduction).toBe(true);
      expect(cfg.port).toBe(8080);
      expect(cfg.sessionSigningKey).toBe('a-strong-production-key');
    });

    it('fails when the required signing key is missing', () => {
      expect(() => loadConfig(prodEnv({ SESSION_SIGNING_KEY: undefined }))).toThrow(
        /SESSION_SIGNING_KEY is required in production/,
      );
    });

    it('throws a ConfigError (not a generic error)', () => {
      expect(() => loadConfig(prodEnv({ SESSION_SIGNING_KEY: undefined }))).toThrow(ConfigError);
    });
  });

  describe('validation', () => {
    it('rejects a non-numeric PORT', () => {
      expect(() => loadConfig(prodEnv({ PORT: 'not-a-number' }))).toThrow(ConfigError);
    });

    it('rejects an out-of-range PORT', () => {
      expect(() => loadConfig(prodEnv({ PORT: '99999' }))).toThrow(ConfigError);
    });

    it('rejects a negative numeric limit', () => {
      expect(() => loadConfig(prodEnv({ MAX_ROOMS: '-5' }))).toThrow(ConfigError);
    });

    it('rejects a fractional numeric limit', () => {
      expect(() => loadConfig(prodEnv({ MAX_EVENTS_PER_MINUTE: '2.5' }))).toThrow(ConfigError);
    });

    it('rejects an unknown log level', () => {
      expect(() => loadConfig(prodEnv({ LOG_LEVEL: 'chatty' }))).toThrow(ConfigError);
    });

    it('the error message names the offending field without leaking secret values', () => {
      let message = '';
      try {
        loadConfig(prodEnv({ PORT: 'bad' }));
      } catch (err) {
        message = (err as Error).message;
      }
      expect(message).toContain('PORT');
      expect(message).not.toContain('a-strong-production-key');
    });
  });

  describe('CORS origins', () => {
    it('parses a comma-separated allow-list', () => {
      const cfg = loadConfig(prodEnv({ CORS_ORIGINS: 'https://a.example, https://b.example' }));
      expect(cfg.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    });

    it('defaults to "*" when unset', () => {
      expect(loadConfig(prodEnv()).corsOrigins).toBe('*');
    });
  });
});
