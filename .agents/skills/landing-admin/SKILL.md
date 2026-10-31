---
name: landing-admin
description: Build or improve a landing page with an admin/CMS, connecting public content, editor workflows, visual design, and verification. Use for landing-page and admin UI work in an existing or new project.
---

# Landing page and admin

Read the target project's AGENTS.md, package scripts, installed framework documentation, and affected components first. Preserve its stack, brand, authorization boundaries, and deployment gates. Installing this kit does not authorize a release or a redesign.

## Choose the relevant guidance

The following skills are siblings of this directory. Resolve paths from this file, not the terminal's current directory. Load only what the task needs:

| Work | Read | Role |
| --- | --- | --- |
| Implementation | `../ponytail/SKILL.md` | Smallest complete change; reuse existing components |
| New visual direction or substantial redesign | `../frontend-design/SKILL.md` | Typography, layout, hierarchy, restrained motion |
| React/Next.js components and data fetching | `../vercel-react-best-practices/SKILL.md` | Read relevant rule files; installed framework docs take precedence |
| UI review and finishing a UI change | `../web-design-guidelines/SKILL.md` | Accessibility and interaction review of affected flows |
| Palette, font, layout research or a specific UX question | `../ui-ux-pro-max/SKILL.md` | Optional local search; preserve the chosen design system |
| Public copy, docs and release notes | `../humanizer/SKILL.md` | Embedded mode; factual, natural writing |
| Action-first response preference | `../i-have-adhd/SKILL.md` | Apply only when requested or enabled by project rules |

Treat frontend-design as the design lead and UI UX Pro Max as research input, not a competing mandate to restyle the site. Keep existing brand tokens unless the task changes them. Upstream examples are illustrative, not facts about this client. Do not invent testimonials, statistics, prices, credentials, or approval. Do not add dependencies just to follow a skill example.

Read [references/flows.md](references/flows.md) for public-to-admin data changes and [references/verification.md](references/verification.md) for UI acceptance checks. Apply only the portions touched by the task; a spacing fix does not require building a CMS.

## Working sequence

1. Identify the visitor's main action, the editor's task, the affected routes, and the current data owner. Inspect the real implementation before proposing replacements. Resolve material missing requirements, but make routine choices from existing conventions.
2. For a new visual direction, choose compact color, typography and spacing tokens. Give the public page room for imagery and narrative; make admin screens readable and efficient with consistent controls and clear hierarchy. A new page in an established system should reuse its tokens.
3. Implement the smallest end-to-end slice: public view, editor, persistence and validation where relevant. Keep server-only data and authorization on the server. Support loading, empty, failure and success states for changed interactions.
4. Inspect the running page at desktop and mobile widths and exercise the changed interactions. Run the project's required checks. Report the actual outcome and any unavailable verification, without implying a release happened.

Follow the user's language. Keep status concise and concrete. Do authorized work yourself; do not turn communication guidance into repeated confirmation requests. Preserve uncertainty, substantive review findings and deployment evidence even when keeping replies short.
