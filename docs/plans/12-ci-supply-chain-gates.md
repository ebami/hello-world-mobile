---
name: ci-supply-chain-gates
mfp: MFP-12
title: Add Dependency, Secret, Source, Container, and SBOM Security Gates
branch: 12-security/ci-supply-chain-gates
sequence: 12
execution: code
complexity: Small/Medium
owner: Security + DevOps
depends_on: [MFP-08, MFP-09]
---

# MFP-12 — Add Dependency, Secret, Source, Container, and SBOM Security Gates

> **Execution contract:** paste the [Common execution contract](./README.md#common-execution-contract) before running this plan.

## User story

As a security owner, I need automated supply-chain and source scanning on every change and release so that known critical vulnerabilities, committed secrets, and unsafe container contents block deployment.

## Files

**Create (suggested)**
- `.github/workflows/security-pr.yml` — dependency review, CodeQL, `npm audit`, OSV, Gitleaks.
- `.github/workflows/security-image.yml` — Trivy image/filesystem scan + SBOM (CycloneDX/SPDX) on the built image digest.
- `.github/dependabot.yml` — grouped, reviewable dependency updates.
- `docs/security/exceptions.md` — exception format (id, justification, compensating control, owner, expiry).
- `docs/security/local-scans.md` — how developers reproduce scans locally.

**Modify**
- `.github/workflows/deploy-*.yml` (from MFP-09) — make mandatory gates release-blocking; scan the promoted digest.

> Reuse maintained official actions; pin third-party actions by immutable commit SHA. Do not use
> `continue-on-error` on mandatory release gates.

## Implementation scope

1. Add pull-request security checks for:
   - Dependency changes.
   - Known package vulnerabilities.
   - Static source analysis.
   - Secret detection.
2. Add image security checks after the production image is built.
3. Generate a machine-readable software bill of materials for every release image.
4. Recommended categories:
   - GitHub dependency review.
   - CodeQL for JavaScript/TypeScript.
   - `npm audit` for runtime dependencies.
   - OSV-compatible dependency scan.
   - Gitleaks or equivalent secret scan.
   - Trivy or equivalent container/filesystem scan.
   - CycloneDX or SPDX SBOM.
5. Use maintained official actions/tools and pin third-party actions by immutable commit SHA where practical.
6. Establish release-blocking policy:
   - Any verified secret finding blocks the build.
   - Critical container vulnerabilities block the build.
   - High or critical runtime dependency vulnerabilities block the build unless a documented temporary exception exists.
   - Static-analysis findings of high severity block the build.
7. Add an exception format requiring:
   - Finding identifier.
   - Technical justification.
   - Compensating control.
   - Owner.
   - Expiration date.
8. Do not use `continue-on-error` for mandatory release gates.
9. Upload security reports and SBOMs as build artifacts.
10. Add dependency-update automation with grouped, reviewable updates.
11. Scan the exact image digest promoted to staging and production.
12. Document how developers reproduce scans locally.

## Verification

- A deliberately committed test secret is detected by a controlled scanner test and is not retained in repository history.
- A known vulnerable test fixture or scanner test case causes the expected job to fail.
- The production image is scanned after build.
- The SBOM corresponds to the released image digest.
- Production promotion cannot run when a mandatory security job fails.
- Security exceptions have owners and expiration dates.
- Reports are retained according to a documented policy.
- Forked pull requests cannot access deployment credentials or production secrets.
- Scanners do not print secret values into logs.

## Test scenarios

_(derived from Verification — the original backlog had no explicit unit-test list; coverage is
primarily controlled scanner fixtures + workflow gating behavior)_

- Controlled test-secret fixture trips the secret scanner and blocks the build.
- Known-vulnerable fixture trips the dependency/image scan and blocks the build.
- Mandatory-gate failure prevents production promotion.
- SBOM output matches the released image digest.
- Forked-PR runs cannot read deployment credentials.

## Scope boundaries

- Penetration testing.
- Mobile application store security review.
- Formal compliance certification.
