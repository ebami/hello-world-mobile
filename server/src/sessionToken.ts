/**
 * @fileoverview Room-scoped, expiring session/reconnect tokens (MFP-03).
 *
 * A session token is a signed credential binding an opaque `playerId` to a
 * single `roomId` for a bounded lifetime. It lets a returning client prove — to
 * the server, without a password — that it is the same player that originally
 * created or joined the room. Full reconnect *consumption* is MFP-04; this
 * module is responsible only for minting and verifying tokens.
 *
 * Security properties:
 *  - Signed with HMAC-SHA256 over the exact serialized claims.
 *  - Carries only the minimum claims: player id, room id, expiry, and a nonce
 *    (so two tokens for the same player/room are never byte-identical).
 *  - Verified in constant time via {@link crypto.timingSafeEqual}, so a caller
 *    cannot learn the correct signature byte-by-byte through timing.
 *  - Requires `SESSION_SIGNING_KEY` in production; a deterministic fallback is
 *    permitted only outside production (tests, local dev).
 *  - The token and the signing key are secrets: this module never logs either,
 *    and callers must not place them in logs or public state.
 *
 * @module server/sessionToken
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/** Default token lifetime: one hour from issuance. */
export const SESSION_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * The minimum set of claims carried by a session token. Nothing else — no
 * display name, no socket id, no user data — is included.
 */
export interface SessionTokenClaims {
  /** Opaque player identity the token authenticates. */
  playerId: string;
  /** Room this token is scoped to; a token is valid for exactly one room. */
  roomId: string;
  /** Expiry as epoch milliseconds. */
  exp: number;
  /** Per-token random nonce; distinguishes otherwise-identical claim sets. */
  nonce: string;
}

/** A freshly minted token plus its expiry in ISO-8601 form. */
export interface IssuedSessionToken {
  token: string;
  expiresAt: string;
}

/**
 * Resolve the HMAC signing key. In production the environment MUST provide
 * `SESSION_SIGNING_KEY`; a missing key is a hard failure rather than a silent
 * downgrade to an insecure default. Outside production a deterministic fallback
 * keeps tests and local development frictionless without ever shipping a key.
 */
function getSigningKey(): string {
  const key = process.env.SESSION_SIGNING_KEY;
  if (key && key.length > 0) {
    return key;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SIGNING_KEY must be set in production to sign session tokens.',
    );
  }
  // Non-production only: a fixed, clearly-labelled key. Never used when
  // NODE_ENV === 'production' because of the guard above.
  return 'insecure-development-session-key-not-for-production';
}

/** Base64url-encode a UTF-8 string. */
function encodePart(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

/** HMAC-SHA256 of `data`, returned base64url-encoded. */
function sign(data: string): string {
  return createHmac('sha256', getSigningKey()).update(data).digest('base64url');
}

/**
 * Mint a signed, room-scoped token for `playerId` in `roomId`.
 *
 * @param playerId Opaque player identity to bind.
 * @param roomId   Room the token is valid for.
 * @param now      Injectable clock (epoch ms) for deterministic tests.
 * @returns The encoded token and its ISO-8601 expiry.
 */
export function signSession(
  playerId: string,
  roomId: string,
  now: number = Date.now(),
): IssuedSessionToken {
  const exp = now + SESSION_TOKEN_TTL_MS;
  const claims: SessionTokenClaims = {
    playerId,
    roomId,
    exp,
    nonce: randomBytes(16).toString('hex'),
  };
  const payload = encodePart(JSON.stringify(claims));
  const signature = sign(payload);
  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

/**
 * Verify a token and return its claims, or `null` if the token is malformed,
 * has a bad signature, is expired, or is scoped to a different room.
 *
 * Verification is total (never throws for attacker-controlled input) and
 * compares signatures in constant time.
 *
 * @param token          The token to verify.
 * @param expectedRoomId The room the caller expects the token to authorize.
 * @param now            Injectable clock (epoch ms) for deterministic tests.
 */
export function verifySession(
  token: unknown,
  expectedRoomId: string,
  now: number = Date.now(),
): SessionTokenClaims | null {
  if (typeof token !== 'string') {
    return null;
  }

  const dot = token.indexOf('.');
  // Exactly one separator, with non-empty payload and signature on each side.
  if (dot <= 0 || dot === token.length - 1 || token.indexOf('.', dot + 1) !== -1) {
    return null;
  }

  const payload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(payload);

  // Constant-time comparison. Guard on length first: timingSafeEqual throws on
  // unequal-length buffers, and length is not itself the secret here.
  const providedBuf = Buffer.from(providedSig, 'base64url');
  const expectedBuf = Buffer.from(expectedSig, 'base64url');
  if (providedBuf.length !== expectedBuf.length) {
    return null;
  }
  if (!timingSafeEqual(providedBuf, expectedBuf)) {
    return null;
  }

  let claims: SessionTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  // Validate claim shape before trusting any field.
  if (
    !claims ||
    typeof claims.playerId !== 'string' ||
    typeof claims.roomId !== 'string' ||
    typeof claims.exp !== 'number' ||
    typeof claims.nonce !== 'string'
  ) {
    return null;
  }

  if (claims.exp <= now) {
    return null; // expired
  }
  if (claims.roomId !== expectedRoomId) {
    return null; // scoped to a different room
  }

  return claims;
}
