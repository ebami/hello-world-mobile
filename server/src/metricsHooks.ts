/**
 * @fileoverview Lightweight metrics/event hooks (MFP-06).
 *
 * Server components record named counters here (rooms created, connections
 * rejected, rate-limit hits, …). The observability story (MFP-10) consumes them
 * via {@link getAllMetrics} / {@link onMetric} without those components needing
 * to know how metrics are exported. Recording never throws into the caller.
 *
 * @module server/metricsHooks
 */

export type MetricName =
  | 'room_created'
  | 'room_expired'
  | 'connection_rejected'
  | 'rate_limited'
  | 'origin_rejected'
  | 'payload_rejected'
  | 'capacity_rejected';

/** Listener notified on every metric event (MFP-10 wiring point). */
export type MetricListener = (name: MetricName, labels?: Record<string, string>) => void;

const counters = new Map<MetricName, number>();
const listeners = new Set<MetricListener>();

/** Record a metric occurrence and notify listeners (listener errors ignored). */
export function recordMetric(name: MetricName, labels?: Record<string, string>): void {
  counters.set(name, (counters.get(name) ?? 0) + 1);
  for (const listener of listeners) {
    try {
      listener(name, labels);
    } catch {
      // A misbehaving listener must never affect request handling.
    }
  }
}

/** Current count for a metric. */
export function getMetricCount(name: MetricName): number {
  return counters.get(name) ?? 0;
}

/** Snapshot of all recorded counters. */
export function getAllMetrics(): Record<string, number> {
  return Object.fromEntries(counters);
}

/** Subscribe to metric events; returns an unsubscribe function. */
export function onMetric(listener: MetricListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reset counters and listeners (tests). */
export function resetMetrics(): void {
  counters.clear();
  listeners.clear();
}
