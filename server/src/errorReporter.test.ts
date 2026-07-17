/**
 * @fileoverview Tests for the crash/error reporting adapter (MFP-10).
 */

import {
  initErrorReporter,
  isErrorReportingEnabled,
  reportError,
  resetErrorReporter,
} from './errorReporter';

describe('errorReporter (MFP-10)', () => {
  afterEach(() => resetErrorReporter());

  it('is disabled (no-op) when no DSN is configured', () => {
    const captured: unknown[] = [];
    const enabled = initErrorReporter({ dsn: undefined, transport: (p) => captured.push(p) });

    expect(enabled).toBe(false);
    expect(isErrorReportingEnabled()).toBe(false);

    reportError(new Error('should not send'), { roomId: 'ABC123' });
    expect(captured).toHaveLength(0);
  });

  it('sends sanitized reports with release + environment when enabled', () => {
    const captured: Record<string, unknown>[] = [];
    initErrorReporter({
      dsn: 'https://key@example.sentry.io/1',
      release: '2.0.0',
      environment: 'staging',
      transport: (p) => captured.push(p),
    });

    reportError(new Error('boom'), {
      roomId: 'ABC123',
      reconnectToken: 'super-secret',
      hand: [{ id: 'A♠' }],
    });

    expect(captured).toHaveLength(1);
    const payload = captured[0];
    expect(payload.errorMessage).toBe('boom');
    expect(payload.release).toBe('2.0.0');
    expect(payload.environment).toBe('staging');
    const context = payload.context as Record<string, unknown>;
    expect(context.roomId).toBe('ABC123');
    expect(context.reconnectToken).toBe('[REDACTED]');
    expect(context.hand).toBe('[REDACTED]');
  });

  it('never throws even if the transport throws', () => {
    initErrorReporter({
      dsn: 'https://key@example.sentry.io/1',
      transport: () => {
        throw new Error('transport down');
      },
    });
    expect(() => reportError(new Error('boom'))).not.toThrow();
  });

  it('coerces non-Error values', () => {
    const captured: Record<string, unknown>[] = [];
    initErrorReporter({ dsn: 'dsn', transport: (p) => captured.push(p) });
    reportError('a string failure');
    expect(captured[0].errorMessage).toBe('a string failure');
  });
});
