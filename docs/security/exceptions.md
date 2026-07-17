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

There are no High/Critical runtime dependency findings — `npm audit fix`
(non-breaking) plus a `ws` override (`overrides.ws: ^8.18.0`, forcing the
Expo/React-Native build toolchain onto the same safe `ws@8` the Socket.IO stack
uses) cleared the last High (GHSA-96hv-2xvq-fx4p). Residual **moderate**
transitive advisories in the build toolchain are below the High+ gate threshold
and are tracked for Dependabot-driven remediation.
