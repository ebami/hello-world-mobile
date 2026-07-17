# Runbook: Operations (MFP-10)

On-call reference for verifying health, diagnosing incidents, and operating the
multiplayer game server. Assumes no prior project knowledge.

## Telemetry at a glance

- **Logs:** structured JSON, one object per line (`severity`, `service`,
  `environment`, `release`, `event`, `message`, plus fields). Reconnect tokens,
  signing keys, DSNs, card hands, and display names are redacted.
- **Health:** `GET /livez` (process up), `GET /readyz` (ready; `503` while
  draining), `GET /health` (release + commit SHA).
- **Metrics:** `GET /metrics` (requires `x-metrics-token` when
  `METRICS_TOKEN` is set; not exposed in production without a token). Returns
  counters, gauges (`connected_sockets`, `active_rooms`, `active_games`), and
  process stats (`rss_bytes`, `heap_used_bytes`, `event_loop_lag_ms`).
- **Crash reporting:** server errors ship to the provider when
  `ERROR_REPORTING_DSN` is set; client errors when
  `EXPO_PUBLIC_ERROR_REPORTING_DSN` is set. Both are safe no-ops otherwise.

`/health`, `/metrics`, and logs all carry the same release version — confirm they
match after a deploy.

## Service verification

1. `curl -fsS https://<url>/livez` → `{"status":"ok"}`.
2. `curl -fsS https://<url>/readyz` → `200 {"status":"ready", ...}`.
3. `curl -fsS https://<url>/health` → confirm expected `version` / `commit`.
4. `SERVER_URL=https://<url> node scripts/smoke-test.mjs` exits 0.

## Deployment verification

- Staging deploy ran `npm run verify` and the smoke test (see PR/deploy logs).
- `/health` on staging reports the new commit SHA.
- Production promoted the **same** image digest tested in staging.

## Rollback

See [`rollback.md`](./rollback.md): route to the previous healthy revision —
never rebuild an old commit — then re-run the smoke test.

## Incident playbooks

### Elevated errors / uncaught exceptions
- Check `uncaught_exception` counter and crash-provider issues.
- Inspect recent JSON logs (`severity=error`) for the `event` and correlation id.
- If the process is crash-looping, roll back.

### Connection incidents (clients cannot connect / reconnect)
- `connected_sockets` gauge at/near the per-IP or total caps → capacity or a
  client reconnect storm; check `rate_limited` / `connection_rejected`.
- Elevated `reconnect_failure` → token/expiry or clock issues; verify
  `SESSION_SIGNING_KEY` unchanged and `RELEASE_VERSION` consistent.
- Verify CORS `CORS_ORIGINS` includes the client origin (`origin_rejected`).

### Signing-key incident (suspected key leak)
1. Rotate `SESSION_SIGNING_KEY` in the secret store and redeploy.
2. Rotation invalidates all outstanding reconnect tokens — active players must
   reconnect and start new games (in-memory state is lost; see limitation).
3. Confirm the key never appears in logs (it is redacted by design).

### Graceful drain (planned restart)
- Sending `SIGTERM`/`SIGINT` (or `docker stop`) marks `/readyz` not-ready,
  refuses new rooms, notifies clients (`server_shutdown`), drains for the
  configured grace period, then closes cleanly.
- Confirm `/readyz` returns `503` during drain and the process exits 0.

## Alert recommendations (thresholds — tune per traffic)

| Alert | Condition | Suggested threshold |
|-------|-----------|---------------------|
| Instance unavailable | `/livez` failing | 2 consecutive failures (~1 min) |
| Readiness failure | `/readyz` != 200 outside a deploy | > 2 min |
| Process restart | new `release`/start log unexpectedly | any unplanned |
| Malformed-event spike | `validation_failed` rate | > 5× baseline for 5 min |
| Reconnect failures | `reconnect_failure` / `reconnect_success` | > 20% for 5 min |
| High command latency | p95 command handling | > 250 ms for 5 min |
| Memory pressure | `rss_bytes` | > 80% of container limit for 5 min |
| Event-loop lag | `event_loop_lag_ms` | > 100 ms mean for 5 min |
| Uncaught exceptions | `uncaught_exception` | any (page) |

## Known limitation

Single instance, in-memory state. Any restart, deploy, or rollback **loses
active in-progress games** until persistent state and a multi-node Socket.IO
adapter are implemented. The reference deployment pins max instances to 1.
