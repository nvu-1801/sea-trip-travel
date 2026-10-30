import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { auditFailure, auditRequest } from "@/server/cms/audit";
import { handle, reply } from "@/server/cms/http";
import { getInvoiceForPdf } from "@/server/cms/invoices";
import { buildInvoicePdf } from "@/server/invoices/pdf";
import { invoicePdfFilename } from "@/domain/invoice";

export const dynamic = "force-dynamic";

const idSchema = z.string().min(1).max(100);

/**
 * Authenticated PDF stream. Drafts download with a watermark; issued invoices
 * download from the immutable snapshot. The file never sits in `public/`.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const id = idSchema.parse((await params).id);
    const result = getInvoiceForPdf(id);
    if (!result) {
      auditFailure(request, "invoice-download", id, "Không tìm thấy hóa đơn");
      return reply({ error: "Không tìm thấy hóa đơn" }, 404);
    }

    let filename: string;
    try {
      filename = invoicePdfFilename(result.invoice.number);
    } catch (error) {
      auditFailure(
        request,
        "invoice-download",
        id,
        error instanceof Error ? error.message : "Số hóa đơn không hợp lệ",
      );
      throw error;
    }

    let buffer: Buffer;
    try {
      buffer = await buildInvoicePdf(result.invoice, { draft: result.draft });
    } catch (error) {
      auditFailure(
        request,
        "invoice-download",
        id,
        error instanceof Error ? error.message : "Không tạo được PDF",
      );
      throw error;
    }

    const inline =
      new URL(request.url).searchParams.get("disposition") === "inline";
    auditRequest(request, "invoice-download", id, {
      details: {
        invoiceId: id,
        number: result.invoice.number,
        status: result.invoice.status,
        paymentStatus: result.invoice.paymentStatus,
        inline,
      },
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-length": String(buffer.byteLength),
        "content-disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  });
}
