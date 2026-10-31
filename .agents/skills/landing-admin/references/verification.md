# Verification by changed behavior

Use existing project checks and browser tooling. These checks supplement required repository gates; they never replace them.

## Visual and interaction checks

Inspect representative narrow mobile and desktop viewports, plus any breakpoint that changes the layout. Check long content and enlarged text for clipping. Verify keyboard navigation, visible unobscured focus, modal focus return, accessible names, readable contrast and reduced motion where affected. Review real screenshots rather than treating a successful build as visual evidence.

Exercise the actual changed flow: follow a CTA, submit valid and invalid input, open/close the menu or dialog, save and reload a record. Include failure feedback where practical without touching production data. Check browser console and hydration errors on affected pages. Mock data must be clearly identified.

## Data and security checks

For CMS changes, verify the same saved value through the public read path. Check unauthorized requests against server endpoints when authorization changes. For lead forms, verify persistence separately from delivery to external services; use local/test destinations unless a real send is authorized.

Add a focused regression test for changed branching, parsing, money, security or other nontrivial behavior. Prefer outcome assertions over matching implementation details. Pure copy or spacing edits normally need visual review rather than new unit tests.

## Completion

Run the checks required by the target project's instructions and relevant scripts. State which passed and which could not run. If release was requested, follow that project's branch/review/CI/deployment policy and verify the actual deployed revision. Do not transplant Sea Trip Travel's hostnames, secrets, commands or release authorization into a different project.
