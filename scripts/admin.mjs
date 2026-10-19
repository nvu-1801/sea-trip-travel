import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
const file = process.env.CMS_DB_PATH ?? path.resolve("data/seatrip.sqlite");
mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(file);
db.exec(
  "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS admin(id INTEGER PRIMARY KEY CHECK(id=1),username TEXT NOT NULL,password TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,expires INTEGER NOT NULL,csrf TEXT NOT NULL)",
);
const command = process.argv[2];
if (command === "bootstrap" || command === "reset") {
  const password = process.env.ADMIN_PASSWORD ?? "",
    username = process.env.ADMIN_USERNAME ?? "admin";
  if (password.length < 14 || password.length > 200)
    throw new Error("Đặt ADMIN_PASSWORD 14–200 ký tự trong môi trường");
  if (command === "bootstrap" && db.prepare("SELECT id FROM admin").get())
    throw new Error("Admin đã tồn tại. Dùng reset để đổi mật khẩu.");
  const salt = randomBytes(16).toString("hex"),
    encoded = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "INSERT INTO admin(id,username,password) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,password=excluded.password",
    ).run(username, encoded);
    db.exec("DELETE FROM sessions; COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  console.log("Admin đã cấu hình; phiên cũ đã thu hồi.");
} else if (command === "backup") {
  const backup = process.env.BACKUP_PATH;
  if (!backup) throw new Error("Thiếu BACKUP_PATH");
  mkdirSync(path.dirname(backup), { recursive: true, mode: 0o700 });
  db.prepare("VACUUM INTO ?").run(backup);
  console.log("Backup SQLite hoàn tất.");
} else if (command === "verify") {
  const result = db.prepare("PRAGMA integrity_check").get();
  if (result.integrity_check !== "ok")
    throw new Error("SQLite integrity check failed");
  console.log("SQLite integrity: ok");
} else throw new Error("Dùng bootstrap | reset | backup | verify");
db.close();
