import { LEAD_LIMITS, type LeadResponse } from "@/domain/lead";
import { submitLead } from "@/server/leads/service";

/**
 * `POST /api/leads` — consultation request intake.
 *
 * Runs on the Node.js runtime because the optional SMTP transport requires it.
 * POST handlers are never prerendered, so nothing here interacts with Cache
 * Components.
 *
 * Order of work: size guard → JSON parse → service (validate, anti-abuse, send).
 * The size guard runs before parsing so an oversized body is rejected without
 * allocating it.
 *
 * No `runtime` export: route segment config is not compatible with Cache
 * Components, and route handlers already default to the Node.js runtime (which
 * the optional SMTP transport needs).
 */

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? undefined;
}

function errorResponse(status: number, response: LeadResponse, retryAfter?: number): Response {
  const headers = new Headers({ "cache-control": "no-store" });
  if (retryAfter) headers.set("retry-after", String(retryAfter));
  return Response.json(response, { status, headers });
}

export async function POST(request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > LEAD_LIMITS.maxBodyBytes) {
    return errorResponse(413, {
      ok: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Nội dung gửi quá lớn. Vui lòng rút gọn và thử lại.",
      },
    });
  }

  const raw = await request.text();
  if (raw.length > LEAD_LIMITS.maxBodyBytes) {
    return errorResponse(413, {
      ok: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Nội dung gửi quá lớn. Vui lòng rút gọn và thử lại.",
      },
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse(400, {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu gửi lên không hợp lệ.",
        fieldErrors: { form: ["Không đọc được dữ liệu gửi lên."] },
      },
    });
  }

  const result = await submitLead({
    body,
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const retryAfter =
    !result.response.ok && result.response.error.code === "RATE_LIMITED"
      ? result.response.error.retryAfterSeconds
      : undefined;

  return errorResponse(result.status, result.response, retryAfter);
}
