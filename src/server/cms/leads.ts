import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { db } from "./db";
import { LEAD_TRASH_RETENTION_DAYS } from "@/lib/lead-trash";
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
type LeadRow = {
  id: string;
  status: string;
  note: string;
  mail_status: string;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
  data: string;
};

function decryptRows(rows: LeadRow[]) {
  return rows.map((row) => ({
    ...row,
    data: decrypt(row.data) as Record<string, unknown>,
    note: row.note ? String(decrypt(row.note)) : "",
  }));
}

/**
 * Permanently removes leads whose trash retention window has elapsed.
 * Runs lazily whenever the trash is read, so no cron job is required.
 */
export function purgeExpiredLeads(): number {
  const cutoff = new Date(
    Date.now() - LEAD_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  return Number(
    db()
      .prepare("DELETE FROM leads WHERE deleted_at IS NOT NULL AND deleted_at < ?")
      .run(cutoff).changes,
  );
}

export function listLeads() {
  purgeExpiredLeads();
  return decryptRows(
    db()
      .prepare(
        "SELECT * FROM leads WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 500",
      )
      .all() as LeadRow[],
  );
}

/** Leads moved to the trash, newest deletion first. */
export function listTrashedLeads() {
  purgeExpiredLeads();
  return decryptRows(
    db()
      .prepare(
        "SELECT * FROM leads WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 500",
      )
      .all() as LeadRow[],
  );
}

export function trashedLeadCount(): number {
  purgeExpiredLeads();
  return (
    db()
      .prepare("SELECT COUNT(*) AS count FROM leads WHERE deleted_at IS NOT NULL")
      .get() as { count: number }
  ).count;
}

/** Move a live lead to the trash. Idempotency is expressed as `false`. */
export function softDeleteLead(id: string): boolean {
  return (
    db()
      .prepare(
        "UPDATE leads SET deleted_at=? WHERE id=? AND deleted_at IS NULL",
      )
      .run(new Date().toISOString(), id).changes > 0
  );
}

export function restoreLead(id: string): boolean {
  return (
    db()
      .prepare(
        "UPDATE leads SET deleted_at=NULL WHERE id=? AND deleted_at IS NOT NULL",
      )
      .run(id).changes > 0
  );
}

/** Only a lead already in the trash can be deleted permanently. */
export function purgeLead(id: string): boolean {
  return (
    db()
      .prepare("DELETE FROM leads WHERE id=? AND deleted_at IS NOT NULL")
      .run(id).changes > 0
  );
}

export function markMail(id: string, status: string) {
  db().prepare("UPDATE leads SET mail_status=? WHERE id=?").run(status, id);
}

export function unreadLeadCount(): number {
  return (
    db()
      .prepare(
        "SELECT COUNT(*) AS count FROM leads WHERE read_at IS NULL AND deleted_at IS NULL",
      )
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
