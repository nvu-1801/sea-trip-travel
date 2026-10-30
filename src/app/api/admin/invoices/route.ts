import { requireSession } from "@/server/cms/auth";
import { auditFailure, auditRequest } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { invoiceCreateSchema } from "@/domain/invoice-schema";
import { createInvoice, listInvoices } from "@/server/cms/invoices";

/**
 * Invoice list and creation.
 *
 * Every request requires the admin session. The create token makes a
 * double-click idempotent: the same form token returns the invoice it already
 * created instead of adding a second document.
 */
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const leadId = new URL(request.url).searchParams.get("leadId") ?? undefined;
    return reply(listInvoices(leadId || undefined));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const input = invoiceCreateSchema.parse(await jsonBody(request, 200_000));
    try {
      const result = createInvoice(input);
      auditRequest(request, "invoice-create", result.invoice.id, {
        details: {
          invoiceId: result.invoice.id,
          number: result.invoice.number,
          leadId: result.invoice.leadId,
          total: result.invoice.total,
          status: result.invoice.status,
          reused: !result.created,
        },
      });
      return reply({ invoice: result.invoice }, result.created ? 201 : 200);
    } catch (error) {
      auditFailure(
        request,
        "invoice-create",
        input.leadId,
        error instanceof Error ? error.message : "Không thể tạo hóa đơn",
        { leadId: input.leadId },
      );
      throw error;
    }
  });
}
