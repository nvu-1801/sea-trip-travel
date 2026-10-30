import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/server/cms/db";
import { persistLead } from "@/server/cms/leads";
import {
  createInvoice,
  getInvoice,
  getInvoiceForPdf,
  issueInvoice,
  listInvoices,
  updateInvoice,
} from "@/server/cms/invoices";
import { buildInvoicePdf } from "@/server/invoices/pdf";

const directory = mkdtempSync(path.join(tmpdir(), "seatrip-invoice-"));
process.env.CMS_DB_PATH = path.join(directory, "test.sqlite");
process.env.CMS_ENABLED = "1";
process.env.LEAD_ENCRYPTION_KEY = randomBytes(32).toString("hex");

persistLead("lead-invoice-test", {
  requestId: "STT-2026-LEAD",
  receivedAt: "2026-10-30T02:00:00.000Z",
  fullName: "Nguyễn Văn A",
  phone: "0987654321",
  email: "khach@example.com",
  interest: "Quy Nhơn – Kỳ Co",
  locale: "vi",
});

const baseInput = {
  issueDate: "2026-10-30",
  dueDate: "2026-11-05",
  buyer: {
    name: "Nguyễn Văn A",
    company: "Công ty Thử Nghiệm",
    address: "42-44 Chế Lan Viên, Quy Nhơn",
    taxId: "0312345678",
    phone: "0987654321",
    email: "khach@example.com",
  },
  tourTitle: "Quy Nhơn – Kỳ Co – Eo Gió 1 ngày",
  travelDate: "2026-11-20",
  partySize: 2,
  lines: [
    {
      description: "Tour Quy Nhơn – Kỳ Co – Eo Gió 1 ngày",
      unit: "khách",
      quantity: 2,
      unitPrice: 500_000,
    },
    {
      description: "Phụ thu phòng đơn",
      unit: "phòng",
      quantity: 1,
      unitPrice: 250_000,
    },
  ],
  discount: 50_000,
  taxRate: 8,
  fee: 20_000,
  paid: 300_000,
  customerNote: "Vui lòng xác nhận trước 3 ngày.",
  bankTransfer: "Ngân hàng Thử Nghiệm\nSố tài khoản: 0000000000\nChủ tài khoản: SEA TRIP",
};

function create(overrides: Record<string, unknown> = {}, token = randomUUID()) {
  return createInvoice({
    ...baseInput,
    ...overrides,
    leadId: "lead-invoice-test",
    createToken: token,
  });
}

after(() => {
  try {
    db().close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

let firstInvoiceId = "";

describe("invoice storage", () => {
  it("creates a draft with a generated number and recalculated totals", () => {
    const result = create();
    firstInvoiceId = result.invoice.id;
    assert.equal(result.created, true);
    assert.equal(result.invoice.status, "draft");
    assert.equal(result.invoice.number, "STT-2026-000001");
    assert.equal(result.invoice.leadRequestId, "STT-2026-LEAD");
    assert.equal(result.invoice.subtotal, 1_250_000);
    assert.equal(result.invoice.taxAmount, 96_000);
    assert.equal(result.invoice.total, 1_316_000);
    assert.equal(result.invoice.remaining, 1_016_000);
    assert.equal(result.invoice.paymentStatus, "partial");
    assert.equal(result.invoice.seller.name, "SEA TRIP TRAVEL");
    assert.equal(result.invoice.seller.email, "seatriptravel@gmail.com");
  });

  it("stores PII only as encrypted payload", () => {
    const row = db()
      .prepare("SELECT data,snapshot FROM invoices WHERE id=?")
      .get(firstInvoiceId) as { data: string; snapshot: string | null };
    assert.ok(!row.data.includes("Nguyễn"));
    assert.ok(!row.data.includes("khach@example.com"));
    assert.ok(!row.data.includes("0312345678"));
    assert.equal(row.data.split(":").length, 3, "iv:tag:ciphertext");
    assert.equal(row.snapshot, null);
  });

  it("returns the same draft for a repeated create token", () => {
    const token = randomUUID();
    const first = create({}, token);
    const second = create({}, token);
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(second.invoice.id, first.invoice.id);
    assert.equal(
      listInvoices("lead-invoice-test").filter(
        (item) => item.id === first.invoice.id,
      ).length,
      1,
    );
  });

  it("updates a draft with optimistic locking", () => {
    const result = create({ paid: 0 });
    const updated = updateInvoice(result.invoice.id, {
      ...baseInput,
      paid: 1_316_000,
      revision: result.invoice.revision,
    });
    assert.equal(updated.revision, result.invoice.revision + 1);
    assert.equal(updated.paymentStatus, "paid");
    assert.equal(updated.remaining, 0);

    assert.throws(
      () =>
        updateInvoice(result.invoice.id, {
          ...baseInput,
          paid: 0,
          revision: result.invoice.revision,
        }),
      /thay đổi ở nơi khác/,
    );
  });

  it("issues a snapshot and refuses later edits", () => {
    const result = create();
    const issued = issueInvoice(result.invoice.id, result.invoice.revision);
    assert.equal(issued.status, "issued");
    assert.ok(issued.issuedAt);

    const row = db()
      .prepare("SELECT data,snapshot FROM invoices WHERE id=?")
      .get(issued.id) as { data: string; snapshot: string | null };
    assert.ok(row.snapshot);
    assert.equal(row.snapshot?.split(":").length, 3);

    assert.throws(
      () =>
        updateInvoice(issued.id, {
          ...baseInput,
          paid: 0,
          revision: issued.revision,
        }),
      /đã phát hành/,
    );

    const reopened = getInvoice(issued.id);
    assert.equal(reopened?.status, "issued");
    assert.equal(reopened?.total, issued.total);
    // Re-issuing is idempotent, so a double click cannot create a new document.
    const again = issueInvoice(issued.id, issued.revision + 99);
    assert.equal(again.id, issued.id);
    assert.equal(again.number, issued.number);
  });

  it("keeps invoice numbers unique across documents", () => {
    const a = create();
    const b = create();
    assert.notEqual(a.invoice.id, b.invoice.id);
    assert.notEqual(a.invoice.number, b.invoice.number);
    assert.match(b.invoice.number, /^STT-2026-\d{6,}$/);
  });
});

describe("invoice PDF", () => {
  it("renders a Vietnamese A4 PDF from the stored draft", async () => {
    const result = create();
    const stored = getInvoiceForPdf(result.invoice.id);
    assert.ok(stored);
    assert.equal(stored.draft, true);

    const pdf = await buildInvoicePdf(stored.invoice, { draft: true });
    assert.equal(pdf.subarray(0, 4).toString("latin1"), "%PDF");
    assert.ok(pdf.byteLength > 10_000);
    assert.ok(pdf.includes("/FontFile2"), "a Unicode font must be embedded");
    assert.ok(
      (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length >= 1,
    );
  });

  it("renders the issued snapshot, not later input", async () => {
    const result = create();
    const issued = issueInvoice(result.invoice.id, result.invoice.revision);
    const stored = getInvoiceForPdf(issued.id);
    assert.ok(stored);
    assert.equal(stored.draft, false);
    assert.equal(stored.invoice.total, issued.total);
    assert.equal(stored.invoice.status, "issued");
    const pdf = await buildInvoicePdf(stored.invoice, { draft: false });
    assert.ok(pdf.byteLength > 10_000);
    assert.ok(!pdf.toString("latin1").includes("BẢN NHÁP"));
  });

  it("handles long names and enough services to cross pages", async () => {
    const manyLines = Array.from({ length: 70 }, (_, index) => ({
      description: `Dịch vụ số ${index + 1} — danh mục trải nghiệm dài để kiểm tra xuống dòng và ngắt trang`,
      unit: "lượt",
      quantity: index + 1,
      unitPrice: 123_456,
    }));
    const result = create({
      buyer: {
        ...baseInput.buyer,
        name: "Công ty Trách nhiệm Hữu hạn Du lịch và Trải nghiệm Quốc tế Nguyễn Văn A",
        company: "Công ty Trách nhiệm Hữu hạn Du lịch và Trải nghiệm Quốc tế Nguyễn Văn A",
      },
      tourTitle:
        "Hành trình khám phá Quy Nhơn – Phú Yên – Kỳ Co – Eo Gió – Ghềnh Đá Đĩa nhiều ngày",
      lines: manyLines,
      discount: 0,
      taxRate: 8,
      fee: 0,
      paid: 0,
    });
    const issued = issueInvoice(result.invoice.id, result.invoice.revision);
    const stored = getInvoiceForPdf(issued.id);
    assert.ok(stored);
    const pdf = await buildInvoicePdf(stored.invoice, { draft: false });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? [])
      .length;
    assert.ok(pages >= 2, `expected multiple pages, got ${pages}`);
    assert.ok(stored.invoice.total > 0);
  });
});
