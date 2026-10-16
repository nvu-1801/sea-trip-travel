/**
 * Shared state shape for `useActionState` forms.
 *
 * Lives outside the `"use server"` action module because a `"use server"` file
 * may only export async functions — exporting a plain object from it fails the
 * build with `invalid-use-server-value`.
 */

export type ActionState =
  | { ok: null }
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export const emptyActionState: ActionState = { ok: null };

export function fieldErrorsFrom(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}
