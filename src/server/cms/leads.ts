import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { db } from "./db";
function key() {
  const value = process.env.LEAD_ENCRYPTION_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new Error("LEAD_ENCRYPTION_KEY phải có 64 ký tự hex");
  return Buffer.from(value, "hex");
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    body.toString("hex"),
  ].join(":");
}
export function decrypt(value: string) {
  const [iv, tag, body] = value.split(":");
  const cipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex"));
  cipher.setAuthTag(Buffer.from(tag, "hex"));
  return JSON.parse(
    Buffer.concat([
      cipher.update(Buffer.from(body, "hex")),
      cipher.final(),
    ]).toString(),
  );
}
export function persistLead(id: string, value: unknown) {
  db()
    .prepare("INSERT OR IGNORE INTO leads(id,data,created_at) VALUES(?,?,?)")
    .run(id, encrypt(value), new Date().toISOString());
}
export function listLeads() {
  return (
    db()
      .prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 500")
      .all() as { data: string; note: string }[]
  ).map((row) => ({
    ...row,
    data: decrypt(row.data),
    note: row.note ? String(decrypt(row.note)) : "",
  }));
}
export function markMail(id: string, status: string) {
  db().prepare("UPDATE leads SET mail_status=? WHERE id=?").run(status, id);
}
export function unreadLeadCount(): number {
  return (
    db()
      .prepare("SELECT COUNT(*) AS count FROM leads WHERE read_at IS NULL")
      .get() as { count: number }
  ).count;
}
export function markLeadRead(id: string): boolean {
  return (
    db()
      .prepare("UPDATE leads SET read_at=COALESCE(read_at, ?) WHERE id=?")
      .run(new Date().toISOString(), id).changes > 0
  );
}
