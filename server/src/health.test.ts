/**
 * @fileoverview Health probe + graceful-drain behavior (MFP-09), exercised over
 * real HTTP and Socket.IO against a server on an ephemeral port.
 */

import type { AddressInfo } from 'net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { createSocketServer, type SocketServer } from './socketServer';
import { roomManager } from './roomManager';
import { resetAbuseControls } from './rateLimiter';
import { beginDrain, resetLifecycle } from './serverLifecycle';

let server: SocketServer;
let url: string;
const openClients: ClientSocket[] = [];

beforeAll((done) => {
  server = createSocketServer({ releaseVersion: '9.9.9', commitSha: 'deadbeef' });
  server.httpServer.listen(0, () => {
    const { port } = server.httpServer.address() as AddressInfo;
    url = `http://localhost:${port}`;
    done();
  });
});

afterAll((done) => {
  server.io.close(() => done());
});

beforeEach(() => {
  roomManager.resetForTests();
  resetAbuseControls();
  resetLifecycle();
});

afterEach(() => {
  resetLifecycle();
  while (openClients.length > 0) openClients.pop()?.disconnect();
});

function connect(): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    openClients.push(client);
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });
}

describe('health probes and graceful drain (MFP-09)', () => {
  it('GET /livez reports liveness', async () => {
    const res = await fetch(`${url}/livez`);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  it('GET /readyz reports readiness with version and commit (no secrets)', async () => {
    const res = await fetch(`${url}/readyz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ready');
    expect(body.version).toBe('9.9.9');
    expect(body.commit).toBe('deadbeef');
    expect(JSON.stringify(body)).not.toMatch(/signing|secret|dsn/i);
  });

  it('GET /readyz flips to 503 while draining', async () => {
    beginDrain();
    const res = await fetch(`${url}/readyz`);
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe('draining');
  });

  it('/livez stays 200 even while draining', async () => {
    beginDrain();
    const res = await fetch(`${url}/livez`);
    expect(res.status).toBe(200);
  });

  it('rejects new room creation while draining', async () => {
    beginDrain();
    const client = await connect();
    const result = await new Promise<{ session: unknown; error: { code?: string } | undefined }>(
      (resolve) => {
        client.emit('create_room', { playerName: 'Alice' }, (session: unknown, error: { code?: string } | undefined) =>
          resolve({ session, error }),
        );
      },
    );
    expect(result.session).toBeNull();
    expect(result.error?.code).toBe('SERVER_CAPACITY_REACHED');
  });

  it('still accepts room creation when not draining', async () => {
    const client = await connect();
    const result = await new Promise<{ session: any; error: unknown }>((resolve) => {
      client.emit('create_room', { playerName: 'Alice' }, (session: unknown, error: unknown) =>
        resolve({ session, error }),
      );
    });
    expect(result.error).toBeUndefined();
    expect(result.session.room.players[0].displayName).toBe('Alice');
  });
});
