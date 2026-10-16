/**
 * The session cookie name, in a module with no runtime dependencies.
 *
 * `proxy.ts` (middleware) needs this value, and middleware may run on the Edge
 * runtime — importing `tokens.ts` there would pull in `node:crypto`. Keeping the
 * name in its own module keeps the middleware import graph safe.
 */
export const SESSION_COOKIE = "sea_trip_admin";
