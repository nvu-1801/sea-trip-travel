"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/server/admin/actions";
import { emptyActionState } from "@/server/admin/action-state";
import { Alert, Field, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, emptyActionState);
  const error = (field: string) => (state.ok === false ? state.fieldErrors?.[field]?.[0] : undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}
      {state.ok === false ? <Alert tone="error">{state.message}</Alert> : null}

      <Field label="Mật khẩu hiện tại" required error={error("currentPassword")}>
        <input name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <Field label="Mật khẩu mới" required hint="Ít nhất 10 ký tự, có cả chữ và số." error={error("nextPassword")}>
        <input name="nextPassword" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <Field label="Nhập lại mật khẩu mới" required error={error("confirmPassword")}>
        <input name="confirmPassword" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>

      <SubmitButton pendingLabel="Đang cập nhật…">Đổi mật khẩu</SubmitButton>
      <p className="text-xs leading-relaxed text-foreground-subtle">
        Sau khi đổi mật khẩu, tất cả phiên đăng nhập khác sẽ bị thu hồi. Phiên hiện tại vẫn tiếp tục hoạt động.
      </p>
    </form>
  );
}
