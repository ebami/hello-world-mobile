/**
 * @fileoverview Real Socket.IO client/server integration tests for reconnect,
 * session resume, token rotation, old-socket revocation, and command
 * deduplication over the wire (MFP-04).
 *
 * These connect actual socket.io-client instances to a server bound on an
 * ephemeral port, exercising the full protocol path (schema validation +
 * handlers), not just the unit logic.
 */

import type { AddressInfo } from 'net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { createSocketServer, type SocketServer } from './socketServer';
import { roomManager } from './roomManager';
import { clearAllGraceTimers } from './graceTimers';

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
  server.io.close(() => done());
});

beforeEach(() => {
  (roomManager as unknown as { rooms: Map<string, unknown> }).rooms.clear();
  clearAllGraceTimers();
});

afterEach(() => {
  clearAllGraceTimers();
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

function once<T = unknown>(client: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => client.once(event, (...args: unknown[]) => resolve(args as unknown as T)));
}

async function hostCreates(name = 'Alice'): Promise<{ client: ClientSocket; session: any }> {
  const client = await connect();
  const { result } = await emitAck(client, 'create_room', { playerName: name });
  return { client, session: result };
}

// ---- tests ---------------------------------------------------------------

describe('Session resume (MFP-04)', () => {
  it('resumes a lobby session on a new socket and rotates the token', async () => {
    const { session } = await hostCreates('Alice');

    const fresh = await connect();
    const { result, error } = await emitAck(fresh, 'resume_session', {
      roomId: session.room.roomId,
      playerId: session.playerId,
      reconnectToken: session.reconnectToken,
    });

    expect(error).toBeUndefined();
    expect(result.playerId).toBe(session.playerId);
    expect(result.room.roomId).toBe(session.room.roomId);
    expect(result.room.players).toHaveLength(1); // not duplicated
    expect(result.state).toBeNull(); // still in the lobby
    expect(result.reconnectToken).toEqual(expect.any(String));
    expect(result.reconnectToken).not.toBe(session.reconnectToken); // rotated
  });

  it('resumes an active game with the correct private hand and no duplication', async () => {
    const { client: host, session: hostSession } = await hostCreates('Alice');
    const roomId = hostSession.room.roomId;

    const guest = await connect();
    const { result: guestSession } = await emitAck(guest, 'join_room', {
      roomId,
      playerName: 'Bob',
    });

    const guestStart = once<[unknown, { hand: { id: string }[] }]>(guest, 'game_start');
    host.emit('start_game');
    const [, guestHand] = await guestStart;

    // Guest "reconnects" on a fresh socket and resumes.
    const guestReconnected = await connect();
    const { result, error } = await emitAck(guestReconnected, 'resume_session', {
      roomId,
      playerId: guestSession.playerId,
      reconnectToken: guestSession.reconnectToken,
    });

    expect(error).toBeUndefined();
    expect(result.playerId).toBe(guestSession.playerId);
    expect(result.state).not.toBeNull();
    expect(result.stateVersion).toBe(1);
    expect(result.room.players).toHaveLength(2); // not duplicated
    // The resumed hand matches the one originally dealt to the guest.
    expect(result.hand.hand.map((c: { id: string }) => c.id).sort()).toEqual(
      guestHand.hand.map((c) => c.id).sort(),
    );
  });

  it('revokes the old socket after a resume (token replay takes over)', async () => {
    const { client: host, session: hostSession } = await hostCreates('Alice');
    const roomId = hostSession.room.roomId;
    const guest = await connect();
    const { result: guestSession } = await emitAck(guest, 'join_room', { roomId, playerName: 'Bob' });

    const guestStart = once(guest, 'game_start');
    host.emit('start_game');
    await guestStart;

    // A second socket resumes with the guest's token.
    const guest2 = await connect();
    const { error } = await emitAck(guest2, 'resume_session', {
      roomId,
      playerId: guestSession.playerId,
      reconnectToken: guestSession.reconnectToken,
    });
    expect(error).toBeUndefined();

    // The original guest socket is now stale and cannot submit commands.
    const oldErr = once<[string]>(guest, 'error');
    guest.emit('draw_card');
    const [message] = await oldErr;
    expect(message).toBe('Session no longer active on this connection');
  });

  it('rejects an invalid (tampered) token without revealing state', async () => {
    const { session } = await hostCreates('Alice');
    const fresh = await connect();

    const { result, error } = await emitAck(fresh, 'resume_session', {
      roomId: session.room.roomId,
      playerId: session.playerId,
      reconnectToken: `${session.reconnectToken}tampered`,
    });

    expect(result).toBeNull();
    expect(error?.code).toBe('SESSION_INVALID');
  });

  it('rejects a token presented for the wrong room', async () => {
    const a = await hostCreates('Alice');
    const b = await hostCreates('Bob');

    const fresh = await connect();
    const { result, error } = await emitAck(fresh, 'resume_session', {
      roomId: b.session.room.roomId, // different room
      playerId: a.session.playerId,
      reconnectToken: a.session.reconnectToken, // token scoped to room A
    });

    expect(result).toBeNull();
    expect(error?.code).toBe('SESSION_INVALID');
  });

  it('rejects a resume after an explicit leave (session invalidated)', async () => {
    const { client: host, session: hostSession } = await hostCreates('Alice');
    const roomId = hostSession.room.roomId;
    const guest = await connect();
    const { result: guestSession } = await emitAck(guest, 'join_room', { roomId, playerName: 'Bob' });

    // Guest leaves the lobby; wait until the host observes the update.
    const hostSawUpdate = once(host, 'room_updated');
    guest.emit('leave_room');
    await hostSawUpdate;

    const guest2 = await connect();
    const { result, error } = await emitAck(guest2, 'resume_session', {
      roomId,
      playerId: guestSession.playerId,
      reconnectToken: guestSession.reconnectToken,
    });

    expect(result).toBeNull();
    expect(error?.code).toBe('SESSION_INVALID');
  });

  it('deduplicates a repeated command id over the wire (applied once)', async () => {
    const { client: host, session: hostSession } = await hostCreates('Alice');
    const roomId = hostSession.room.roomId;
    const guest = await connect();
    await emitAck(guest, 'join_room', { roomId, playerName: 'Bob' });

    const hostStart = once<[{ stateVersion: number }, unknown]>(host, 'game_start');
    host.emit('start_game');
    const [startState] = await hostStart;
    expect(startState.stateVersion).toBe(1);

    // Host (seat 0) draws; capture the resulting broadcast version.
    const firstUpdate = once<[{ stateVersion: number }]>(host, 'game_state_update');
    host.emit('draw_card', { commandId: 'dup-1', expectedStateVersion: 1 });
    const [afterFirst] = await firstUpdate;
    expect(afterFirst.stateVersion).toBe(2);

    // Replay the identical command; the dedup path re-sends the current state
    // (version unchanged) rather than applying it again.
    const secondUpdate = once<[{ stateVersion: number }]>(host, 'game_state_update');
    host.emit('draw_card', { commandId: 'dup-1', expectedStateVersion: 1 });
    const [afterDup] = await secondUpdate;
    expect(afterDup.stateVersion).toBe(2);
  });
});
