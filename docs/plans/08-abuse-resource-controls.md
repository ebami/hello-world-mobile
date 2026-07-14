---
name: abuse-resource-controls
mfp: MFP-06
title: Add Server-Owned Abuse, Capacity, Payload, and Origin Controls
branch: 08-security/abuse-resource-controls
sequence: 8
execution: code
complexity: Medium
owner: Backend + Security + DevOps
depends_on: [MFP-01, MFP-07]
---

# MFP-06 — Add Server-Owned Abuse, Capacity, Payload, and Origin Controls

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.

## User story

As a service owner, I need server-enforced capacity and abuse controls so that anonymous clients cannot create unlimited rooms, brute-force room codes, flood commands, or exhaust memory and CPU.

## Files

**Modify**
- `server/src/index.ts` — CORS allowlist (Express + Socket.IO), `maxHttpBufferSize`, wire limiter + caps.
- `server/src/roomManager.ts` — max active rooms; room expiration/TTL + periodic cleanup.
- `server/src/config.ts` — consume `CORS_ORIGINS`, `MAX_*`, `*_TTL_SECONDS` from MFP-07.
- `packages/game-core/src/types.ts` — stable error codes (`RATE_LIMITED`, `ROOM_CAPACITY_REACHED`, …).

**Create (suggested)**
- `server/src/rateLimiter.ts` — in-memory limiter behind a Redis-replaceable interface.
- `server/src/metricsHooks.ts` — emit hooks MFP-10 consumes.

**Tests**
- `server/src/rateLimiter.test.ts`, `server/src/roomManager.test.ts`, `server/src/*.test.ts` — origin, burst, capacity, TTL, payload cases.

## Implementation scope

1. Replace unrestricted CORS with a validated allowlist from `CORS_ORIGINS`.
2. Ensure browser-origin checks are applied to both Express and Socket.IO.
3. Add Socket.IO connection and event rate controls:
   - Connection attempts per IP.
   - Room creation attempts.
   - Room join attempts.
   - Gameplay commands per player/socket.
   - Invalid-payload attempts.
4. Use an in-memory limiter suitable for the required single-instance deployment. Hide it behind an interface that can later be replaced by Redis.
5. Add hard server-owned limits:
   - Maximum active rooms.
   - Maximum connected sockets.
   - Maximum sockets per IP.
   - Two players per room.
   - Player-name length.
   - Command-array length.
   - Event payload size.
   - Maximum command rate.
6. Configure Socket.IO `maxHttpBufferSize` to a small value appropriate for game commands.
7. Add room expiration:
   - Empty-room TTL.
   - Idle lobby TTL.
   - Completed-room TTL.
   - Safe periodic cleanup.
8. Do not allow client configuration to raise any server limit.
9. Return stable errors such as:
   - `RATE_LIMITED`
   - `ROOM_CAPACITY_REACHED`
   - `SERVER_CAPACITY_REACHED`
   - `ORIGIN_NOT_ALLOWED`
   - `PAYLOAD_TOO_LARGE`
10. Emit metrics/hooks that MFP-10 can consume.
11. Avoid trusting raw proxy headers unless trusted proxy configuration is explicit.

## Verification

- A disallowed browser origin cannot establish a usable Socket.IO connection.
- Repeated room creation or room-code guessing is throttled.
- A client cannot create more rooms after the configured server cap.
- Oversized Socket.IO messages are rejected without destabilizing the process.
- Expired empty and idle rooms are removed.
- An active room is not removed by the idle-lobby cleanup rule.
- Client-provided values cannot override the two-player limit.
- Valid players under normal command rates are unaffected.
- Rate-limit errors do not leak internal configuration.

## Test scenarios

- Allowed and disallowed origin tests.
- Room-creation burst test.
- Join-code brute-force simulation.
- Oversized payload test.
- Excessive gameplay-command test.
- Maximum-room test.
- Empty-room expiry.
- Idle-lobby expiry.
- Active-room retention.
- Completed-room expiry.
- Configuration-boundary tests.

## Scope boundaries

- Distributed rate limiting.
- DDoS protection at the cloud edge.
- Web application firewall configuration.
