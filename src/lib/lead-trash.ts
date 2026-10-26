/**
 * How long a deleted lead stays in the admin trash before the server purges it.
 * Shared by the API (purge window) and the admin UI (countdown) so both always
 * agree on the deadline shown to the owner.
 */
export const LEAD_TRASH_RETENTION_DAYS = 60;
