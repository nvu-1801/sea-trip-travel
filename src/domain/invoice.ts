/**
 * Commercial invoice / payment request for a consultation request.
 *
 * These are *not* legal electronic invoices. The document is built from values
 * staff enter and confirm; tour prices, tax rates, tax ids and bank details are
 * never guessed. Money is integer VND and every total is recomputed on the
 * server before it is stored or rendered.
 */

export const INVOICE_STATUSES = ["draft", "issued"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;
export type InvoicePaymentStatus = (typeof INVOICE_PAYMENT_STATUSES)[number];

export const MAX_INVOICE_AMOUNT = 1_000_000_000_000;
export const MAX_INVOICE_LINES = 100;
export const INVOICE_CURRENCY = "VND" as const;

export type InvoiceLineInput = {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceLine = InvoiceLineInput & {
  /** quantity × unitPrice, always recomputed. */
  amount: number;
};

export type InvoiceBuyer = {
  name: string;
  company: string;
  address: string;
  taxId: string;
  phone: string;
  email: string;
};

export type InvoiceSeller = {
  name: string;
  address: string;
  phone: string;
  email: string;
};

export type InvoiceCalculation = {
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  fee: number;
  total: number;
  paid: number;
  remaining: number;
  paymentStatus: InvoicePaymentStatus;
};

export type InvoiceDocument = InvoiceCalculation & {
  id: string;
  number: string;
  leadId: string;
  leadRequestId: string;
  status: InvoiceStatus;
  currency: typeof INVOICE_CURRENCY;
  issueDate: string;
  dueDate: string;
  seller: InvoiceSeller;
  buyer: InvoiceBuyer;
  tourTitle: string;
  travelDate: string;
  partySize: number | null;
  customerNote: string;
  bankTransfer: string;
  createdAt: string;
  updatedAt: string;
  issuedAt: string | null;
  revision: number;
};

export type InvoiceSummary = {
  id: string;
  number: string;
  leadId: string;
  leadRequestId: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  issueDate: string;
  dueDate: string;
  total: number;
  paid: number;
  remaining: number;
  createdAt: string;
  issuedAt: string | null;
};

export class InvoiceValidationError extends Error {}

export function isInvoiceDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

export function formatInvoiceDate(value: string): string {
  if (!isInvoiceDate(value)) return value;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

/** `STT-2026-000123` — year comes from the invoice issue date. */
export function invoiceNumberFromSequence(sequence: number, issueDate: string): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new InvoiceValidationError("Số hóa đơn không hợp lệ");
  }
  const year = isInvoiceDate(issueDate) ? issueDate.slice(0, 4) : "0000";
  return `STT-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Filename is derived from the server-generated number only. */
export function invoicePdfFilename(number: string): string {
  if (!/^STT-\d{4}-\d{6,}$/.test(number)) {
    throw new InvoiceValidationError("Số hóa đơn không hợp lệ");
  }
  return `Hoa-don-${number}.pdf`;
}

function requireMoney(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_INVOICE_AMOUNT) {
    throw new InvoiceValidationError(`${label} phải là số VND hợp lệ`);
  }
  return value;
}

function sumMoney(values: number[], label: string): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total) || total > MAX_INVOICE_AMOUNT) {
    throw new InvoiceValidationError(`${label} vượt quá giới hạn cho phép`);
  }
  return total;
}

/**
 * Recompute every amount from the inputs. Client-supplied totals are never
 * trusted: the API, the stored document and the PDF all use this function.
 */
export function calculateInvoice(input: {
  lines: InvoiceLineInput[];
  discount: number;
  taxRate: number;
  fee: number;
  paid: number;
}): InvoiceCalculation {
  if (!Array.isArray(input.lines) || input.lines.length < 1) {
    throw new InvoiceValidationError("Hóa đơn cần ít nhất một dòng dịch vụ");
  }
  if (input.lines.length > MAX_INVOICE_LINES) {
    throw new InvoiceValidationError(
      `Hóa đơn tối đa ${MAX_INVOICE_LINES} dòng dịch vụ`,
    );
  }

  const lines = input.lines.map((line, index) => {
    if (!line.description.trim()) {
      throw new InvoiceValidationError(`Dòng ${index + 1}: chưa nhập tên dịch vụ`);
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 9999) {
      throw new InvoiceValidationError(
        `Dòng ${index + 1}: số lượng phải là số nguyên từ 1 đến 9.999`,
      );
    }
    const unitPrice = requireMoney(line.unitPrice, `Dòng ${index + 1}: đơn giá`);
    const amount = line.quantity * unitPrice;
    if (!Number.isSafeInteger(amount) || amount > MAX_INVOICE_AMOUNT) {
      throw new InvoiceValidationError(`Dòng ${index + 1}: thành tiền quá lớn`);
    }
    return {
      description: line.description.trim(),
      unit: line.unit.trim(),
      quantity: line.quantity,
      unitPrice,
      amount,
    };
  });

  const subtotal = sumMoney(
    lines.map((line) => line.amount),
    "Tạm tính",
  );
  const discount = requireMoney(input.discount, "Giảm giá");
  if (discount > subtotal) {
    throw new InvoiceValidationError("Giảm giá không được lớn hơn tạm tính");
  }
  const fee = requireMoney(input.fee, "Phí khác");

  const taxRate = input.taxRate;
  if (
    typeof taxRate !== "number" ||
    !Number.isFinite(taxRate) ||
    taxRate < 0 ||
    taxRate > 100 ||
    Math.abs(Math.round(taxRate * 100) - taxRate * 100) > 1e-6
  ) {
    throw new InvoiceValidationError(
      "Thuế suất phải từ 0 đến 100 và tối đa 2 chữ số thập phân",
    );
  }

  const taxable = subtotal - discount;
  const taxBasisPoints = Math.round(taxRate * 100);
  // Round to the nearest đồng, consistently for display, storage and PDF.
  const taxAmount = Math.round((taxable * taxBasisPoints) / 10_000);
  const total = sumMoney([taxable, taxAmount, fee], "Tổng tiền");

  const paid = requireMoney(input.paid, "Đã thanh toán");
  if (paid > total) {
    throw new InvoiceValidationError(
      "Số tiền đã thanh toán không được lớn hơn tổng tiền",
    );
  }
  const remaining = total - paid;
  const paymentStatus: InvoicePaymentStatus =
    total > 0 && paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";

  return {
    lines,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    fee,
    total,
    paid,
    remaining,
    paymentStatus,
  };
}

export function invoiceSummaryOf(invoice: InvoiceDocument): InvoiceSummary {
  return {
    id: invoice.id,
    number: invoice.number,
    leadId: invoice.leadId,
    leadRequestId: invoice.leadRequestId,
    status: invoice.status,
    paymentStatus: invoice.paymentStatus,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    total: invoice.total,
    paid: invoice.paid,
    remaining: invoice.remaining,
    createdAt: invoice.createdAt,
    issuedAt: invoice.issuedAt,
  };
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Bản nháp",
  issued: "Đã phát hành",
};

export const INVOICE_PAYMENT_LABELS: Record<InvoicePaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
};
