/**
 * @fileoverview Real Socket.IO client/server integration tests for runtime
 * payload validation and crash containment (MFP-01).
 *
 * These tests connect an actual socket.io-client to a server bound on an
 * ephemeral port and fire malformed / malicious events. The core assertion in
 * every case is the same: the server never crashes and stays responsive to a
 * subsequent valid request.
 */

import type { AddressInfo } from 'net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { createSocketServer, type SocketServer } from './socketServer';
import { roomManager } from './roomManager';
import { resetAbuseControls } from './rateLimiter';

let server: SocketServer;
let url: string;
const openClients: ClientSocket[] = [];

beforeAll((done) => {
  server = createSocketServer();
  server.httpServer.listen(0, () => {
    const { port } = server.httpServer.address() as AddressInfo;
    url = `http://localhost:${port}`;
    done();
  });
});

afterAll((done) => {
  // Socket.IO v4's Server.close() also closes the underlying HTTP server, so a
  // single close is sufficient (and avoids a redundant second close whose
  // ERR_SERVER_NOT_RUNNING would otherwise be silently discarded).
  server.io.close(() => done());
});

beforeEach(() => {
  roomManager.resetForTests();
  resetAbuseControls();
});

afterEach(() => {
  while (openClients.length > 0) {
    openClients.pop()?.disconnect();
  }
});

// ---- helpers -------------------------------------------------------------

function connect(): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    openClients.push(client);
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });
}

interface AckResult {
  // Create/join acknowledge with a RoomSession (room + opaque identity + token);
  // typed as unknown here since these tests also fire malformed requests.
  session: unknown;
  error: { code?: string; message?: string } | undefined;
}

/** Emit an event with a payload and await the acknowledgement callback. */
function emitWithAck(
  client: ClientSocket,
  event: string,
  payload: unknown,
): Promise<AckResult> {
  return new Promise((resolve) => {
    client.emit(event, payload, (session: unknown, error: AckResult['error']) =>
      resolve({ session, error }),
    );
  });
}

/** Wait for the next server `error` event on this client. */
function nextError(client: ClientSocket): Promise<string> {
  return new Promise((resolve) => client.once('error', resolve));
}

const validCreate = { playerName: 'Alice' };

/** Prove the server is still alive and answering after a bad request. */
async function expectServerResponsive(client: ClientSocket): Promise<void> {
  const { session, error } = await emitWithAck(client, 'create_room', validCreate);
  expect(error).toBeUndefined();
  // A healthy create returns a RoomSession whose room lists the display name.
  expect(session).toMatchObject({
    playerId: expect.any(String),
    reconnectToken: expect.any(String),
    room: { players: [{ displayName: 'Alice' }] },
  });
}

// ---- tests ---------------------------------------------------------------

describe('Socket.IO runtime validation (MFP-01)', () => {
  it('rejects create_room with a null payload without crashing', async () => {
    const client = await connect();

    const { session: room, error } = await emitWithAck(client, 'create_room', null);

    expect(room).toBeNull();
    expect(error?.code).toBe('INVALID_PAYLOAD');
    await expectServerResponsive(client);
  });

  it('rejects create_room for various malformed primitives', async () => {
    const client = await connect();

    for (const bad of ['a string', 42, ['array'], true]) {
      const { session: room, error } = await emitWithAck(client, 'create_room', bad);
      expect(room).toBeNull();
      expect(error?.code).toBe('INVALID_PAYLOAD');
    }

    await expectServerResponsive(client);
  });

  it('does not crash when the acknowledgement callback is omitted', async () => {
    const client = await connect();

    // Valid payload, but no callback supplied.
    client.emit('create_room', validCreate);
    // Malformed payload, also no callback.
    client.emit('create_room', null);

    // A fresh, well-formed request with a callback still succeeds.
    await expectServerResponsive(client);
  });

  it('does not crash when the acknowledgement callback is falsified', async () => {
    const client = await connect();

    // A non-function where the ack is expected is treated as data (no ack).
    client.emit('create_room', validCreate, 'not-a-function' as unknown as () => void);

    await expectServerResponsive(client);
  });

  it('rejects join_room with a malformed room code', async () => {
    const client = await connect();

    const { session: room, error } = await emitWithAck(client, 'join_room', {
      roomId: 'lower!!',
      playerName: 'Bob',
    });

    expect(room).toBeNull();
    expect(error?.code).toBe('INVALID_PAYLOAD');
    await expectServerResponsive(client);
  });

  it('returns ROOM_NOT_FOUND for a well-formed but unknown room code', async () => {
    const client = await connect();

    const { session: room, error } = await emitWithAck(client, 'join_room', {
      roomId: 'ZZZZZZ',
      playerName: 'Bob',
    });

    expect(room).toBeNull();
    expect(error?.code).toBe('ROOM_NOT_FOUND');
  });

  it('rejects empty and oversized player names', async () => {
    const client = await connect();

    const empty = await emitWithAck(client, 'create_room', { playerName: '   ' });
    expect(empty.error?.code).toBe('INVALID_PAYLOAD');

    const huge = await emitWithAck(client, 'create_room', {
      playerName: 'x'.repeat(500),
    });
    expect(huge.error?.code).toBe('INVALID_PAYLOAD');

    await expectServerResponsive(client);
  });

  it('rejects invalid maxPlayers (negative, fractional, NaN, excessive)', async () => {
    const client = await connect();

    for (const maxPlayers of [1, -1, 2.5, NaN, 5, 999]) {
      const { session: room, error } = await emitWithAck(client, 'create_room', {
        playerName: 'Alice',
        maxPlayers,
      });
      expect(room).toBeNull();
      expect(error?.code).toBe('INVALID_PAYLOAD');
    }

    await expectServerResponsive(client);
  });

  it('rejects unknown fields (strict schemas)', async () => {
    const client = await connect();

    const { session: room, error } = await emitWithAck(client, 'create_room', {
      playerName: 'Alice',
      isAdmin: true,
    });

    expect(room).toBeNull();
    expect(error?.code).toBe('INVALID_PAYLOAD');
    await expectServerResponsive(client);
  });

  it('rejects malformed play_cards via the error event', async () => {
    const client = await connect();

    const errorPromise = nextError(client);
    client.emit('play_cards', [{ id: 1, rank: 'ZZ', suit: 'purple' }]);

    const message = await errorPromise;
    // Stable, safe display message — and it must not echo the malformed values.
    expect(message).toBe('Invalid play_cards request.');
    expect(message).not.toMatch(/ZZ|purple/);
    await expectServerResponsive(client);
  });

  it('does not crash on no-payload events sent with junk arguments or a falsified ack', async () => {
    const client = await connect();

    // leave_room / start_game / draw_card / declare_last_card carry no payload;
    // a hostile client can still fire them with extra positional args or a
    // non-function where an ack would go. None of that may crash the process.
    const junkByEvent: Array<[string, unknown[]]> = [
      ['leave_room', [{ junk: true }, 'not-a-function']],
      ['start_game', [42]],
      ['draw_card', [['x'], null]],
      ['declare_last_card', [{ a: 1 }, true]],
    ];
    for (const [event, args] of junkByEvent) {
      client.emit(event, ...args);
    }

    await expectServerResponsive(client);
  });

  it('supports the full valid create + join flow', async () => {
    const host = await connect();
    const { session } = await emitWithAck(host, 'create_room', {
      playerName: 'Alice',
      maxPlayers: 2,
    });
    const hostSession = session as { room: { roomId: string } };
    const roomId = hostSession.room.roomId;
    expect(roomId).toMatch(/^[A-Z0-9]{6}$/);

    const guest = await connect();
    const joined = await emitWithAck(guest, 'join_room', {
      roomId,
      playerName: 'Bob',
    });
    expect(joined.error).toBeUndefined();
    const guestSession = joined.session as { room: { players: unknown[] } };
    expect(guestSession.room.players).toHaveLength(2);
  });

  it('issues an opaque identity, host id, and a room-scoped session (MFP-03)', async () => {
    const client = await connect();
    const { session, error } = await emitWithAck(client, 'create_room', validCreate);
    expect(error).toBeUndefined();

    const s = session as {
      room: {
        hostId: string;
        players: { playerId: string; displayName: string }[];
      };
      playerId: string;
      reconnectToken: string;
      expiresAt: string;
    };

    // Identity is opaque — never the display name — and the host id matches it.
    expect(s.playerId).not.toBe('Alice');
    expect(s.room.hostId).toBe(s.playerId);
    expect(s.room.hostId).not.toBe('Alice');
    expect(s.room.players[0].displayName).toBe('Alice');
    expect(s.room.players[0].playerId).toBe(s.playerId);

    // A signed, expiring reconnect token is returned and is NOT part of the
    // public room state.
    expect(typeof s.reconnectToken).toBe('string');
    expect(s.reconnectToken.length).toBeGreaterThan(0);
    expect(new Date(s.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(JSON.stringify(s.room)).not.toContain(s.reconnectToken);
  });

  it('never writes the reconnect token to the server logs', async () => {
    const logs: string[] = [];
    const spy = jest
      .spyOn(console, 'log')
      .mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      });
    try {
      const client = await connect();
      const { session } = await emitWithAck(client, 'create_room', validCreate);
      const token = (session as { reconnectToken: string }).reconnectToken;
      expect(token.length).toBeGreaterThan(0);
      expect(logs.some((line) => line.includes(token))).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('caps rooms at two players and rejects a third join with ROOM_FULL (MFP-11)', async () => {
    const host = await connect();
    const { session } = await emitWithAck(host, 'create_room', validCreate);
    const created = session as { room: { roomId: string; maxPlayers: number } };
    expect(created.room.maxPlayers).toBe(2);
    const roomId = created.room.roomId;

    const guest = await connect();
    const second = await emitWithAck(guest, 'join_room', { roomId, playerName: 'Bob' });
    expect(second.error).toBeUndefined();

    const third = await connect();
    const rejected = await emitWithAck(third, 'join_room', { roomId, playerName: 'Carol' });
    expect(rejected.session).toBeNull();
    expect(rejected.error?.code).toBe('ROOM_FULL');
  });

  it('accepts a host-chosen 4-player room and rejects a fifth join with ROOM_FULL', async () => {
    const host = await connect();
    const { session, error } = await emitWithAck(host, 'create_room', {
      playerName: 'Alice',
      maxPlayers: 4,
    });
    expect(error).toBeUndefined();
    const created = session as { room: { roomId: string; maxPlayers: number } };
    expect(created.room.maxPlayers).toBe(4);
    const roomId = created.room.roomId;

    for (const name of ['Bob', 'Carol', 'Dave']) {
      const guest = await connect();
      const res = await emitWithAck(guest, 'join_room', { roomId, playerName: name });
      expect(res.error).toBeUndefined();
    }

    const fifth = await connect();
    const rejected = await emitWithAck(fifth, 'join_room', { roomId, playerName: 'Erin' });
    expect(rejected.session).toBeNull();
    expect(rejected.error?.code).toBe('ROOM_FULL');
  });

  it('rejects a client-supplied maxPlayers outside the 2-4 range', async () => {
    const client = await connect();
    const { session, error } = await emitWithAck(client, 'create_room', {
      playerName: 'Alice',
      maxPlayers: 5,
    });
    expect(session).toBeNull();
    expect(error?.code).toBe('INVALID_PAYLOAD');
    await expectServerResponsive(client);
  });

  it('an active-game leave forfeits and the opponent gets a single game_over (MFP-05)', async () => {
    const host = await connect();
    const { session: hostSession } = await emitWithAck(host, 'create_room', validCreate);
    const roomId = (hostSession as { room: { roomId: string } }).room.roomId;

    const guest = await connect();
    const { session: guestSession } = await emitWithAck(guest, 'join_room', {
      roomId,
      playerName: 'Bob',
    });
    const guestId = (guestSession as { playerId: string }).playerId;

    // Host starts the game; wait until the guest sees game_start.
    const started = new Promise<void>((resolve) =>
      guest.once('game_start', () => resolve()),
    );
    host.emit('start_game');
    await started;

    // Host leaves mid-game — a forfeit; the guest must win via a single game_over.
    const over = new Promise<[string | null, string]>((resolve) =>
      guest.once('game_over', (winnerId: string | null, message: string) =>
        resolve([winnerId, message]),
      ),
    );
    host.emit('leave_room');

    const [winnerId, message] = await over;
    expect(winnerId).toBe(guestId);
    expect(message).toContain('forfeit');
  });

  it('stays responsive after a burst of malformed requests', async () => {
    const client = await connect();

    const bad: unknown[] = [null, undefined, 0, '', [], { nope: true }];
    for (const payload of bad) {
      // Interleave a valid request after each invalid one.
      const invalid = await emitWithAck(client, 'create_room', payload);
      expect(invalid.error?.code).toBe('INVALID_PAYLOAD');
      await expectServerResponsive(client);
    }
  });
});
