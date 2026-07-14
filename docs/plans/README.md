# Multiplayer "Must Fix" Backlog — `ce-work` plan set

This directory is the twelve-story "Must Fix" backlog for the **Black Jack Black** monorepo,
split into one `ce-work`-ready plan file per story.

> **One story per branch and per `ce-work` session.** Do not run more than one plan at a
> time. The identity, lifecycle, and reconnect changes are substantial and need isolated
> review. Feeding the whole set to a single `/ce-work` run is explicitly unsupported.

Each plan carries YAML frontmatter (`execution: code`, `mfp`, `branch`, `depends_on`,
`sequence`) and uses the canonical `ce-work` section names — `Files`, `Verification`,
`Test scenarios`, `Scope boundaries`. Run one with:

```text
/ce-work docs/plans/01-socket-runtime-validation.md
```

## Execution order

Files are numbered by **execution sequence** (not by MFP id), so they sort in run order.

| Seq | File | MFP | Branch | Depends on | Complexity |
|---:|---|---|---|---|---|
| 1 | `01-socket-runtime-validation.md` | MFP-01 | `01-security/socket-runtime-validation` | — | Medium |
| 2 | `02-server-authoritative-card-commands.md` | MFP-02 | `02-security/server-authoritative-card-commands` | MFP-01 | Medium |
| 3 | `03-stable-player-sessions.md` | MFP-03 | `03-security/stable-player-sessions` | MFP-01 | Large |
| 4 | `04-two-player-online-mvp.md` | MFP-11 | `04-product/two-player-online-mvp` | — | Small |
| 5 | `05-room-game-lifecycle.md` | MFP-05 | `05-architecture/room-game-lifecycle` | MFP-03, MFP-11 | Large |
| 6 | `06-reconnect-resume.md` | MFP-04 | `06-resilience/reconnect-resume` | MFP-03, MFP-05 | Large |
| 7 | `07-environment-configuration.md` | MFP-07 | `07-devops/environment-configuration` | — | Medium |
| 8 | `08-abuse-resource-controls.md` | MFP-06 | `08-security/abuse-resource-controls` | MFP-01, MFP-07 | Medium |
| 9 | `09-release-verification.md` | MFP-08 | `09-quality/release-verification` | MFP-01…07 | Medium |
| 10 | `10-container-staged-deployment.md` | MFP-09 | `10-devops/container-staged-deployment` | MFP-07, MFP-08 | Medium/Large |
| 11 | `11-observability-runbook.md` | MFP-10 | `11-operations/observability-runbook` | MFP-05, MFP-09 | Medium |
| 12 | `12-ci-supply-chain-gates.md` | MFP-12 | `12-security/ci-supply-chain-gates` | MFP-08, MFP-09 | Small/Medium |

## Dependency spine

**MFP-03, MFP-05, and MFP-04 must not be combined into one pull request**, even though they
are related. Their order matters:

```text
Stable identity (MFP-03)
    ↓
Stable room/game lifecycle (MFP-05)
    ↓
Reconnect and command recovery (MFP-04)
```

The initial production release targets **two-player online multiplayer**. Three-to-four-player
multiplayer is a later epic.

## Common execution contract

Paste this preamble before running each individual plan (each plan links back here):

```text
You are modifying the "Black Jack Black" TypeScript monorepo.

Relevant areas include:
- packages/game-core/src: shared game rules, domain types, and Socket.IO protocol types
- server/src: Express, Socket.IO handlers, room management, and multiplayer game handling
- networking: client Socket.IO transport and transport types
- stores: client session state
- screens: Expo/React Native screens
- __tests__ and server/src/*.test.ts: automated tests

Implement the attached story end to end. Do not stop after producing an analysis or plan.

Working rules:
1. Inspect the existing implementation and tests before editing.
2. Keep the multiplayer server authoritative. Never trust card data, player identity, room identity, state versions, or authorization claims supplied by the client.
3. Put protocol and domain types shared by the server and client in @hello-world/game-core.
4. Update all affected server, client, shared-package, test, and documentation code together.
5. Preserve existing gameplay rules unless the story explicitly changes them.
6. Do not hide problems with `any`, `@ts-ignore`, disabled tests, skipped tests, weakened assertions, or broad exception swallowing.
7. Do not commit secrets, credentials, production URLs, signing keys, EAS credentials, or cloud account identifiers.
8. Add positive, negative, malformed-input, and regression tests for the change.
9. Keep the change within this story. Do not introduce Redis, Kubernetes, accounts, leaderboards, or unrelated refactoring unless explicitly required.
10. Prefer small, named modules and pure functions over adding more logic to server/src/index.ts.

Run all applicable verification commands:
- npm run build:core
- npm run build -w hello-world-mobile-server
- node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
- npm test -- --runInBand
- npm test -w hello-world-mobile-server -- --runInBand
- npx expo export --platform web

At completion, return:
- A concise implementation summary
- Architectural decisions made
- Files added, changed, and removed
- Tests added
- Exact verification commands and their results
- Remaining risks or manual configuration steps
- Any acceptance criterion that was not completed, with a precise reason
```

## Notes on the split

- Section renames from the original backlog: **Acceptance criteria → Verification**,
  **Required tests → Test scenarios**, **Out of scope → Scope boundaries**. Content is
  otherwise preserved verbatim.
- Each plan adds a `Files` section. **Modify** paths are verified to exist today; **Create**
  paths are *suggested* module boundaries — `ce-work` owns the final HOW and may choose
  different names.
- Shared protocol/domain types live in `packages/game-core/src/types.ts` and are re-exported
  by `server/src/types.ts` and `networking/types.ts`.
- MFP-08's premise ("two failing StatsScreen tests") may be stale — recent commits added
  StatsScreen coverage. Re-check current test state before running plan 09.
