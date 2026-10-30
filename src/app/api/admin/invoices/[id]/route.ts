import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { auditFailure, auditRequest } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { invoiceUpdateSchema } from "@/domain/invoice-schema";
import {
  getInvoice,
  issueInvoice,
  updateInvoice,
} from "@/server/cms/invoices";

const idSchema = z.string().min(1).max(100);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const id = idSchema.parse((await params).id);
    const invoice = getInvoice(id);
    if (!invoice) return reply({ error: "Không tìm thấy hóa đơn" }, 404);
    return reply({ invoice });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const id = idSchema.parse((await params).id);
    const input = invoiceUpdateSchema.parse(await jsonBody(request, 200_000));
    try {
      const invoice = updateInvoice(id, input);
      auditRequest(request, "invoice-update", id, {
        details: {
          invoiceId: id,
          number: invoice.number,
          revision: invoice.revision,
          total: invoice.total,
          paymentStatus: invoice.paymentStatus,
        },
      });
      return reply({ invoice });
    } catch (error) {
      auditFailure(
        request,
        "invoice-update",
        id,
        error instanceof Error ? error.message : "Không thể lưu hóa đơn",
        { invoiceId: id },
      );
      throw error;
    }
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const id = idSchema.parse((await params).id);
    const body = await jsonBody(request, 10_000);
    const action = z
      .object({ action: z.literal("issue"), revision: z.number().int().nonnegative() })
      .parse(body);
    try {
      const invoice = issueInvoice(id, action.revision);
      auditRequest(request, "invoice-issue", id, {
        details: {
          invoiceId: id,
          number: invoice.number,
          revision: invoice.revision,
          total: invoice.total,
          paymentStatus: invoice.paymentStatus,
        },
      });
      return reply({ invoice });
    } catch (error) {
      auditFailure(
        request,
        "invoice-issue",
        id,
        error instanceof Error ? error.message : "Không thể phát hành hóa đơn",
        { invoiceId: id },
      );
      throw error;
    }
  });
}
