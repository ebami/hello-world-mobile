---
name: container-staged-deployment
mfp: MFP-09
title: Create an Operable Container and Staged Deployment Workflow
branch: 10-devops/container-staged-deployment
sequence: 10
execution: code
complexity: Medium/Large
owner: DevOps + Backend
depends_on: [MFP-07, MFP-08]
---

# MFP-09 — Create an Operable Container and Staged Deployment Workflow

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.

## User story

As a release engineer, I need an immutable, health-checked server container and protected staging-to-production workflow so that releases are repeatable, smoke-tested, and reversible.

## Deployment decision

Use **one managed container instance for the initial release**. The deployment must not scale above one instance until shared state and a Socket.IO multi-node adapter are implemented.

Cloud Run may be used as the reference implementation. Keep the Docker image portable to ECS Fargate or Azure Container Apps.

## Files

**Modify**
- `server/src/index.ts` — `/livez`, `/readyz`, graceful `SIGTERM`/`SIGINT` drain, release/SHA in health output.
- `package.json` / `server/package.json` — build wiring for the image.

**Create (suggested)**
- `Dockerfile` — root multi-stage; non-root; production deps only; read-only rootfs where practical.
- `.dockerignore`
- `docker-compose.yml` — local production-like server.
- `scripts/smoke-test.mjs` — liveness/readiness + full multiplayer smoke path.
- `.github/workflows/pr-verify.yml`, `deploy-staging.yml`, `deploy-production.yml`.
- `deploy/` — declarative one-instance config, TLS ingress, env/secret references.
- `docs/runbooks/rollback.md` — route to previous healthy revision; never rebuild old commit.

> Existing workflows live under `.github/workflows/` (AI-authorship). Add deployment workflows alongside them.

## Implementation scope

1. Add a root multi-stage Dockerfile that:
   - Installs through the root workspace lockfile.
   - Builds `@hello-world/game-core`.
   - Builds the server.
   - Produces a minimal runtime image.
   - Runs as a non-root user.
   - Uses production dependencies only at runtime.
   - Supports a read-only root filesystem where practical.
2. Add `.dockerignore`.
3. Add:
   - `GET /livez`: process liveness.
   - `GET /readyz`: readiness and drain state.
4. Implement graceful `SIGTERM`/`SIGINT` behavior:
   - Mark the instance not ready.
   - Stop accepting new rooms.
   - Notify connected clients of planned shutdown.
   - Allow a bounded drain interval.
   - Close Socket.IO and HTTP cleanly.
   - Exit with an appropriate status.
5. Include release version and commit SHA in health output, without exposing secrets.
6. Add a local production-like Docker Compose configuration for the server.
7. Add a smoke-test script that verifies:
   - Liveness and readiness.
   - Socket connection.
   - Room create/join.
   - Two-player start.
   - Public and private state delivery.
   - Invalid command rejection.
   - Reconnect/resume.
   - Graceful shutdown behavior.
8. Add GitHub Actions workflows:
   - Pull request: `npm run verify`.
   - Main: build image once, tag with commit SHA, scan, deploy to staging, run smoke tests.
   - Production: protected approval and promotion of the exact staging-tested image digest.
9. Add declarative deployment configuration or templates for one container instance, TLS ingress, environment variables, and secret references.
10. Add rollback documentation:
    - Route traffic to the previous healthy image/revision.
    - Never rebuild an old commit during rollback.
    - Run rollback smoke tests.
11. Explicitly document the limitation that process restart loses active games until persistent state is implemented.

## Verification

- The container builds from a clean checkout.
- It starts and serves `/livez` and `/readyz`.
- It runs as non-root.
- It does not contain source-only development dependencies unnecessarily.
- `docker stop` produces a graceful shutdown rather than abrupt termination.
- Readiness becomes false before shutdown.
- New rooms are rejected during drain.
- Staging uses the same image digest promoted to production.
- Production deployment requires protected approval.
- Rollback selects a known previous image or revision.
- The reference cloud configuration sets maximum instances to one.
- Smoke tests run automatically after staging and production deployment.

## Test scenarios

_(derived from Verification — the original backlog had no explicit unit-test list; coverage is
primarily the smoke-test script + workflow behavior)_

- `/livez` and `/readyz` respond; `/readyz` flips to not-ready on `SIGTERM`.
- Graceful drain rejects new rooms and closes cleanly within the bounded interval.
- Smoke-test script passes the full connect → create/join → start → state → invalid-command → reconnect path.
- Container runs as non-root and excludes dev-only dependencies.

## Scope boundaries

- Kubernetes.
- Horizontal scaling.
- Redis.
- Zero-loss recovery of active games during deployment.
