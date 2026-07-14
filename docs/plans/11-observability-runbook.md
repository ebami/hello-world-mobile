---
name: observability-runbook
mfp: MFP-10
title: Add Structured Logging, Metrics, Crash Reporting, Alerts, and Runbook
branch: 11-operations/observability-runbook
sequence: 11
execution: code
complexity: Medium
owner: DevOps + Backend
depends_on: [MFP-05, MFP-09]
---

# MFP-10 — Add Structured Logging, Metrics, Crash Reporting, Alerts, and Runbook

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.

## User story

As the on-call engineer, I need structured telemetry and documented response procedures so that I can detect failures, diagnose incidents, and determine whether the multiplayer service is healthy.

## Files

**Modify**
- `server/src/index.ts`, `server/src/gameHandler.ts`, `server/src/roomManager.ts` — replace `console.log`; emit metrics on room/game/validation/reconnect/forfeit events.
- `server/src/config.ts` — consume `LOG_LEVEL`, `ERROR_REPORTING_DSN`, `RELEASE_VERSION`.
- `components/ErrorBoundary.tsx` — integrate client crash reporting (no cards/tokens).

**Create (suggested)**
- `server/src/logger.ts` — Pino JSON logger with redaction.
- `server/src/metrics.ts` — counters/gauges + protected metrics endpoint.
- `server/src/errorReporter.ts` — provider adapter, enabled only with a DSN.
- `docs/runbooks/operations.md` — verification, deploy, rollback, incidents, signing-key, drain, single-instance limitation.

**Tests**
- `server/src/logger.test.ts`, `server/src/metrics.test.ts`, `server/src/errorReporter.test.ts` (new).

## Implementation scope

1. Replace direct server `console.log` usage with a structured JSON logger such as Pino.
2. Include:
   - Timestamp.
   - Severity.
   - Service name.
   - Environment.
   - Release version.
   - Event name.
   - Request or command correlation ID.
3. Apply redaction:
   - Never log reconnect tokens.
   - Never log signing keys or environment secrets.
   - Do not log card hands.
   - Do not log raw player display names by default.
   - Avoid complete unvalidated payloads.
4. Add server metrics:
   - Current connected sockets.
   - Active rooms.
   - Active games.
   - Room creation and join outcomes.
   - Validation failures.
   - Rate-limit rejections.
   - Reconnect successes and failures.
   - Command count and latency by command type.
   - State-version mismatches.
   - Forfeits and game completions.
   - Uncaught exceptions.
   - Process memory and event-loop lag.
5. Expose metrics through a protected or internal endpoint.
6. Add crash/error reporting through a provider adapter:
   - Enable only when a DSN/configuration is supplied.
   - Attach release and environment metadata.
   - Redact sensitive data before sending.
7. Integrate client crash reporting with the existing React error boundary and transport failures, without capturing private cards or tokens.
8. Add alert recommendations/configuration for:
   - Instance unavailable.
   - Readiness failure.
   - Process restart.
   - Elevated malformed-event rate.
   - Elevated reconnect failure rate.
   - High command latency.
   - Memory pressure.
   - Event-loop lag.
   - Uncaught exceptions.
9. Add an operational runbook covering:
   - Service verification.
   - Deployment verification.
   - Rollback.
   - Elevated errors.
   - Connection incidents.
   - Signing-key incident.
   - Graceful drain.
   - Known single-instance/state-loss limitation.

## Verification

- Production logs are structured JSON.
- Every accepted or rejected game command can be correlated without exposing hand contents.
- Tokens and secrets are redacted in automated tests.
- Metrics update after room, game, validation, reconnect, and forfeit operations.
- Unhandled process errors are reported before controlled termination.
- Client error reporting is disabled safely when no DSN exists.
- Health, metrics, and logs include the same release version.
- An engineer unfamiliar with the project can use the runbook to verify health and perform rollback.
- Alerts have explicit thresholds or tuning guidance rather than vague descriptions.

## Test scenarios

- Logger redaction tests.
- Token and player-name redaction tests.
- Metrics increment/decrement tests.
- Reconnect metric tests.
- Validation-failure metric tests.
- Error-reporter disabled-mode test.
- Error-reporter sanitization test.
- Health/release metadata test.

## Scope boundaries

- Full distributed tracing across multiple services.
- Long-term analytics or product dashboards.
- Expensive log aggregation architecture.
