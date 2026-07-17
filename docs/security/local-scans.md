# Reproducing Security Scans Locally (MFP-12)

Run the same gates locally before opening a PR. Results should match CI.

## Dependency vulnerabilities (`npm audit` / OSV)

```bash
# Runtime dependencies, High+ (matches the CI gate)
npm audit --audit-level=high --omit=dev

# Full report (all severities, incl. dev deps)
npm audit
```

OSV scanner (matches the OSV CI job):

```bash
# Install once: https://github.com/google/osv-scanner
osv-scanner --lockfile=package-lock.json
```

## Secret scanning (Gitleaks)

```bash
# Install once: https://github.com/gitleaks/gitleaks
gitleaks detect --source . --redact   # --redact keeps secret values out of output
```

## Static analysis (CodeQL)

CodeQL runs in CI. Locally, the fastest equivalent is the type + lint gate:

```bash
npm run typecheck
```

For full CodeQL locally, use the CodeQL CLI + the `javascript-typescript` pack
(see GitHub's CodeQL CLI docs).

## Container image + SBOM (Trivy)

```bash
# Build the image
docker build -t game-server:local .

# Scan (matches the CI gate: fail on CRITICAL)
trivy image --severity CRITICAL --ignore-unfixed --exit-code 1 game-server:local

# Generate a CycloneDX SBOM for the image
trivy image --format cyclonedx --output sbom.cdx.json game-server:local
```

## Notes

- Scanners are configured to redact secret values — never paste raw findings
  containing secrets into issues or chat.
- If a finding must be temporarily waived, add an entry to
  [`exceptions.md`](./exceptions.md) (id, justification, compensating control,
  owner, expiry).
