# Security finding review — 2026-10-31

## Historical template placeholders

Gitleaks 8.30.1 reported two `generic-api-key` findings in 104 commits. Both
values were inspected locally without publishing them or changing Git history:

| Commit | Location | Review |
| --- | --- | --- |
| `bce01de98aa5edc62e86a85a2364f4ace05840d2` | `.env.example:78` | Commented-out admin password containing a Vietnamese instruction to use at least 14 characters. It is an example instruction, not a generated credential. |
| `a43174919dd21ced9e7609f861f2638a43839be3` | `.env.production.example:9` | Instructional placeholder for a generated encryption key. Its 30 non-hex characters cannot pass the runtime requirement for a 64-character hex key. |

The current templates leave these values empty. `.gitleaksignore` contains
only these two exact fingerprints (commit, path, rule and line). New occurrences
and other values remain subject to the default rules. No secret rotation is
indicated by these two findings; this does not verify production credentials.

## Dependency audit

Nodemailer is updated to 10.3.1 with mail regression tests. A fresh npm audit
on 2026-10-31 also reports a moderate `minimatch` glob amplification advisory
through the development-only ESLint dependency graph (GHSA-g3hv-75wg-m249).
The reported fixed major is outside the dependency ranges of current lint
packages; npm's suggested fix downgrades ESLint/Next lint configuration to
incompatible old majors. No forced downgrade, major override or audit
suppression is applied. Production dependency audit is checked separately.
Lint consumes repository-controlled paths, rather than public request input.

## Local HTTP health probes

The three `react-insecure-request` findings are startup probes in
`scripts/shot-login.mjs`, `scripts/verify-hero.mjs` and
`scripts/verify-motion.mjs`. Each starts its own Next server bound explicitly
to `127.0.0.1` and probes a constant `http://127.0.0.1:<port>/api/health`
URL without credentials or customer payload. These are local verification
scripts, not application request handlers or production transport.

Each reviewed call has a single-rule `nosemgrep` annotation. Redirects now
fail explicitly so a local response cannot forward the probe to a remote HTTP
endpoint, and a two-second timeout bounds each attempt. No file, rule pack or
production call is excluded. If a probe becomes configurable or sends sensitive
payloads, remove the annotation and review its transport again.

Production dependency audit (`npm audit --omit=dev`) reported zero
vulnerabilities during this review.
