import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { auditContext, auditFailure } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import {
  bookingCreateSchema,
  bookingUpdateSchema,
  financeEntryCreateSchema,
  financeEntryUpdateSchema,
  financeReportSchema,
  financeVoidSchema,
} from "@/domain/tour-finance";
import {
  createBooking,
  createEntry,
  findDuplicateBooking,
  getBookingDetail,
  getFinanceReport,
  updateBooking,
  updateEntry,
  voidEntry,
} from "@/server/cms/finance";

const actionSchema = z.enum([
  "create-booking",
  "update-booking",
  "create-entry",
  "update-entry",
  "void-entry",
]);

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const url = new URL(request.url);
    const bookingId = url.searchParams.get("booking");
    if (bookingId) {
      const detail = getBookingDetail(bookingId);
      if (!detail) return reply({ error: "Không tìm thấy hồ sơ tour" }, 404);
      return reply(detail);
    }
    const query = financeReportSchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    return reply(getFinanceReport(query));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const body = (await jsonBody(request, 30_000)) as Record<string, unknown>;
    const action = actionSchema.parse(body.action);
    try {
      if (action === "create-booking") {
        const input = bookingCreateSchema.parse(body);
        const duplicate = findDuplicateBooking(
          input.leadId ?? null,
          input.tourSlug,
          input.travelDate,
        );
        if (duplicate && !input.confirmDuplicate) {
          auditFailure(
            request,
            "finance-booking-duplicate",
            `finance/booking/${duplicate.id}`,
            "Hồ sơ có thể bị trùng; cần xác nhận",
            {
              bookingId: duplicate.id,
              leadId: input.leadId ?? null,
              travelDate: input.travelDate,
            },
          );
          return reply(
            {
              error:
                "Đã có hồ sơ cùng yêu cầu, tour và ngày đi. Kiểm tra lại trước khi tạo thêm.",
              duplicate: {
                id: duplicate.id,
                tourTitle: duplicate.tour_title,
                travelDate: duplicate.travel_date,
                saleAmount: duplicate.sale_amount,
              },
            },
            409,
          );
        }
        const booking = createBooking(input, auditContext(request));
        return reply({ booking }, 201);
      }
      if (action === "update-booking") {
        const input = bookingUpdateSchema.parse(body);
        return reply({
          booking: updateBooking(input, auditContext(request)),
        });
      }
      if (action === "create-entry") {
        const input = financeEntryCreateSchema.parse(body);
        return reply(
          { entry: createEntry(input, auditContext(request)) },
          201,
        );
      }
      if (action === "update-entry") {
        const input = financeEntryUpdateSchema.parse(body);
        return reply({
          entry: updateEntry(input, auditContext(request)),
        });
      }
      const input = financeVoidSchema.parse(body);
      return reply({
        entry: voidEntry(input.id, input.reason, auditContext(request)),
      });
    } catch (error) {
      auditFailure(
        request,
        `finance-${action}`,
        "finance",
        error instanceof Error ? error.message : "Không thể lưu tài chính",
      );
      throw error;
    }
  });
}
