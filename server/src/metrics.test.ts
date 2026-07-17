/**
 * @fileoverview Tests for metrics aggregation + the protected endpoint (MFP-10).
 */

import type { AddressInfo } from 'net';
import {
  registerGauge,
  clearGauges,
  snapshotMetrics,
  stopProcessSampling,
} from './metrics';
import { recordMetric, resetMetrics } from './metricsHooks';
import { createSocketServer, type SocketServer } from './socketServer';

describe('metrics snapshot (MFP-10)', () => {
  beforeEach(() => {
    resetMetrics();
    clearGauges();
  });

  afterAll(() => stopProcessSampling());

  it('includes event counters', () => {
    recordMetric('room_created');
    recordMetric('room_created');
    recordMetric('reconnect_failure');
    const snap = snapshotMetrics('1.0.0');
    expect(snap.counters.room_created).toBe(2);
    expect(snap.counters.reconnect_failure).toBe(1);
    expect(snap.release).toBe('1.0.0');
  });

  it('evaluates registered gauges at snapshot time', () => {
    let sockets = 3;
    registerGauge('connected_sockets', () => sockets);
    expect(snapshotMetrics(undefined).gauges.connected_sockets).toBe(3);
    sockets = 7;
    expect(snapshotMetrics(undefined).gauges.connected_sockets).toBe(7);
  });

  it('reports process stats', () => {
    const snap = snapshotMetrics(undefined);
    expect(snap.process.rss_bytes).toBeGreaterThan(0);
    expect(snap.process.heap_used_bytes).toBeGreaterThan(0);
    expect(typeof snap.process.event_loop_lag_ms).toBe('number');
  });

  it('a faulty gauge does not break the snapshot', () => {
    registerGauge('broken', () => {
      throw new Error('nope');
    });
    expect(snapshotMetrics(undefined).gauges.broken).toBe(-1);
  });
});

describe('/metrics endpoint protection (MFP-10)', () => {
  let server: SocketServer;
  let url: string;

  function start(overrides = {}): Promise<void> {
    return new Promise((resolve) => {
      server = createSocketServer(overrides);
      server.httpServer.listen(0, () => {
        const { port } = server.httpServer.address() as AddressInfo;
        url = `http://localhost:${port}`;
        resolve();
      });
    });
  }

  afterEach((done) => {
    stopProcessSampling();
    server.io.close(() => done());
  });

  it('requires the token when one is configured', async () => {
    await start({ metricsToken: 'secret-metrics' });
    const unauth = await fetch(`${url}/metrics`);
    expect(unauth.status).toBe(401);

    const authed = await fetch(`${url}/metrics`, {
      headers: { 'x-metrics-token': 'secret-metrics' },
    });
    expect(authed.status).toBe(200);
    const body = await authed.json();
    expect(body.counters).toBeDefined();
    expect(body.gauges).toBeDefined();
  });

  it('is not exposed in production without a token', async () => {
    await start({ metricsToken: undefined, nodeEnv: 'production', isProduction: true });
    const res = await fetch(`${url}/metrics`);
    expect(res.status).toBe(404);
  });
});
