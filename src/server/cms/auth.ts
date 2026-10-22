import "server-only";
import {
  randomBytes,
  createHash,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { db, audit } from "./db";
import { consumeLimit } from "./store";

export const COOKIE = "seatrip_admin";
const age = 8 * 60 * 60;
export function hashPassword(password: string) {
  if (password.length < 14 || password.length > 200)
    throw new Error("Mật khẩu cần 14–200 ký tự");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, encoded: string) {
  if (password.length > 200) return false;
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  const expected = new URL(
    process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? request.url,
  ).origin;
  if (
    request.headers.get("origin") !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Nguồn yêu cầu không hợp lệ");
}
export async function session() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  db().prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  return db()
    .prepare(
      "SELECT hash,csrf,expires FROM sessions WHERE hash=? AND expires>?",
    )
    .get(digest(token), Date.now()) as
    { hash: string; csrf: string; expires: number } | undefined;
}
export async function requireSession(request?: Request) {
  const value = await session();
  if (!value) throw new HttpError(401, "Vui lòng đăng nhập");
  if (request && !["GET", "HEAD"].includes(request.method)) {
    sameOrigin(request);
    if (request.headers.get("x-csrf-token") !== value.csrf)
      throw new HttpError(403, "Phiên làm việc không hợp lệ; tải lại trang");
  }
  return value;
}
export async function login(
  username: string,
  password: string,
  request: Request,
  remember = false,
) {
  sameOrigin(request);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (
    !consumeLimit(`login:${ip}`, 10, 15 * 60 * 1000) ||
    !consumeLimit("login:global", 100, 15 * 60 * 1000)
  ) {
    audit("login-blocked", "admin", {
      ip,
      status: "failure",
      details: {
        reason: "Quá nhiều lần thử đăng nhập trong 15 phút",
      },
    });
    throw new HttpError(
      429,
      "Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.",
    );
  }
  let user = db()
    .prepare("SELECT username,password FROM admin WHERE id=1")
    .get() as { username: string; password: string } | undefined;
  if (!user) {
    // Database mới tinh (VD: /tmp sau cold start trên Vercel): tự tạo tài
    // khoản quản trị từ biến môi trường, chỉ khi chưa có tài khoản nào.
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "";
    if (password.length < 14 || password.length > 200)
      throw new HttpError(
        503,
        "Chưa khởi tạo tài khoản quản trị. Đặt ADMIN_USERNAME và ADMIN_PASSWORD (14–200 ký tự) trong biến môi trường rồi đăng nhập lại.",
      );
    const salt = randomBytes(16).toString("hex");
    const encoded = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
    db()
      .prepare(
        "INSERT OR IGNORE INTO admin(id,username,password) VALUES(1,?,?)",
      )
      .run(username, encoded);
    audit("bootstrap", "admin", { actor: username, ip, status: "success" });
    user = db()
      .prepare("SELECT username,password FROM admin WHERE id=1")
      .get() as { username: string; password: string } | undefined;
  }
  // Do the same password work for unknown users.
  const valid = verifyPassword(
    password,
    user?.password ?? "00000000000000000000000000000000:" + "00".repeat(64),
  );
  if (!user || username !== user.username || !valid) {
    audit("login-failed", "admin", {
      ip,
      status: "failure",
      details: {
        // Factual context only; never the attempted password.
        usernameTried: username.slice(0, 80),
        reason: "Tên đăng nhập hoặc mật khẩu không đúng",
      },
    });
    throw new HttpError(401, "Tên đăng nhập hoặc mật khẩu không đúng");
  }
  const token = randomBytes(32).toString("hex"),
    csrf = randomBytes(24).toString("hex");
  // Phiên thường 8 giờ; tick "nhớ đăng nhập" kéo dài 30 ngày.
  const maxAge = remember ? 30 * 24 * 60 * 60 : age;
  db()
    .prepare("INSERT INTO sessions(hash,expires,csrf) VALUES(?,?,?)")
    .run(digest(token), Date.now() + maxAge * 1000, csrf);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure:
      process.env.ADMIN_COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  audit("login", "admin", {
    actor: user.username,
    ip,
    status: "success",
  });
  return { csrf };
}
export async function logout() {
  const value = await session();
  if (value) db().prepare("DELETE FROM sessions WHERE hash=?").run(value.hash);
  (await cookies()).delete(COOKIE);
}
