# Agent code quality and security checks

Install npm tools with `npm ci`. Semgrep and Gitleaks require a running Docker Engine or Docker Desktop in Linux-container mode. Images are pinned in `scripts/code-security.mjs`; source is mounted read-only and Gitleaks redacts values.

| Command | Purpose |
| --- | --- |
| `npm run quality:unused` | Knip: find unused JS/TS files, exports and dependencies |
| `npm run quality:search -- --pattern '$A($$$)' --lang ts src` | ast-grep: structural search before refactoring |
| `npm run security:code` | Semgrep: security-audit, JavaScript and TypeScript rule packs |
| `npm run security:secrets` | Gitleaks: working tree, including uncommitted files |
| `npm run security:history` | Gitleaks: Git history available in the checkout |
| `npm run security:check` | Source and working-tree secret checks |

Knip uses its Next.js plugin plus explicit script/test entrypoints. CSS is included so Tailwind imports are followed. Its nonzero result is a review inventory, not a CI gate: inspect dynamic imports and actual callers before deletion. No blanket autofix is enabled.

Semgrep downloads public registry rules; metrics and version checks are disabled, but rules may change independently of the pinned engine. Gitleaks uses bundled defaults, excluding generated dependencies/build output/Git internals; history is checked separately. Reviewed exceptions are documented in [SECURITY-TRIAGE.md](SECURITY-TRIAGE.md): three rule-specific local health probes and two exact historical placeholder fingerprints. Scan output can contain private code context, even with secrets redacted. Do not commit or share raw reports without review.

Agent loop: scan, inspect the actual code/callers, fix one coherent group, run targeted tests/lint/typecheck, then rescan. Preserve auth, CSRF, validation, error handling and public behavior. Never suppress findings or weaken assertions merely to pass. Existing full preflight/release rules remain in force.

CI's `security` job runs source, working-tree and history scans and blocks deploy alongside `check`. The runner mounts Git metadata separately, read-only, so linked worktrees and normal clones are supported. Scanner/download errors and unreviewed findings fail the job. No broad baseline or automatic suppression is applied. These tools do not establish absence of vulnerabilities; Semgrep Community has cross-file limits and dependency CVE scanning remains separate.

SonarQube MCP is not configured because an instance/credentials were not supplied. Travel/business logic was not automatically refactored based on scanner results.
