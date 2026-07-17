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

_(none)_

There are no High/Critical runtime dependency findings. The last High
(GHSA-96hv-2xvq-fx4p, vulnerable `ws` 6.x/7.x in the Expo/React-Native build
toolchain) was cleared by upgrading to **Expo SDK 57 / React Native 0.86**,
which brings patched `ws` (7.5.12 + 8.21.1) — so the earlier `overrides.ws`
workaround is no longer needed and has been removed. Residual **moderate**
transitive advisories in the build toolchain are below the High+ gate threshold
and are tracked for Dependabot-driven remediation.
