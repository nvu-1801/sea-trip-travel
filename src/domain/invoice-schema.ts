import { z } from "zod";
import { isValidEmailAddress } from "@/lib/email-address";
import {
  calculateInvoice,
  isInvoiceDate,
  MAX_INVOICE_AMOUNT,
  MAX_INVOICE_LINES,
  type InvoiceLineInput,
} from "./invoice";

/**
 * Request schemas for invoices. Kept out of `invoice.ts` so browser code can
 * import the money helpers without pulling Zod into the admin bundle.
 */

const text = (max: number, label: string) =>
  z.string().trim().max(max, `${label} quá dài`);

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .refine(isInvoiceDate, "Ngày không hợp lệ (YYYY-MM-DD)")
    .optional(),
);

const dateSchema = z
  .string()
  .refine(isInvoiceDate, "Ngày không hợp lệ (YYYY-MM-DD)");

const moneySchema = (label: string) =>
  z
    .number({ error: `${label} phải là số` })
    .int(`${label} phải là số nguyên VND`)
    .min(0, `${label} không được âm`)
    .max(MAX_INVOICE_AMOUNT, `${label} quá lớn`);

const lineSchema = z.object({
  description: text(200, "Tên dịch vụ").min(1, "Vui lòng nhập tên dịch vụ"),
  unit: text(30, "Đơn vị tính").default("lượt"),
  quantity: z
    .number({ error: "Số lượng phải là số" })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1")
    .max(9999, "Số lượng tối đa là 9.999"),
  unitPrice: moneySchema("Đơn giá"),
});

const buyerSchema = z.object({
  name: text(120, "Tên khách hàng").min(1, "Vui lòng nhập tên khách hàng"),
  company: text(160, "Tên công ty").default(""),
  address: text(300, "Địa chỉ").default(""),
  taxId: text(40, "Mã số thuế").default(""),
  phone: text(40, "Điện thoại").default(""),
  email: text(160, "Email")
    .refine(
      (value) => value === "" || isValidEmailAddress(value),
      "Email khách hàng chưa hợp lệ",
    )
    .default(""),
});

const invoiceFields = z.object({
  issueDate: dateSchema,
  dueDate: optionalDate,
  buyer: buyerSchema,
  tourTitle: text(200, "Tên tour").default(""),
  travelDate: optionalDate,
  partySize: z
    .number()
    .int("Số khách phải là số nguyên")
    .min(1, "Số khách tối thiểu là 1")
    .max(100, "Số khách tối đa là 100")
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  lines: z
    .array(lineSchema)
    .min(1, "Hóa đơn cần ít nhất một dòng dịch vụ")
    .max(MAX_INVOICE_LINES, `Hóa đơn tối đa ${MAX_INVOICE_LINES} dòng`),
  discount: moneySchema("Giảm giá").default(0),
  taxRate: z
    .number({ error: "Thuế suất phải là số" })
    .min(0, "Thuế suất không được âm")
    .max(100, "Thuế suất tối đa là 100%")
    .default(0),
  fee: moneySchema("Phí khác").default(0),
  paid: moneySchema("Đã thanh toán").default(0),
  customerNote: text(1000, "Ghi chú cho khách").default(""),
  bankTransfer: text(600, "Thông tin chuyển khoản").default(""),
});

type InvoiceFields = {
  issueDate: string;
  dueDate?: string;
  lines: InvoiceLineInput[];
  discount: number;
  taxRate: number;
  fee: number;
  paid: number;
};

function validateBusiness(value: InvoiceFields, context: z.RefinementCtx) {
  if (value.dueDate && value.dueDate < value.issueDate) {
    context.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "Hạn thanh toán không được trước ngày lập hóa đơn",
    });
  }
  try {
    calculateInvoice(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      path: ["lines"],
      message:
        error instanceof Error ? error.message : "Dữ liệu hóa đơn chưa hợp lệ",
    });
  }
}

export const invoiceInputSchema = invoiceFields.superRefine(validateBusiness);

export const invoiceCreateSchema = invoiceFields
  .extend({
    leadId: z.string().min(1).max(100),
    /** Idempotency token minted once when the form opens. */
    createToken: z
      .string()
      .min(8)
      .max(80)
      .regex(/^[A-Za-z0-9-]+$/, "Mã tạo hóa đơn không hợp lệ"),
  })
  .superRefine(validateBusiness);

export const invoiceUpdateSchema = invoiceFields
  .extend({
    revision: z.number().int().nonnegative(),
  })
  .superRefine(validateBusiness);

export const invoiceIssueSchema = z.object({
  revision: z.number().int().nonnegative(),
});

export type InvoiceInput = z.infer<typeof invoiceFields>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
