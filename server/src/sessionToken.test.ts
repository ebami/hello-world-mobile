/**
 * @fileoverview Tests for room-scoped session tokens (MFP-03).
 *
 * Uses a deterministic signing key set before importing the module under test.
 * A test key is permitted only here; production requires SESSION_SIGNING_KEY.
 */

// Set a deterministic key BEFORE importing the module (getSigningKey reads it
// lazily, but pinning it here keeps the suite independent of the environment).
process.env.SESSION_SIGNING_KEY = 'test-only-deterministic-signing-key';

import {
  signSession,
  verifySession,
  SESSION_TOKEN_TTL_MS,
  type SessionTokenClaims,
} from './sessionToken';

describe('sessionToken', () => {
  const PLAYER = 'player-uuid-123';
  const ROOM = 'ABC123';
  const NOW = 1_000_000_000_000;

  describe('signSession', () => {
    it('produces a two-part token and an ISO expiry TTL in the future', () => {
      const { token, expiresAt } = signSession(PLAYER, ROOM, NOW);

      expect(token.split('.')).toHaveLength(2);
      expect(new Date(expiresAt).getTime()).toBe(NOW + SESSION_TOKEN_TTL_MS);
    });

    it('never embeds the raw player id or room id in the clear', () => {
      const { token } = signSession(PLAYER, ROOM, NOW);
      // Claims are base64url-encoded, so the literal values must not appear.
      expect(token).not.toContain(PLAYER);
      expect(token).not.toContain(ROOM);
    });

    it('emits a distinct token each call (nonce) even for identical claims', () => {
      const a = signSession(PLAYER, ROOM, NOW).token;
      const b = signSession(PLAYER, ROOM, NOW).token;
      expect(a).not.toBe(b);
    });
  });

  describe('verifySession', () => {
    it('accepts a valid, unexpired, correctly-scoped token', () => {
      const { token } = signSession(PLAYER, ROOM, NOW);
      const claims = verifySession(token, ROOM, NOW + 1000);

      expect(claims).not.toBeNull();
      const c = claims as SessionTokenClaims;
      expect(c.playerId).toBe(PLAYER);
      expect(c.roomId).toBe(ROOM);
      expect(c.exp).toBe(NOW + SESSION_TOKEN_TTL_MS);
      expect(typeof c.nonce).toBe('string');
    });

    it('rejects a token with a tampered signature (invalid signature)', () => {
      const { token } = signSession(PLAYER, ROOM, NOW);
      const [payload, sig] = token.split('.');
      // Flip the first byte of the decoded signature. (Flipping the final
      // base64url character is unreliable: for a 32-byte HMAC its low bits are
      // beyond the last byte and are dropped on decode, so the "tamper" can be a
      // no-op — a real flake this test previously had.)
      const sigBytes = Buffer.from(sig, 'base64url');
      sigBytes[0] ^= 0xff;
      const tampered = `${payload}.${sigBytes.toString('base64url')}`;

      expect(verifySession(tampered, ROOM, NOW + 1000)).toBeNull();
    });

    it('rejects a token with tampered claims (payload no longer matches sig)', () => {
      const { token } = signSession(PLAYER, ROOM, NOW);
      const sig = token.split('.')[1];
      const forgedClaims = Buffer.from(
        JSON.stringify({ playerId: 'attacker', roomId: ROOM, exp: NOW + 1e9, nonce: 'x' }),
        'utf8',
      ).toString('base64url');

      expect(verifySession(`${forgedClaims}.${sig}`, ROOM, NOW + 1000)).toBeNull();
    });

    it('rejects an expired token', () => {
      const { token } = signSession(PLAYER, ROOM, NOW);
      // Evaluate at a time past the expiry.
      expect(verifySession(token, ROOM, NOW + SESSION_TOKEN_TTL_MS + 1)).toBeNull();
    });

    it('rejects a token presented for the wrong room', () => {
      const { token } = signSession(PLAYER, ROOM, NOW);
      expect(verifySession(token, 'ZZZZZZ', NOW + 1000)).toBeNull();
    });

    it('rejects malformed and non-string tokens without throwing', () => {
      const cases: unknown[] = [
        null,
        undefined,
        42,
        '',
        'no-dot',
        '.onlysig',
        'onlypayload.',
        'a.b.c',
        {},
      ];
      for (const bad of cases) {
        expect(verifySession(bad, ROOM, NOW)).toBeNull();
      }
    });
  });

  describe('signing key requirement', () => {
    const savedKey = process.env.SESSION_SIGNING_KEY;
    const savedEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.SESSION_SIGNING_KEY = savedKey;
      process.env.NODE_ENV = savedEnv;
    });

    it('refuses to sign in production without SESSION_SIGNING_KEY', () => {
      delete process.env.SESSION_SIGNING_KEY;
      process.env.NODE_ENV = 'production';
      expect(() => signSession(PLAYER, ROOM, NOW)).toThrow('SESSION_SIGNING_KEY');
    });

    it('permits a deterministic fallback key outside production', () => {
      delete process.env.SESSION_SIGNING_KEY;
      process.env.NODE_ENV = 'test';
      expect(() => signSession(PLAYER, ROOM, NOW)).not.toThrow();
    });
  });
});
