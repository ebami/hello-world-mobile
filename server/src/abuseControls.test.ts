/**
 * @fileoverview Real Socket.IO integration tests for abuse / capacity / origin
 * controls (MFP-06). Each test starts a server with tailored limit overrides.
 */

import type { AddressInfo } from 'net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { createSocketServer, type SocketServer } from './socketServer';
import { roomManager } from './roomManager';
import { resetAbuseControls } from './rateLimiter';
import { resetMetrics, getMetricCount } from './metricsHooks';
import type { ServerConfig } from './config';

let server: SocketServer | null = null;
const openClients: ClientSocket[] = [];

function start(overrides: Partial<ServerConfig> = {}): Promise<string> {
  return new Promise((resolve) => {
    server = createSocketServer(overrides);
    server.httpServer.listen(0, () => {
      const { port } = server!.httpServer.address() as AddressInfo;
      resolve(`http://localhost:${port}`);
    });
  });
}

beforeEach(() => {
  roomManager.resetForTests();
  resetAbuseControls();
  resetMetrics();
});

afterEach((done) => {
  while (openClients.length > 0) openClients.pop()?.disconnect();
  if (server) {
    const s = server;
    server = null;
    s.io.close(() => done());
  } else {
    done();
  }
});

function connect(
  url: string,
  opts: Record<string, unknown> = {},
): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      ...opts,
    });
    openClients.push(client);
    client.on('connect', () => resolve(client));
    client.on('connect_error', (err) => reject(err));
  });
}

interface AckResult {
  result: any;
  error: { code?: string; message?: string } | undefined;
}
function emitAck(client: ClientSocket, event: string, payload: unknown): Promise<AckResult> {
  return new Promise((resolve) => {
    client.emit(event, payload, (result: unknown, error: AckResult['error']) =>
      resolve({ result, error }),
    );
  });
}

describe('Abuse and capacity controls (MFP-06)', () => {
  describe('origin allow-list', () => {
    it('accepts an allow-listed origin and rejects others', async () => {
      const url = await start({ corsOrigins: ['https://allowed.example'] });

      // Allowed origin connects.
      const ok = await connect(url, {
        transports: ['polling'],
        extraHeaders: { Origin: 'https://allowed.example' },
      });
      expect(ok.connected).toBe(true);

      // Disallowed origin cannot establish a usable connection.
      await expect(
        connect(url, {
          transports: ['polling'],
          extraHeaders: { Origin: 'https://evil.example' },
        }),
      ).rejects.toBeDefined();
    });
  });

  describe('rate limiting', () => {
    it('throttles a room-creation burst with RATE_LIMITED', async () => {
      const url = await start({ maxEventsPerMinute: 2 });
      const client = await connect(url);

      const first = await emitAck(client, 'create_room', { playerName: 'A' });
      const second = await emitAck(client, 'create_room', { playerName: 'B' });
      const third = await emitAck(client, 'create_room', { playerName: 'C' });

      expect(first.error).toBeUndefined();
      expect(second.error).toBeUndefined();
      expect(third.error?.code).toBe('RATE_LIMITED');
      expect(getMetricCount('rate_limited')).toBeGreaterThan(0);
    });

    it('throttles room-code guessing (join burst) with RATE_LIMITED', async () => {
      const url = await start({ maxEventsPerMinute: 2 });
      const client = await connect(url);

      const j1 = await emitAck(client, 'join_room', { roomId: 'AAAAAA', playerName: 'A' });
      const j2 = await emitAck(client, 'join_room', { roomId: 'BBBBBB', playerName: 'A' });
      const j3 = await emitAck(client, 'join_room', { roomId: 'CCCCCC', playerName: 'A' });

      // First two are well-formed but unknown; the third is throttled.
      expect(j1.error?.code).toBe('ROOM_NOT_FOUND');
      expect(j2.error?.code).toBe('ROOM_NOT_FOUND');
      expect(j3.error?.code).toBe('RATE_LIMITED');
    });
  });

  describe('capacity', () => {
    it('rejects room creation past the server room cap', async () => {
      const url = await start({ maxRooms: 1, maxEventsPerMinute: 100 });
      const client = await connect(url);

      const first = await emitAck(client, 'create_room', { playerName: 'A' });
      const second = await emitAck(client, 'create_room', { playerName: 'B' });

      expect(first.error).toBeUndefined();
      expect(second.result).toBeNull();
      expect(second.error?.code).toBe('SERVER_CAPACITY_REACHED');
    });
  });

  describe('payload size', () => {
    it('survives an oversized message and stays responsive', async () => {
      const url = await start({ maxEventsPerMinute: 100 });
      const attacker = await connect(url);

      // A frame far larger than maxHttpBufferSize (16 KB). We do not await an
      // ack — the transport rejects the frame — we only require the server to
      // stay up and keep serving other clients.
      attacker.emit('create_room', { playerName: 'x'.repeat(40_000) });

      const healthy = await connect(url);
      const { result, error } = await emitAck(healthy, 'create_room', { playerName: 'Alice' });
      expect(error).toBeUndefined();
      expect(result.room.players[0].displayName).toBe('Alice');
    });
  });
});
