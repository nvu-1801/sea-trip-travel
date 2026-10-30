import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateInvoice,
  formatInvoiceDate,
  formatVnd,
  invoiceNumberFromSequence,
  invoicePdfFilename,
  invoiceSummaryOf,
  InvoiceValidationError,
  type InvoiceDocument,
} from "@/domain/invoice";
import { invoiceCreateSchema } from "@/domain/invoice-schema";

/**
 * Invoice arithmetic, numbering and request validation.
 *
 * The server is the only source of totals. These tests pin the rounding rule
 * (nearest đồng), the discount/payment guards, and the schema that rejects
 * malformed money before it reaches the database or a PDF.
 */

const lines = [
  { description: "Tour Quy Nhơn – Kỳ Co", unit: "khách", quantity: 2, unitPrice: 500_000 },
  { description: "Phụ thu phòng đơn", unit: "phòng", quantity: 1, unitPrice: 250_000 },
];

describe("calculateInvoice", () => {
  it("computes line amounts, discount, tax, fee and remaining", () => {
    const result = calculateInvoice({
      lines,
      discount: 50_000,
      taxRate: 8,
      fee: 20_000,
      paid: 300_000,
    });

    assert.deepEqual(
      result.lines.map((line) => line.amount),
      [1_000_000, 250_000],
    );
    assert.equal(result.subtotal, 1_250_000);
    assert.equal(result.taxAmount, 96_000);
    assert.equal(result.total, 1_316_000);
    assert.equal(result.remaining, 1_016_000);
    assert.equal(result.paymentStatus, "partial");
  });

  it("rounds tax to the nearest đồng consistently", () => {
    const result = calculateInvoice({
      lines: [{ description: "Dịch vụ", unit: "lượt", quantity: 1, unitPrice: 999 }],
      discount: 0,
      taxRate: 7.5,
      fee: 0,
      paid: 0,
    });
    // 999 × 7.5% = 74.925 → 75
    assert.equal(result.taxAmount, 75);
    assert.equal(result.total, 1_074);
  });

  it("derives payment status without treating a PDF as payment", () => {
    const unpaid = calculateInvoice({ lines, discount: 0, taxRate: 0, fee: 0, paid: 0 });
    assert.equal(unpaid.paymentStatus, "unpaid");

    const paid = calculateInvoice({
      lines,
      discount: 0,
      taxRate: 0,
      fee: 0,
      paid: unpaid.total,
    });
    assert.equal(paid.paymentStatus, "paid");
    assert.equal(paid.remaining, 0);
  });

  it("rejects discount, payment and line errors", () => {
    assert.throws(
      () =>
        calculateInvoice({
          lines,
          discount: 1_250_001,
          taxRate: 0,
          fee: 0,
          paid: 0,
        }),
      /Giảm giá/,
    );
    assert.throws(
      () =>
        calculateInvoice({
          lines,
          discount: 0,
          taxRate: 0,
          fee: 0,
          paid: 1_250_001,
        }),
      /đã thanh toán/,
    );
    assert.throws(
      () =>
        calculateInvoice({
          lines: [{ description: "Dịch vụ", unit: "lượt", quantity: 0, unitPrice: 1000 }],
          discount: 0,
          taxRate: 0,
          fee: 0,
          paid: 0,
        }),
      /số lượng/i,
    );
    assert.throws(
      () => calculateInvoice({ lines: [], discount: 0, taxRate: 0, fee: 0, paid: 0 }),
      /ít nhất một dòng/,
    );
    assert.throws(
      () =>
        calculateInvoice({
          lines: [{ description: "  ", unit: "lượt", quantity: 1, unitPrice: 1000 }],
          discount: 0,
          taxRate: 0,
          fee: 0,
          paid: 0,
        }),
      /tên dịch vụ/i,
    );
    assert.throws(
      () =>
        calculateInvoice({
          lines,
          discount: 0,
          taxRate: 100.001,
          fee: 0,
          paid: 0,
        }),
      /Thuế suất/,
    );
  });

  it("accepts a zero total only while drafting (the issue step blocks it)", () => {
    const draft = calculateInvoice({
      lines: [{ description: "Tư vấn tour", unit: "lượt", quantity: 1, unitPrice: 0 }],
      discount: 0,
      taxRate: 0,
      fee: 0,
      paid: 0,
    });
    assert.equal(draft.total, 0);
    assert.equal(draft.paymentStatus, "unpaid");
  });
});

describe("invoice number and filename", () => {
  it("pads the sequence and uses the issue year", () => {
    assert.equal(invoiceNumberFromSequence(1, "2026-10-30"), "STT-2026-000001");
    assert.equal(
      invoiceNumberFromSequence(123456, "2025-01-01"),
      "STT-2025-123456",
    );
    assert.equal(
      invoicePdfFilename("STT-2026-000123"),
      "Hoa-don-STT-2026-000123.pdf",
    );
  });

  it("refuses an unsafe filename", () => {
    assert.throws(() => invoicePdfFilename("../../etc/passwd"));
    assert.throws(() => invoicePdfFilename("STT-26-1"));
  });
});

describe("invoice request schema", () => {
  const valid = {
    leadId: "lead-1",
    createToken: "token-12345678",
    issueDate: "2026-10-30",
    dueDate: "2026-11-05",
    buyer: {
      name: "Nguyễn Văn A",
      company: "",
      address: "",
      taxId: "",
      phone: "0987654321",
      email: "khach@example.com",
    },
    tourTitle: "Quy Nhơn – Kỳ Co",
    travelDate: "2026-11-20",
    partySize: 2,
    lines: [{ description: "Tour", unit: "khách", quantity: 2, unitPrice: 500_000 }],
    discount: 0,
    taxRate: 8,
    fee: 0,
    paid: 0,
    customerNote: "",
    bankTransfer: "",
  };

  it("accepts a complete invoice", () => {
    assert.equal(invoiceCreateSchema.safeParse(valid).success, true);
  });

  it("rejects an invalid email, negative money and a due date before issue", () => {
    const badEmail = invoiceCreateSchema.safeParse({
      ...valid,
      buyer: { ...valid.buyer, email: "not-an-email" },
    });
    assert.equal(badEmail.success, false);

    const negative = invoiceCreateSchema.safeParse({ ...valid, discount: -1 });
    assert.equal(negative.success, false);

    const badDueDate = invoiceCreateSchema.safeParse({
      ...valid,
      dueDate: "2026-10-01",
    });
    assert.equal(badDueDate.success, false);
  });

  it("rejects more than 100 service lines", () => {
    const many = Array.from({ length: 101 }, () => ({
      description: "Dịch vụ",
      unit: "lượt",
      quantity: 1,
      unitPrice: 1000,
    }));
    assert.equal(invoiceCreateSchema.safeParse({ ...valid, lines: many }).success, false);
  });
});

describe("presentation helpers", () => {
  it("formats VND and Vietnamese dates for the UI and PDF", () => {
    assert.equal(formatVnd(1_234_567), "1.234.567 ₫");
    assert.equal(formatInvoiceDate("2026-10-30"), "30/10/2026");
  });

  it("builds a summary without the encrypted payload", () => {
    const document = {
      id: "invoice-1",
      number: "STT-2026-000001",
      leadId: "lead-1",
      leadRequestId: "STT-2026-AAAA",
      status: "draft",
      paymentStatus: "partial",
      issueDate: "2026-10-30",
      dueDate: "",
      total: 1000,
      paid: 400,
      remaining: 600,
      createdAt: "2026-10-30T00:00:00.000Z",
      issuedAt: null,
    } as InvoiceDocument;
    const summary = invoiceSummaryOf(document);
    assert.equal(summary.total, 1000);
    assert.equal(summary.remaining, 600);
    assert.equal(summary.paymentStatus, "partial");
    assert.ok(!("buyer" in summary));
  });

  it("uses typed errors for calculation guards", () => {
    assert.throws(
      () =>
        calculateInvoice({ lines, discount: 9_999_999, taxRate: 0, fee: 0, paid: 0 }),
      InvoiceValidationError,
    );
  });
});
