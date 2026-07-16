/**
 * @fileoverview Tests for client server-URL resolution (MFP-07).
 */

import {
  resolveServerUrl,
  isLocalhostUrl,
  normalizeEnvironment,
  DEV_FALLBACK_URL,
} from '../../networking/config';

describe('client config (MFP-07)', () => {
  describe('normalizeEnvironment', () => {
    it('recognizes known environments', () => {
      expect(normalizeEnvironment('production')).toBe('production');
      expect(normalizeEnvironment('staging')).toBe('staging');
      expect(normalizeEnvironment('preview')).toBe('preview');
      expect(normalizeEnvironment('test')).toBe('test');
    });

    it('defaults unknown/undefined to development', () => {
      expect(normalizeEnvironment(undefined)).toBe('development');
      expect(normalizeEnvironment('whatever')).toBe('development');
    });
  });

  describe('isLocalhostUrl', () => {
    it('detects loopback and emulator hosts', () => {
      expect(isLocalhostUrl('http://localhost:3001')).toBe(true);
      expect(isLocalhostUrl('http://127.0.0.1:3001')).toBe(true);
      expect(isLocalhostUrl('http://10.0.2.2:3001')).toBe(true);
      expect(isLocalhostUrl('https://game.example.com')).toBe(false);
    });
  });

  describe('resolveServerUrl', () => {
    it('falls back to localhost in development when no URL is configured', () => {
      expect(resolveServerUrl('development', undefined)).toBe(DEV_FALLBACK_URL);
      expect(resolveServerUrl(undefined, undefined)).toBe(DEV_FALLBACK_URL);
    });

    it('uses an explicit URL in development when provided', () => {
      expect(resolveServerUrl('development', 'http://192.168.1.5:3001')).toBe(
        'http://192.168.1.5:3001',
      );
    });

    it('uses the configured URL in production', () => {
      expect(resolveServerUrl('production', 'https://game.example.com')).toBe(
        'https://game.example.com',
      );
    });

    it('throws in production when the URL is missing', () => {
      expect(() => resolveServerUrl('production', undefined)).toThrow(
        /must be set/,
      );
    });

    it('throws in production when the URL is localhost', () => {
      expect(() => resolveServerUrl('production', 'http://localhost:3001')).toThrow(
        /must not point at localhost/,
      );
    });

    it('also enforces non-localhost for staging and preview', () => {
      expect(() => resolveServerUrl('staging', 'http://localhost:3001')).toThrow();
      expect(() => resolveServerUrl('preview', undefined)).toThrow();
    });
  });
});
