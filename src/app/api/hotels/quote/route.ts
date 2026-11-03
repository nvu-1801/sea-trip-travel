import { handle, reply } from "@/server/cms/http";
import { consumeLimit, hotelSettings } from "@/server/cms/store";
import { quoteHotelRequest } from "@/server/hotels/public";
import { defaultLocale, isLocale } from "@/i18n/config";

/**
 * `GET /api/hotels/quote`
 *
 * Read-only reference price for a room selection. No PII and no writes: the
 * browser never sends money, and the server re-reads the current rules on every
 * call. Disabled with the module flag, like every other public hotel route.
 */

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "local";
}

export async function GET(request: Request) {
  return handle(async () => {
    if (!hotelSettings().enabled)
      return reply(
        { error: "Module khách sạn đang tắt", code: "MODULE_DISABLED" },
        404,
      );

    const query = new URL(request.url).searchParams;
    const hotelId = (query.get("hotel") ?? "").trim();
    const localeParam = query.get("locale") ?? defaultLocale;
    const locale = isLocale(localeParam) ? localeParam : defaultLocale;
    const checkIn = (query.get("checkIn") ?? "").trim();
    const checkOut = (query.get("checkOut") ?? "").trim();
    const tourSlug = (query.get("tour") ?? "").trim() || null;

    if (!/^hotel_[a-z0-9_]+$/.test(hotelId))
      return reply({ error: "Khách sạn không hợp lệ" }, 400);

    const rooms = (query.get("rooms") ?? "")
      .split(",")
      .map((entry) => entry.split(":"))
      .filter(([roomId, quantity]) => {
        if (!/^room_[a-z0-9_]+$/.test(roomId ?? "")) return false;
        const value = Number(quantity);
        return Number.isInteger(value) && value >= 1 && value <= 5;
      })
      .slice(0, 6)
      .map(([roomId, quantity]) => ({
        roomId,
        quantity: Number(quantity),
      }));

    const adults = Number(query.get("adults") ?? "2");
    const children = Number(query.get("children") ?? "0");

    if (rooms.length === 0)
      return reply({ error: "Chưa chọn hạng phòng" }, 400);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut))
      return reply({ error: "Cần chọn ngày nhận và ngày trả" }, 400);

    if (!consumeLimit(`hotel-quote:${clientIp(request)}`, 60, 60_000))
      return reply(
        { error: "Bạn thao tác khá nhanh. Vui lòng thử lại sau một phút." },
        429,
      );

    const result = quoteHotelRequest(locale, {
      hotelId,
      rooms,
      checkIn,
      checkOut,
      tourSlug,
      adults,
      children,
    });
    if (!result)
      return reply({ error: "Không tìm thấy khách sạn hoặc hạng phòng" }, 404);
    return reply(result);
  });
}
