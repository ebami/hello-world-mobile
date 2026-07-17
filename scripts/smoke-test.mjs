/**
 * Post-deploy smoke test (MFP-09).
 *
 * Drives the live server end-to-end: health probes, connect, create/join,
 * two-player start, public + private state delivery, invalid-command rejection,
 * and reconnect/resume. Exits 0 on success, 1 on any failure.
 *
 *   SERVER_URL=https://staging.example.com node scripts/smoke-test.mjs
 *
 * Requires the `socket.io-client` dependency (already in the workspace).
 */

import { io as ioClient } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3001';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 10000);

let step = 'startup';
const clients = [];

function fail(message) {
  console.error(`✗ smoke test failed at [${step}]: ${message}`);
  for (const c of clients) c.disconnect();
  process.exit(1);
}

function assert(cond, message) {
  if (!cond) fail(message);
}

function connect() {
  return new Promise((resolve, reject) => {
    const client = ioClient(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      timeout: TIMEOUT_MS,
    });
    clients.push(client);
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });
}

function emitAck(client, event, payload) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`ack timeout for ${event}`)), TIMEOUT_MS);
    client.emit(event, payload, (result, error) => {
      clearTimeout(t);
      resolve({ result, error });
    });
  });
}

function once(client, event) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`event timeout for ${event}`)), TIMEOUT_MS);
    client.once(event, (...args) => {
      clearTimeout(t);
      resolve(args);
    });
  });
}

async function main() {
  step = 'health probes';
  const livez = await fetch(`${SERVER_URL}/livez`);
  assert(livez.status === 200, `/livez returned ${livez.status}`);
  const readyz = await fetch(`${SERVER_URL}/readyz`);
  assert(readyz.status === 200, `/readyz returned ${readyz.status}`);

  step = 'connect + create room';
  const host = await connect();
  const created = await emitAck(host, 'create_room', { playerName: 'SmokeHost' });
  assert(!created.error && created.result?.room?.roomId, 'create_room did not return a session');
  const roomId = created.result.room.roomId;
  const hostToken = created.result.reconnectToken;
  const hostId = created.result.playerId;

  step = 'join room';
  const guest = await connect();
  const joined = await emitAck(guest, 'join_room', { roomId, playerName: 'SmokeGuest' });
  assert(!joined.error && joined.result?.room?.players?.length === 2, 'join_room did not yield 2 players');

  step = 'start game + state/hand delivery';
  const guestStart = once(guest, 'game_start');
  host.emit('start_game');
  const [publicState, privateHand] = await guestStart;
  assert(publicState?.roomId === roomId, 'game_start public state missing roomId');
  assert(Array.isArray(privateHand?.hand) && privateHand.hand.length > 0, 'private hand not delivered');

  step = 'invalid command rejection';
  const badPlay = once(host, 'error');
  host.emit('play_cards', { cardIds: ['definitely-not-a-real-card'] });
  const [errMsg] = await badPlay;
  assert(typeof errMsg === 'string', 'invalid play did not produce an error');

  step = 'reconnect / resume';
  const hostReconnected = await connect();
  const resumed = await emitAck(hostReconnected, 'resume_session', {
    roomId,
    playerId: hostId,
    reconnectToken: hostToken,
  });
  assert(!resumed.error && resumed.result?.playerId === hostId, 'resume_session failed');
  assert(resumed.result?.reconnectToken && resumed.result.reconnectToken !== hostToken, 'token was not rotated on resume');

  for (const c of clients) c.disconnect();
  console.log('✓ smoke test passed');
  process.exit(0);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
