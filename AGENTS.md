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

