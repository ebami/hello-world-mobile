/**
 * @fileoverview Metrics aggregation + snapshot (MFP-10).
 *
 * Combines the event counters from {@link module:server/metricsHooks} with
 * live gauges (connected sockets, active rooms/games) and process health
 * (memory, event-loop lag) into a single snapshot served by a protected
 * `/metrics` endpoint. Kept simple and pull-based — no external metrics
 * dependency or aggregation infrastructure (out of scope).
 *
 * @module server/metrics
 */

import { monitorEventLoopDelay, type IntervalHistogram } from 'perf_hooks';
import { getAllMetrics } from './metricsHooks';

type GaugeProvider = () => number;

const gauges = new Map<string, GaugeProvider>();

/** Register a named gauge whose current value is read at snapshot time. */
export function registerGauge(name: string, provider: GaugeProvider): void {
  gauges.set(name, provider);
}

/** Remove all gauges (tests). */
export function clearGauges(): void {
  gauges.clear();
}

function readGauges(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, provider] of gauges) {
    try {
      out[name] = provider();
    } catch {
      out[name] = -1;
    }
  }
  return out;
}

let elDelay: IntervalHistogram | undefined;

/** Begin sampling event-loop delay (call once at startup). */
export function startProcessSampling(): void {
  if (!elDelay) {
    elDelay = monitorEventLoopDelay({ resolution: 20 });
    elDelay.enable();
  }
}

/** Stop + reset event-loop sampling (tests). */
export function stopProcessSampling(): void {
  if (elDelay) {
    elDelay.disable();
    elDelay = undefined;
  }
}

function processStats(): Record<string, number> {
  const mem = process.memoryUsage();
  return {
    rss_bytes: mem.rss,
    heap_used_bytes: mem.heapUsed,
    // Histogram values are nanoseconds; expose the mean lag in ms.
    event_loop_lag_ms: elDelay ? Number((elDelay.mean / 1e6).toFixed(3)) : 0,
  };
}

export interface MetricsSnapshot {
  timestamp: string;
  release: string | null;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  process: Record<string, number>;
}

/** Build a point-in-time metrics snapshot. */
export function snapshotMetrics(release: string | undefined): MetricsSnapshot {
  return {
    timestamp: new Date().toISOString(),
    release: release ?? null,
    counters: getAllMetrics(),
    gauges: readGauges(),
    process: processStats(),
  };
}
