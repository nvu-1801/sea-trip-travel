import "server-only";

import { randomUUID } from "node:crypto";
import { siteConfig } from "@/config/runtime-site";
import {
  calculateInvoice,
  invoiceNumberFromSequence,
  type InvoiceDocument,
  type InvoiceSeller,
  type InvoiceSummary,
  invoiceSummaryOf,
} from "@/domain/invoice";
import {
  invoiceInputSchema,
  type InvoiceCreateInput,
  type InvoiceUpdateInput,
} from "@/domain/invoice-schema";
import { db, transaction } from "./db";
import { decrypt, encrypt } from "./leads";

/**
 * Invoice storage.
 *
 * The full document (buyer details, line prices, notes, bank instructions) is
 * AES-GCM encrypted like the lead payload. Only IDs, the generated number,
 * document status and timestamps stay in plain columns. An issued invoice keeps
 * a second encrypted snapshot, and every PDF is rendered from that snapshot so
 * later edits to a tour, a lead or the site settings cannot rewrite history.
 *
 * There is one administrator account, and every invoice route requires a valid
 * admin session. Invoice IDs are random UUIDs, so an unauthenticated caller
 * cannot enumerate documents by guessing sequential IDs.
 */

type InvoiceRow = {
  seq: number;
  id: string;
  number: string;
  lead_id: string | null;
  status: "draft" | "issued";
  payment_status: string;
  data: string;
  snapshot: string | null;
  revision: number;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  request_token: string;
};

type LeadRow = {
  data: string;
  deleted_at: string | null;
};

function sellerFromConfig(): InvoiceSeller {
  return {
    name: siteConfig.name,
    address: siteConfig.contact.address,
    phone: siteConfig.contact.hotline,
    email: siteConfig.contact.email,
  };
}

function sellerOf(value: unknown): InvoiceSeller {
  if (!value || typeof value !== "object") return sellerFromConfig();
  const raw = value as Record<string, unknown>;
  return {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : siteConfig.name,
    address:
      typeof raw.address === "string" ? raw.address : siteConfig.contact.address,
    phone:
      typeof raw.phone === "string" ? raw.phone : siteConfig.contact.hotline,
    email:
      typeof raw.email === "string" ? raw.email : siteConfig.contact.email,
  };
}

function pickInput(raw: Record<string, unknown>) {
  return invoiceInputSchema.parse({
    issueDate: raw.issueDate,
    dueDate: raw.dueDate,
    buyer: raw.buyer,
    tourTitle: raw.tourTitle,
    travelDate: raw.travelDate,
    partySize: raw.partySize,
    lines: raw.lines,
    discount: raw.discount,
    taxRate: raw.taxRate,
    fee: raw.fee,
    paid: raw.paid,
    customerNote: raw.customerNote,
    bankTransfer: raw.bankTransfer,
  });
}

/**
 * Rebuild the trusted document from the encrypted payload.
 *
 * Derived amounts are recalculated rather than read from the row. A document
 * whose stored totals no longer match its inputs is rejected, so a corrupted
 * row can never produce a PDF that disagrees with the invoice staff approved.
 */
function rowToDocument(row: InvoiceRow, preferSnapshot = false): InvoiceDocument {
  const source =
    preferSnapshot && row.snapshot
      ? row.snapshot
      : row.snapshot && row.status === "issued"
        ? row.snapshot
        : row.data;
  if (row.status === "issued" && !row.snapshot) {
    throw new Error("Hóa đơn đã phát hành thiếu bản chụp dữ liệu");
  }
  const raw = decrypt(source) as Record<string, unknown>;
  const input = pickInput(raw);
  const calculation = calculateInvoice(input);

  for (const [key, value] of Object.entries({
    subtotal: calculation.subtotal,
    taxAmount: calculation.taxAmount,
    total: calculation.total,
    remaining: calculation.remaining,
  })) {
    const stored = raw[key];
    if (typeof stored === "number" && stored !== value) {
      throw new Error(`Dữ liệu hóa đơn không nhất quán (${key})`);
    }
  }

  return {
    ...input,
    ...calculation,
    dueDate: input.dueDate ?? "",
    travelDate: input.travelDate ?? "",
    id: row.id,
    number: row.number,
    leadId:
      typeof raw.leadId === "string" ? raw.leadId : (row.lead_id ?? ""),
    leadRequestId:
      typeof raw.leadRequestId === "string" ? raw.leadRequestId : "",
    status: row.status,
    currency: "VND",
    seller: sellerOf(raw.seller),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    issuedAt: row.issued_at,
    revision: row.revision,
  };
}

function invoiceRowByToken(token: string): InvoiceRow | undefined {
  return db()
    .prepare("SELECT * FROM invoices WHERE request_token=?")
    .get(token) as InvoiceRow | undefined;
}

function invoiceRowById(id: string): InvoiceRow | undefined {
  return db()
    .prepare("SELECT * FROM invoices WHERE id=?")
    .get(id) as InvoiceRow | undefined;
}

export function listInvoices(leadId?: string): InvoiceSummary[] {
  const rows = (
    leadId
      ? db()
          .prepare(
            "SELECT * FROM invoices WHERE lead_id=? ORDER BY created_at DESC LIMIT 500",
          )
          .all(leadId)
      : db()
          .prepare("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 500")
          .all()
  ) as InvoiceRow[];

  const summaries: InvoiceSummary[] = [];
  for (const row of rows) {
    try {
      summaries.push(invoiceSummaryOf(rowToDocument(row)));
    } catch (error) {
      // One damaged row must not hide every other invoice.
      console.error(
        `[invoice] cannot read ${row.id}:`,
        error instanceof Error ? error.message : "unknown",
      );
    }
  }
  return summaries;
}

export function getInvoice(id: string): InvoiceDocument | null {
  const row = invoiceRowById(id);
  return row ? rowToDocument(row) : null;
}

export type CreateInvoiceResult = {
  invoice: InvoiceDocument;
  created: boolean;
};

export function createInvoice(input: InvoiceCreateInput): CreateInvoiceResult {
  const lead = db()
    .prepare("SELECT data,deleted_at FROM leads WHERE id=?")
    .get(input.leadId) as LeadRow | undefined;
  if (!lead || lead.deleted_at) {
    throw new Error("Không tìm thấy yêu cầu tư vấn để lập hóa đơn");
  }
  const leadPayload = decrypt(lead.data) as Record<string, unknown>;
  const leadRequestId =
    typeof leadPayload.requestId === "string" ? leadPayload.requestId : "";
  const now = new Date().toISOString();
  const id = randomUUID();
  const seller = sellerFromConfig();
  const calculation = calculateInvoice(input);

  return transaction(() => {
    const existing = invoiceRowByToken(input.createToken);
    if (existing) {
      return { invoice: rowToDocument(existing), created: false };
    }

    const temporaryNumber = `TMP-${id}`;
    const inserted = db()
      .prepare(
        `INSERT INTO invoices
          (id, number, lead_id, status, payment_status, data, snapshot, revision, issued_at, created_at, updated_at, request_token)
         VALUES (?, ?, ?, 'draft', ?, ?, NULL, 1, NULL, ?, ?, ?)`,
      )
      .run(
        id,
        temporaryNumber,
        input.leadId,
        calculation.paymentStatus,
        "",
        now,
        now,
        input.createToken,
      );
    const sequence = Number(inserted.lastInsertRowid);
    const number = invoiceNumberFromSequence(sequence, input.issueDate);

    const document: InvoiceDocument = {
      ...input,
      ...calculation,
      dueDate: input.dueDate ?? "",
      travelDate: input.travelDate ?? "",
      id,
      number,
      leadId: input.leadId,
      leadRequestId,
      status: "draft",
      currency: "VND",
      seller,
      createdAt: now,
      updatedAt: now,
      issuedAt: null,
      revision: 1,
    };
    db()
      .prepare("UPDATE invoices SET number=?, data=? WHERE id=?")
      .run(number, encrypt(document), id);

    return { invoice: document, created: true };
  });
}

export function updateInvoice(
  id: string,
  input: InvoiceUpdateInput,
): InvoiceDocument {
  return transaction(() => {
    const row = invoiceRowById(id);
    if (!row) throw new Error("Không tìm thấy hóa đơn");
    if (row.status !== "draft") {
      throw new Error(
        "Hóa đơn đã phát hành nên không thể sửa. Hãy lập hóa đơn mới nếu cần điều chỉnh.",
      );
    }
    if (input.revision !== row.revision) {
      throw new Error("Hóa đơn đã thay đổi ở nơi khác; tải lại trước khi lưu");
    }
    const current = rowToDocument(row);
    const calculation = calculateInvoice(input);
    const updated: InvoiceDocument = {
      ...input,
      ...calculation,
      dueDate: input.dueDate ?? "",
      travelDate: input.travelDate ?? "",
      id: current.id,
      number: current.number,
      leadId: current.leadId,
      leadRequestId: current.leadRequestId,
      status: "draft",
      currency: "VND",
      seller: current.seller,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      issuedAt: null,
      revision: row.revision + 1,
    };
    db()
      .prepare(
        "UPDATE invoices SET data=?, payment_status=?, revision=?, updated_at=? WHERE id=?",
      )
      .run(
        encrypt(updated),
        calculation.paymentStatus,
        updated.revision,
        updated.updatedAt,
        id,
      );
    return updated;
  });
}

export function issueInvoice(id: string, revision: number): InvoiceDocument {
  return transaction(() => {
    const row = invoiceRowById(id);
    if (!row) throw new Error("Không tìm thấy hóa đơn");
    if (row.status === "issued") return rowToDocument(row);
    if (revision !== row.revision) {
      throw new Error("Hóa đơn đã thay đổi ở nơi khác; tải lại trước khi phát hành");
    }
    const current = rowToDocument(row);
    if (current.total <= 0) {
      throw new Error("Nhập đơn giá và kiểm tra tổng tiền trước khi phát hành");
    }
    const now = new Date().toISOString();
    const issued: InvoiceDocument = {
      ...current,
      status: "issued",
      issuedAt: now,
      updatedAt: now,
      revision: row.revision + 1,
    };
    const encrypted = encrypt(issued);
    db()
      .prepare(
        "UPDATE invoices SET status='issued', payment_status=?, data=?, snapshot=?, revision=?, issued_at=?, updated_at=? WHERE id=?",
      )
      .run(
        issued.paymentStatus,
        encrypted,
        encrypted,
        issued.revision,
        now,
        now,
        id,
      );
    return issued;
  });
}

/** PDFs are rendered from the issued snapshot, or from the saved draft. */
export function getInvoiceForPdf(id: string): {
  invoice: InvoiceDocument;
  draft: boolean;
} | null {
  const row = invoiceRowById(id);
  if (!row) return null;
  return {
    invoice: rowToDocument(row, true),
    draft: row.status === "draft",
  };
}
