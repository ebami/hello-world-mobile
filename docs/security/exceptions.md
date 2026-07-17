# Security Exceptions (MFP-12)

Mandatory security gates are release-blocking. A finding may be **temporarily**
waived only with a documented exception here. No exception is permanent — every
entry has an expiry, after which the gate blocks again until renewed or fixed.

## Policy

- **Verified secret finding:** never waivable — rotate the secret and purge it.
- **Critical container vulnerability:** blocks release; waiver requires a
  compensating control and a short expiry.
- **High/Critical runtime dependency vulnerability:** blocks release unless a
  waiver below is active.
- **High-severity static-analysis (CodeQL) finding:** blocks release.

## Required fields

Every exception MUST include all of:

- **ID** — the finding identifier (CVE / GHSA / rule id).
- **Justification** — why it is not exploitable / not applicable here.
- **Compensating control** — what mitigates the risk in the meantime.
- **Owner** — a named person accountable.
- **Expiry** — ISO date; the waiver is invalid after this.

## Format

```
- id: <CVE-xxxx-xxxx | GHSA-xxxx | codeql:rule>
  justification: <technical reason>
  compensating_control: <mitigation>
  owner: <name / handle>
  expiry: <YYYY-MM-DD>
```

## Active exceptions

Pre-existing High/moderate advisories in the **Expo / React Native build
toolchain** (transitive). `npm audit fix` (non-breaking) has been applied;
the residual findings require a breaking toolchain upgrade and are tracked for
Dependabot-driven remediation. The CI gate hard-blocks CRITICAL; new High+
dependencies are blocked by the dependency-review gate on every PR.

```
- id: GHSA-96hv-2xvq-fx4p            # ws 6.x/7.x memory-exhaustion DoS (High)
  justification: >
    Transitive dependency of the Expo/React Native build toolchain
    (@react-native-community/cli et al.), not the server's Socket.IO stack,
    which uses ws@8. The vulnerable ws is not reachable in the deployed server
    runtime, and ws is not run as a server in the mobile client. The fix
    requires a breaking toolchain upgrade.
  compensating_control: >
    The production server enforces maxHttpBufferSize (16 KB) plus connection
    and per-event rate limits and payload caps (MFP-06), mitigating WebSocket
    memory-exhaustion DoS on the actual server surface.
  owner: security-owner (replace with a named owner)
  expiry: 2026-10-15

- id: transitive-moderate-toolchain  # remaining moderate advisories (audit)
  justification: >
    Moderate-severity DoS/ReDoS advisories in transitive build-toolchain
    dependencies (brace-expansion, minimatch, js-yaml, postcss, etc.). Below
    the CRITICAL hard-block threshold; not in the server request path.
  compensating_control: Dependabot weekly updates + dependency-review on PRs.
  owner: security-owner (replace with a named owner)
  expiry: 2026-10-15
```
