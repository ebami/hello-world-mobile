/**
 * @fileoverview Tests for the reconnect grace-timer registry (MFP-04).
 */

import {
  armGraceTimer,
  cancelGraceTimer,
  hasGraceTimer,
  clearAllGraceTimers,
} from './graceTimers';

describe('graceTimers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearAllGraceTimers();
  });

  afterEach(() => {
    clearAllGraceTimers();
    jest.useRealTimers();
  });

  it('fires the callback once after the delay and clears itself', () => {
    const cb = jest.fn();
    armGraceTimer('R1', 'P1', 1000, cb);
    expect(hasGraceTimer('R1', 'P1')).toBe(true);

    jest.advanceTimersByTime(1000);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(hasGraceTimer('R1', 'P1')).toBe(false);
  });

  it('cancel prevents the callback from firing', () => {
    const cb = jest.fn();
    armGraceTimer('R1', 'P1', 1000, cb);

    expect(cancelGraceTimer('R1', 'P1')).toBe(true);
    jest.advanceTimersByTime(5000);

    expect(cb).not.toHaveBeenCalled();
    expect(hasGraceTimer('R1', 'P1')).toBe(false);
  });

  it('cancel returns false when no timer is pending', () => {
    expect(cancelGraceTimer('R1', 'P1')).toBe(false);
  });

  it('keeps at most one timer per player — re-arming cancels the prior one', () => {
    const first = jest.fn();
    const second = jest.fn();
    armGraceTimer('R1', 'P1', 1000, first);
    armGraceTimer('R1', 'P1', 1000, second); // supersedes

    jest.advanceTimersByTime(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('tracks timers independently per (room, player)', () => {
    const a = jest.fn();
    const b = jest.fn();
    armGraceTimer('R1', 'P1', 1000, a);
    armGraceTimer('R1', 'P2', 1000, b);

    cancelGraceTimer('R1', 'P1');
    jest.advanceTimersByTime(1000);

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});
