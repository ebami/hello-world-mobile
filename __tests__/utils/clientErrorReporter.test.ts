/**
 * @fileoverview Tests for client crash reporting (MFP-10).
 *
 * Note: Expo inlines EXPO_PUBLIC_* at build time, so the "enabled" path can't be
 * toggled at runtime here — we verify the safety-critical property: with no DSN,
 * reporting is disabled and reporting is a no-op that never throws.
 */

import {
  reportClientError,
  isClientErrorReportingEnabled,
} from '../../utils/clientErrorReporter';

describe('clientErrorReporter (MFP-10)', () => {
  it('is disabled when no DSN is configured', () => {
    expect(isClientErrorReportingEnabled()).toBe(false);
  });

  it('is a safe no-op when disabled (never throws)', () => {
    expect(() =>
      reportClientError(new Error('boom'), { source: 'test' }),
    ).not.toThrow();
  });
});
