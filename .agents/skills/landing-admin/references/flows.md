# Public and admin flows

Use this reference when the change crosses content, forms or persistence boundaries.

## Content editing

Trace the existing path: admin input -> server validation/authorization -> storage -> public query/cache -> public rendering. Reuse its schema and service rather than creating a parallel source of truth. A save must persist after refresh, and publication must appear outside the editor at the intended time. Preserve draft/published behavior if present; do not add a publishing system for a simple field edit.

Preserve stable IDs, slugs and existing links. Handle optional and empty fields deliberately. Validate uploads server-side, keep alt text available, and reserve image space to avoid layout shift. Sanitize user-authored rich text at the trust boundary. Never expose private admin fields through public payloads.

## Visitor forms

Trace CTA -> form -> server validation -> persistence -> success feedback. Notifications are a separate outcome: do not claim an email arrived merely because the record saved. Validate on the server even when the browser validates. Preserve input on recoverable errors, prevent accidental duplicate submission, and give a usable error without exposing internals. Use the project's existing spam/rate-limit approach when relevant.

## Admin screens

Check server authorization on every affected read/mutation, not just whether a button is hidden. Preserve role and ownership restrictions, CSRF/session conventions, and private cache boundaries. Do not introduce shared caches for user-specific records.

For lists, retain usable search/filter/pagination state after editing or navigation. Show empty results separately from failed loading. Avoid layout overflow with real long names, currencies and localized labels. Prefer existing table and form controls to decorative replacements.

For edit dialogs, keep visible labels, focus entry/return, keyboard operation, validation near the field, and reliable pending/saved/error states. Do not close and discard a draft on a failed request. Use the product's confirmation or undo pattern for destructive actions.

When money or dates are involved, preserve the domain's precision, currency, locale and timezone rules. Trace calculations through storage, display and exports before changing formatting or rounding.
