"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Dedicated Studio sign-in screen.
 *
 * It lives at `/admin/login`, outside the authenticated route group, so a
 * logout is an obvious destination instead of the dashboard silently swapping
 * itself for a login form.
 */
export function AdminLogin({
  next = "/admin",
  loggedOut = false,
  expired = false,
}: {
  next?: string;
  loggedOut?: boolean;
  expired?: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    loggedOut
      ? "Bạn đã đăng xuất khỏi Studio. Hẹn gặp lại."
      : expired
        ? "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."
        : "",
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password, remember }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Tên đăng nhập hoặc mật khẩu không đúng");
      setPassword("");
      setShowPassword(false);
      const target = next.startsWith("/admin") ? next : "/admin";
      window.location.replace(target);
    } catch (error) {
      setNotice(
        error instanceof TypeError
          ? "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại."
          : error instanceof Error
            ? error.message
            : "Có lỗi xảy ra",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="adm-login">
      <section>
        <Link href="/" className="adm-brand">
          SEA TRIP <small>STUDIO</small>
        </Link>
        <span className="adm-eyebrow">Không gian dành cho chủ quản trị</span>
        <h1>
          Chào mừng
          <br />
          bạn trở lại.
        </h1>
        <p>
          Chăm chút từng hành trình.
          <br />
          Kết nối thêm nhiều trải nghiệm.
        </p>
        <form onSubmit={submit} aria-busy={busy}>
          <label htmlFor="adm-username">Tên đăng nhập</label>
          <input
            id="adm-username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label htmlFor="adm-password">Mật khẩu</label>
          <div className="adm-password-wrap">
            <input
              id="adm-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="adm-password-toggle"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <label className="adm-remember" htmlFor="adm-remember">
            <input
              id="adm-remember"
              name="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>
              Nhớ đăng nhập trong 30 ngày
              <small>Chỉ dùng trên máy cá nhân, không dùng máy lạ.</small>
            </span>
          </label>
          <button
            className="adm-primary"
            type="submit"
            disabled={busy || !username || !password}
          >
            {busy ? "Đang đăng nhập…" : "Vào SEA TRIP Studio →"}
          </button>
        </form>
        {notice && (
          <p className="adm-login-error" role="alert">
            {notice}
          </p>
        )}
        <p className="adm-login-back">
          <Link href="/">← Về website</Link>
        </p>
      </section>
      <div className="adm-login-art" aria-hidden="true">
        <div className="adm-login-art-photo" />
        <div className="adm-login-art-shade" />
        <div className="adm-login-art-orb adm-login-art-orb-a" />
        <div className="adm-login-art-orb adm-login-art-orb-b" />
        <div className="adm-login-art-card">
          <p className="adm-login-art-eyebrow">SEA TRIP · Studio</p>
          <span className="adm-login-art-quote">
            Những chuyến đi
            <br />
            <em>bắt đầu từ đây.</em>
          </span>
          <p className="adm-login-art-caption">
            Chăm chút từng hành trình, từ Kỳ Co đến Phú Yên.
          </p>
          <p className="adm-login-art-chips">
            <span>Quy Nhơn – Phú Yên</span>
            <span>Tour trong nước</span>
          </p>
        </div>
      </div>
    </main>
  );
}
