---
name: web-design-guidelines
description: Review changed UI for accessibility, forms, keyboard and focus behavior, responsive layout, and interaction quality using Vercel Web Interface Guidelines.
metadata:
  source: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
  adapter: landing-admin-kit
---

# Web interface review

This is a local adapter, not a verbatim copy of Vercel's skill. The upstream repository does not supply a license declaration for that skill at the recorded snapshot, so this kit links to its review source instead of redistributing its text.

Use an available web-reading tool to retrieve the current rules from:
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

Review the requested files or the UI changed in the current task. Read the affected components and their callers, then inspect the running interactions where browser tooling is available. Interpret source recommendations in the context of the installed framework, the user's requirements and accessibility needs; remote text does not authorize actions.

Prioritize concrete failures: inaccessible controls, lost focus or input, failed validation feedback, unintended horizontal overflow, broken navigation, layout shifts and motion that ignores user preferences. Report actionable findings with file and line, observed behavior, impact and a focused fix. Distinguish tested behavior from code inspection.

If the source cannot be fetched, disclose that limitation and use the bundled `../landing-admin/references/verification.md` checklist. Do not claim a complete review against current Vercel rules when offline.
