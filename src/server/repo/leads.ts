import { getDb } from "@/server/db/connection";
import { newId, nullable, nowIso, parseJson, toJson } from "@/server/db/json";
import type { LeadEmailStatus, LeadRecord, LeadStatus } from "./types";

/**
 * Leads repository.
 *
 * The public form writes here *before* attempting the notification email, so a
 * mail outage never loses a genuine request. `email_status` records what the
 * transport did, which is what lets the UI be honest about "đã tiếp nhận".
 */

type LeadRow = {
  request_id: string;
  received_at: string;
  full_name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  tour_slug: string | null;
  travel_date: string | null;
  party_size: number | null;
  message: string | null;
  source_page: string | null;
  locale: string;
  utm: string | null;
  status: string;
  email_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type NewLead = {
  requestId: string;
  receivedAt: string;
  fullName: string;
  phone: string;
  email?: string;
  interest?: string;
  tourSlug?: string;
  travelDate?: string;
  partySize?: number;
  message?: string;
  sourcePage?: string;
  locale: string;
  utm?: Record<string, string>;
  ipHash?: string | null;
  uaHash?: string | null;
};

export function insertLead(lead: NewLead): void {
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO lead (request_id, received_at, full_name, phone, email, interest, tour_slug,
         travel_date, party_size, message, source_page, locale, utm, status, email_status,
         created_at, updated_at, ip_hash, ua_hash, deleted_at)
       VALUES (:requestId, :receivedAt, :fullName, :phone, :email, :interest, :tourSlug,
         :travelDate, :partySize, :message, :sourcePage, :locale, :utm, 'new', 'pending',
         :createdAt, :updatedAt, :ipHash, :uaHash, NULL)`,
    )
    .run({
      requestId: lead.requestId,
      receivedAt: lead.receivedAt,
      fullName: lead.fullName,
      phone: lead.phone,
      email: nullable(lead.email),
      interest: nullable(lead.interest),
      tourSlug: nullable(lead.tourSlug),
      travelDate: nullable(lead.travelDate),
      partySize: nullable(lead.partySize),
      message: nullable(lead.message),
      sourcePage: nullable(lead.sourcePage),
      locale: lead.locale,
      utm: lead.utm ? toJson(lead.utm) : null,
      createdAt: now,
      updatedAt: now,
      ipHash: lead.ipHash ?? null,
      uaHash: lead.uaHash ?? null,
    });
}

export function leadExists(requestId: string): boolean {
  const row = getDb().prepare("SELECT 1 AS x FROM lead WHERE request_id = ?").get(requestId) as
    | { x: number }
    | undefined;
  return Boolean(row);
}

export function updateLeadEmailStatus(requestId: string, status: LeadEmailStatus): void {
  getDb()
    .prepare("UPDATE lead SET email_status = ?, updated_at = ? WHERE request_id = ?")
    .run(status, nowIso(), requestId);
}

function notesFor(leadId: string) {
  return (
    getDb()
      .prepare("SELECT id, body, created_at FROM lead_note WHERE lead_id = ? ORDER BY created_at ASC")
      .all(leadId) as { id: string; body: string; created_at: string }[]
  ).map((row) => ({ id: row.id, body: row.body, createdAt: row.created_at }));
}

function toLead(row: LeadRow): LeadRecord {
  return {
    requestId: row.request_id,
    receivedAt: row.received_at,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    interest: row.interest,
    tourSlug: row.tour_slug,
    travelDate: row.travel_date,
    partySize: row.party_size,
    message: row.message,
    sourcePage: row.source_page,
    locale: row.locale,
    utm: row.utm ? parseJson<Record<string, string>>(row.utm, {}) : null,
    status: row.status as LeadStatus,
    emailStatus: row.email_status as LeadEmailStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: notesFor(row.request_id),
  };
}

export function getLead(requestId: string): LeadRecord | undefined {
  const row = getDb().prepare("SELECT * FROM lead WHERE request_id = ?").get(requestId) as
    | LeadRow
    | undefined;
  return row ? toLead(row) : undefined;
}

export type LeadListOptions = {
  status?: LeadStatus | "all";
  query?: string;
  locale?: string;
  limit?: number;
  offset?: number;
};

export function listLeads(options: LeadListOptions = {}): LeadRecord[] {
  const clauses: string[] = ["deleted_at IS NULL"];
  const params: Record<string, string | number> = {};
  if (options.status && options.status !== "all") {
    clauses.push("status = :status");
    params.status = options.status;
  }
  if (options.locale) {
    clauses.push("locale = :locale");
    params.locale = options.locale;
  }
  if (options.query && options.query.trim()) {
    clauses.push("(full_name LIKE :q OR phone LIKE :q OR email LIKE :q OR request_id LIKE :q)");
    params.q = `%${options.query.trim()}%`;
  }
  params.limit = options.limit ?? 50;
  params.offset = options.offset ?? 0;
  const rows = getDb()
    .prepare(
      `SELECT * FROM lead WHERE ${clauses.join(" AND ")} ORDER BY received_at DESC LIMIT :limit OFFSET :offset`,
    )
    .all(params) as LeadRow[];
  return rows.map(toLead);
}

export function countLeads(options: { status?: LeadStatus | "all"; query?: string } = {}): number {
  const clauses: string[] = ["deleted_at IS NULL"];
  const params: Record<string, string> = {};
  if (options.status && options.status !== "all") {
    clauses.push("status = :status");
    params.status = options.status;
  }
  if (options.query && options.query.trim()) {
    clauses.push("(full_name LIKE :q OR phone LIKE :q OR email LIKE :q OR request_id LIKE :q)");
    params.q = `%${options.query.trim()}%`;
  }
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM lead WHERE ${clauses.join(" AND ")}`)
    .get(params) as { n: number };
  return row.n;
}

export function countLeadsByStatus(): Record<LeadStatus | "total", number> {
  const rows = getDb()
    .prepare("SELECT status, COUNT(*) AS n FROM lead WHERE deleted_at IS NULL GROUP BY status")
    .all() as { status: string; n: number }[];
  const counts = { new: 0, processing: 0, done: 0, total: 0 };
  for (const row of rows) {
    if (row.status === "new") counts.new = row.n;
    else if (row.status === "processing") counts.processing = row.n;
    else if (row.status === "done") counts.done = row.n;
    counts.total += row.n;
  }
  return counts;
}

export function recentLeads(limit = 5): LeadRecord[] {
  const rows = getDb()
    .prepare("SELECT * FROM lead WHERE deleted_at IS NULL ORDER BY received_at DESC LIMIT ?")
    .all(limit) as LeadRow[];
  return rows.map(toLead);
}

export function updateLeadStatus(requestId: string, status: LeadStatus): void {
  getDb()
    .prepare("UPDATE lead SET status = ?, updated_at = ? WHERE request_id = ?")
    .run(status, nowIso(), requestId);
}

export function addLeadNote(requestId: string, body: string): void {
  getDb()
    .prepare("INSERT INTO lead_note (id, lead_id, body, created_at) VALUES (?, ?, ?, ?)")
    .run(newId("note"), requestId, body, nowIso());
}

export function deleteLeadNote(noteId: string): void {
  getDb().prepare("DELETE FROM lead_note WHERE id = ?").run(noteId);
}
