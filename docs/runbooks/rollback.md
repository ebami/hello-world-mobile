# Runbook: Production Rollback (MFP-09)

Roll back by **routing traffic to the previous healthy image/revision** — never
by rebuilding an old commit. Every release is an immutable image digest, so the
prior known-good digest is always available to re-point at.

## When to roll back

- Production smoke tests fail after a deploy.
- Error rate / health probes degrade after a deploy.
- A regression is reported that traces to the latest release.

## Preconditions

- The previous release's image **digest** (`sha256:...`) — from the deploy log
  or the registry. Do **not** use a mutable tag.
- Access to the deployment environment (protected/approved).

## Steps

1. **Identify the previous healthy revision / digest.**
   - Cloud Run: `gcloud run revisions list --service game-server`
   - Note the last revision that passed smoke tests.

2. **Route traffic back to it (no rebuild).**
   - Cloud Run: `gcloud run services update-traffic game-server --to-revisions <PREV_REVISION>=100`
   - ECS: update the service to the previous task-definition revision.
   Do not check out an old commit or rebuild — deploy the existing digest.

3. **Confirm readiness.** Wait for `/readyz` to return `200 {"status":"ready"}`
   on the rolled-back revision.

4. **Run rollback smoke tests.**
   ```bash
   SERVER_URL="https://<production-url>" node scripts/smoke-test.mjs
   ```
   Must exit 0.

5. **Communicate + record.** Note the rolled-back-from and rolled-back-to
   digests, the reason, and the time.

## Known limitation

The MVP holds game state in memory on a **single instance**. Any rollback or
restart **loses active in-progress games** until persistent state exists. Prefer
low-traffic windows; clients reconnect and can start new games afterward.

## After rollback

- Open an incident / issue capturing the failing digest and root cause.
- Do not re-promote the failing digest until the root cause is fixed and it
  passes staging smoke tests again.
