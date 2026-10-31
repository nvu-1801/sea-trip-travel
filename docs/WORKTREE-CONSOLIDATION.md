# Worktree consolidation — 2026-10-31

Baseline: `origin/main` at `805f6f36b595683a53d088ef2dff31188a505f72`.
Release branch: `chore/consolidate-release` in a separate clean checkout.
All ten original worktrees were checkpointed before integration: separate
staged/unstaged binary patches, untracked files with SHA-256 verification and
manifests containing HEAD/branch/status. Checkpoints are local, outside the
repository. Ignored runtime data and environment files stay in their original
directories until cleanup review; they are never committed.

## Decisions

| Worktree | Decision and evidence |
| --- | --- |
| `sea-trip-travel` | Integrate pending quality tooling, documentation, licensed project skills/portable installer and release-notice fixes. Exclude temporary notice/sidebar artifacts. Keep this directory as the primary checkout. |
| `sea-trip-code-quality` | Integrate AES-GCM tag length enforcement in lead and backup decryption, lead regression test, Nodemailer 10.3.1/lockfile, quality/security tools and CI security gate. Preserve the newer release pipeline rather than copying its old workflow. Historical verification results stay in the local checkpoint. |
| `sea-trip-admin-release` | Seven uncommitted featured-tour changes are superseded by main's `src/lib/featured.ts`, per-category configurations, current `home-featured-editor.tsx`, public section and featured tests. Keep the newer implementation. |
| `sea-trip-customer-stories` | Twenty-two staged files are the original implementation; main already contains `d8bba73` (#18), `210df3c` and `6df1edf`. Keep the newer editor, video carousel and tests. |
| `sea-trip-customer-stories-polish` | Clean; HEAD `210df3c` is an ancestor of main. |
| `sea-trip-preview` | Clean; HEAD `6131a1d` is an ancestor of main through #21. |
| `sea-trip-quick-search` | Old commit `f99d639` has a different patch identity, but API, palette, tests and verification were integrated through `844b358` (#7). Local AGENTS change is covered by the integrated workspace guidance. |
| `sea-trip-tour-finance` | Clean; HEAD `311b5d4` is an ancestor of main. |
| `sea-trip-travel-integration` | Review all six non-merge commits below; retain main's current implementations. Do not merge the old WIP snapshot over main. |
| `sea-trip-travel-seo` | SEO commit is already implemented on main; recover only missing price safety rules/tests from `2be43bd`. Dashboard already confirms discard and guards document navigation; current editor supports contact/package pricing. Keep the current UI. |

## Old integration commits

| Commit | Current equivalent / decision |
| --- | --- |
| `6d1cfae` | SEO metadata/content, robots/sitemap, CMS defaults, `apply-seo-content.ts`, SEO tests and `verify:seo` already exist. |
| `e62c5cb` | WIP snapshot combines quick search, header search, admin/navigation/editor work and visual updates. Main contains these features and later revisions. Do not replace them with the snapshot. |
| `e9f53e8` | `backfillSettingsSeo()` is present and called by `seed()`; home SEO title/defaults and verification exist. |
| `a819cfb` | Main dashboard has the editorial `adm-masthead` and current title/chapter controls. |
| `d11088e` | Main's newer reveal preserves control dimensions, handles reduced-motion changes, print and manual pause, and uses one observer per group. Retain current fade/sequence behavior instead of restoring the old transform-only visual choice. |
| `8a7295d` | `verify-cms.mjs` already retries an early pre-hydration login click once and still asserts successful navigation. |

The two uncommitted integration UI changes (`data-reveal` attributes and
`stt-mask-reveal`) belong to the old scroll-driven motion approach. Main has
since adopted explicit viewport entrances and grouped heading sequencing;
reapplying old selectors would combine two animation systems. Preserve the
current implementation and checkpoint the old patch.

## Release and cleanup conditions

Full preflight, security scans, Docker build and read-only/persistent-volume
smoke tests must pass before push. PR checks must pass on the latest head.
After merge, verify the exact main workflow, deploy/public verification and
public health SHA before removing any old worktree.

Cleanup uses `git worktree remove` without force. A dirty worktree first needs
its checkpoint verified and all tracked/untracked work accounted for. Preserve
ignored runtime/environment data before removal; keep directories with active
processes or unresolved work. Keep local branches and checkpoints for recovery.
Never remove unrelated Docker containers, volumes, repositories or processes.

## Git-hook fixture isolation repair

An initial push ran the new release-history fixture through the pre-push hook.
Inherited `GIT_*` environment variables directed fixture Git commands into the
real repository, creating three empty fixture commits and setting `core.bare`.
No source files were lost and no merge or deploy occurred. PR #31 was closed.

The repository configuration was restored and the release branch was recreated
from the verified `f826603` source commit, excluding those fixture commits.
Fixtures now remove inherited Git context before invoking Git. A regression test
injects hook context pointing at a disposable surrounding repository and asserts
its HEAD, branch, configuration and working tree remain unchanged. Original
worktree checkpoints are revalidated before cleanup. No force push or main
history rewrite is used.
