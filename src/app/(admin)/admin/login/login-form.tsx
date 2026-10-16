"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/server/admin/actions";
import { emptyActionState } from "@/server/admin/action-state";
import { Alert, Field, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";

/**
 * Login form. The action re-validates everything server-side; on success the
 * client navigates into the admin (a server-side `redirect()` from the guarded
 * shell is not reliable under Cache Components — see `AdminLoginCard`).
 */
export function LoginForm({ redirectTo = "/admin" }: { redirectTo?: string }) {
  const [state, action] = useActionState(loginAction, emptyActionState);
  const router = useRouter();

  useEffect(() => {
    if (state.ok === true) {
      router.replace(redirectTo);
      router.refresh();
    }
  }, [state, redirectTo, router]);

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.ok === false ? <Alert tone="error">{state.message}</Alert> : null}
      {state.ok === true ? <Alert tone="success">Đăng nhập thành công. Đang chuyển hướng…</Alert> : null}

      <Field
        label="Tên đăng nhập"
        htmlFor="username"
        required
        error={state.ok === false ? state.fieldErrors?.username?.[0] : undefined}
      >
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          autoFocus
          className={inputClass}
          placeholder="admin"
        />
      </Field>

      <Field
        label="Mật khẩu"
        htmlFor="password"
        required
        error={state.ok === false ? state.fieldErrors?.password?.[0] : undefined}
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Đang kiểm tra…">
        Đăng nhập
      </SubmitButton>
    </form>
  );
}
