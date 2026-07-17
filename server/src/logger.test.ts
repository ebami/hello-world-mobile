/**
 * @fileoverview Tests for the structured logger + redaction (MFP-10).
 */

import { createLogger, redact } from './logger';

function capturing() {
  const lines: string[] = [];
  const logger = createLogger({
    level: 'debug',
    environment: 'test',
    release: '1.2.3',
    sink: (line) => lines.push(line),
  });
  return { logger, lines, last: () => JSON.parse(lines[lines.length - 1]) };
}

describe('logger (MFP-10)', () => {
  it('emits a structured JSON envelope', () => {
    const { logger, last } = capturing();
    logger.info('room created', { event: 'room_created', roomId: 'ABC123' });
    const entry = last();
    expect(entry.severity).toBe('info');
    expect(entry.service).toBe('game-server');
    expect(entry.environment).toBe('test');
    expect(entry.release).toBe('1.2.3');
    expect(entry.event).toBe('room_created');
    expect(entry.message).toBe('room created');
    expect(typeof entry.timestamp).toBe('string');
  });

  it('filters below the configured level', () => {
    const lines: string[] = [];
    const logger = createLogger({ level: 'warn', sink: (l) => lines.push(l) });
    logger.debug('noisy');
    logger.info('info');
    logger.warn('warned');
    logger.error('boom');
    const severities = lines.map((l) => JSON.parse(l).severity);
    expect(severities).toEqual(['warn', 'error']);
  });

  it('redacts tokens, signing keys, hands, and display names', () => {
    const { logger, last } = capturing();
    logger.info('sensitive', {
      reconnectToken: 'secret-token',
      signingKey: 'k',
      displayName: 'Alice',
      hand: [{ id: 'A♠' }],
      nested: { dsn: 'https://x@sentry', playerName: 'Bob' },
      roomId: 'ABC123',
    });
    const entry = last();
    expect(entry.reconnectToken).toBe('[REDACTED]');
    expect(entry.signingKey).toBe('[REDACTED]');
    expect(entry.displayName).toBe('[REDACTED]');
    expect(entry.hand).toBe('[REDACTED]');
    expect(entry.nested.dsn).toBe('[REDACTED]');
    expect(entry.nested.playerName).toBe('[REDACTED]');
    // Non-sensitive fields are preserved.
    expect(entry.roomId).toBe('ABC123');
  });

  it('child loggers bind fields onto every entry', () => {
    const { logger, last } = capturing();
    logger.child({ correlationId: 'cmd-42' }).info('acted', { event: 'draw' });
    const entry = last();
    expect(entry.correlationId).toBe('cmd-42');
    expect(entry.event).toBe('draw');
  });

  it('redact() leaves primitives untouched', () => {
    expect(redact(5)).toBe(5);
    expect(redact('x')).toBe('x');
    expect(redact(null)).toBeNull();
  });
});
