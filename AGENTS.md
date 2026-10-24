<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Gate before push and before any merge request

Never push a branch or open/merge a pull request into `main` without:

```sh
npm run verify:preflight             # lint, typecheck, unit + CMS tests, production build
npm run verify:preflight -- --full   # adds verify:ui, verify:tour-import, verify:cms, verify:hero
```

- CI (`.github/workflows/ci-deploy.yml`) runs the same commands on every PR and on `main`; a failure there blocks deploy.
- Enable the local hook once per clone: `git config core.hooksPath .githooks` (bypass only with `PREFLIGHT_SKIP=1`).
- Any change to `Dockerfile`, `compose.yml`, `scripts/deploy/**`, or `.github/workflows/ci-deploy.yml` must also pass a local `docker build` plus the read-only / persistent-volume smoke test before merging.
- Pushing to `main` is a production deploy (`DEPLOY_ENABLED=true`). Merge only after the PR check is green, then confirm the deploy job and `https://sea-trip-travel.duckdns.org/api/health` report the merged SHA.

## Deploy script constraint

`scripts/deploy/deploy.sh` is piped into `bash -s` over SSH. Any command that reads stdin can swallow the remainder of the script, so the remote shell exits 0 early and the deploy silently does nothing. Keep `</dev/null` on commands that may consume stdin and verify the health SHA after deploying.

## Push to `main` is a release

`main` is not a scratch branch: every push runs `.github/workflows/ci-deploy.yml`, and once `check` is green the `deploy` job ships that exact commit to production. Follow `docs/CI-CD.md`; the short version:

1. Branch from `origin/main`, never commit to `main` directly (revert commits are the only exception).
2. `npm run verify:preflight -- --full` must be green before the branch is pushed.
3. Open a PR and wait for the `check` job: `gh pr checks --watch`.
4. Merge only when `check` is green, then watch the run on `main`:
   `gh run list --branch main --limit 1` and `gh run watch <id>`.
5. If CI fails, fix the failing step on a branch and push again — never loosen, skip or `continue-on-error` the red step.
6. Deploy is only done when `https://sea-trip-travel.duckdns.org/api/health` reports the merged SHA with `status: "ok"` and `database: "connected"`.
7. Log the result in the PR/commit notes when the deploy needed a retry, so the next release knows why.

## Complete release ownership during an active chat

This policy applies to every agent working on Sea Trip Travel, on existing branches, newly created feature branches, and main.

- When the user asks to "push into main and deploy" (including equivalent Vietnamese wording), treat that as authorization to complete the release: commit the task's changes, push a feature/fix branch, create or update a PR, wait for CI, merge after checks pass, monitor the main workflow, and verify production. Do not ask again for these routine steps. Preserve unrelated work; if the intended release scope cannot be determined, clarify it before committing unrelated changes.
- If work starts on main, move the intended changes onto a feature branch before committing. Do not push feature commits directly to main. Fetch current remote state and follow repository branch protection and review requirements; never bypass them.
- Run `npm run verify:preflight -- --full` before pushing. Infrastructure changes also require the Docker build and read-only/persistent-volume smoke test documented in the repository. Do not use PREFLIGHT_SKIP, weaken assertions, skip checks, or add continue-on-error to make a release pass.
- Push the branch and create/update its PR into main. PR and main push events trigger `.github/workflows/ci-deploy.yml`; observe those runs instead of dispatching duplicate workflows. Wait for all required checks on the latest PR head SHA before merging.
- Correlate each Actions run with its workflow, event, branch, and exact commit SHA. Use `gh pr checks`, `gh run list --commit <sha>`, `gh run view <id> --log-failed`, and bounded polling to follow it. Never treat another commit's green run as evidence. Refresh PR state if another actor changes it.
- If PR CI fails, inspect the failing job/step logs, reproduce the failing command where possible, fix the root cause on the same branch, run full preflight, and push again. Continue until the latest head passes. Retry a run only for an evidenced transient infrastructure failure; do not repeatedly rerun deterministic failures.
- After merge, determine the resulting main commit SHA and watch its check AND deploy jobs through completion. If main CI/deploy fails, inspect logs and make a new fix branch/PR through the same gates, then follow the replacement main run. Stay within the authorized task and necessary release repairs; preserve unrelated changes.
- A skipped/disabled deploy is not success. If DEPLOY_ENABLED is not true, required credentials/tools are unavailable, a review/permission is required, or infrastructure access blocks progress, report the exact blocker and evidence and request only the missing action. Do not change secrets, bypass protections, or deploy manually to the VPS as a workaround.
- Release is complete only when the expected main run succeeds, deploy/public-release verification passes, and the public `/api/health` reports `status: "ok"`, `database: "connected"`, and the exact deployed SHA. If main advances concurrently, identify the newer release and verify its run and health rather than claiming the old SHA is current.
- Keep the chat turn active while monitoring and repairing; a successful push alone is not completion. Give concise progress updates at least every 60 seconds. Stop on success, an explicit user stop, or a concrete blocker requiring user/external action; do not claim background monitoring continues after the turn ends.
- Final report: PR link(s), Actions run link(s), deployed SHA, production health result, and any retry/fix or remaining blocker. This rule does not itself schedule an agent or start a new chat.
