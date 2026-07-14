---
name: environment-configuration
mfp: MFP-07
title: Externalize Configuration and Add Environment-Specific Expo Builds
branch: 07-devops/environment-configuration
sequence: 7
execution: code
complexity: Medium
owner: Frontend + DevOps
depends_on: []
---

# MFP-07 — Externalize Configuration and Add Environment-Specific Expo Builds

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.

## User story

As a release engineer, I need validated environment-specific configuration so that development, staging, and production builds connect to the correct infrastructure without hard-coded localhost values or embedded secrets.

## Repository context

The client defaults to `http://localhost:3001`. The repository has no EAS profiles and lacks iOS and Android application identifiers. The server primarily reads only `PORT`.

## Files

**Modify**
- `networking/socket.ts` / `networking/socketTransport.ts` — remove hard-coded localhost default in production.
- `server/src/index.ts` — read config from the new module.
- `app.json` — migrate/extend into dynamic config.
- `README.md` — local/staging/production setup.
- `package.json` — env-validation scripts.

**Create (suggested)**
- `server/src/config.ts` — typed server config validated once at startup.
- `app.config.ts` — dynamic Expo config with environment resolution + identifiers.
- `eas.json` — development / preview(staging) / production profiles.
- `.env.example`, `server/.env.example` — names + safe examples only.

**Tests**
- `server/src/config.test.ts` (new) — valid + invalid environment cases.

## Implementation scope

1. Add a typed server configuration module that validates environment variables once at startup.
2. Add an Expo `app.config.ts` or equivalent dynamic configuration.
3. Support:
   - `development`
   - `test`
   - `staging` or `preview`
   - `production`
4. Client public configuration:

```text
EXPO_PUBLIC_GAME_SERVER_URL
EXPO_PUBLIC_ENVIRONMENT
EXPO_PUBLIC_RELEASE_VERSION
```

5. Server configuration:

```text
NODE_ENV
PORT
CORS_ORIGINS
LOG_LEVEL
ROOM_TTL_SECONDS
DISCONNECT_GRACE_SECONDS
MAX_ROOMS
MAX_CONNECTIONS_PER_IP
MAX_EVENTS_PER_MINUTE
SESSION_SIGNING_KEY
ERROR_REPORTING_DSN
RELEASE_VERSION
```

6. Treat signing keys and DSNs as server secrets. Do not expose them through `EXPO_PUBLIC_`.
7. Fail production builds or startup when:
   - The game server URL is missing.
   - The URL resolves to localhost.
   - A required server secret is missing.
   - Numeric configuration is invalid.
8. Configure iOS and Android identifiers through protected build variables rather than inventing company identifiers:
   - `IOS_BUNDLE_IDENTIFIER`
   - `ANDROID_PACKAGE`
   - `EAS_PROJECT_ID`
9. Add `eas.json` profiles for development, preview/staging, and production.
10. Add `.env.example` files containing names and safe examples only.
11. Remove production dependence on the hard-coded default URL. A localhost fallback may remain only for an explicit development environment.
12. Add scripts for environment validation and document local, staging, and production setup.

## Verification

- A production client build cannot silently connect to localhost.
- Development can still run against a local server using explicit development configuration.
- Server startup fails with a clear message when required production configuration is missing.
- No secret appears in source code, generated public config, or client bundle variables.
- EAS profiles are present and structurally valid.
- iOS and Android identifiers are configurable without editing tracked source.
- Configuration has unit tests for valid and invalid environments.
- README setup instructions match the implementation.

## Test scenarios

_(derived from Verification — the original backlog had no explicit test list)_

- Valid production config loads; localhost URL in production fails startup.
- Missing required server secret fails startup with a clear message.
- Invalid numeric config value is rejected.
- No secret is exposed through `EXPO_PUBLIC_` / client bundle.
- `eas.json` profiles parse and are structurally valid.

## Scope boundaries

- Creating an Expo account.
- Supplying signing certificates.
- Supplying real production domain names or cloud credentials.
