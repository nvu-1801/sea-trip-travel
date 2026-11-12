import "server-only";
import { createHmac, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { normalizePhone, phoneSchema } from "@/domain/lead";
import { activePromotion, promotionSchema, promotionTime, promotionWinnerCount } from "@/domain/promotion";
import { HttpError } from "./auth";
import { audit, db, transaction, type AuditContext } from "./db";
import { decrypt, encrypt } from "./leads";
import { publicPromotions } from "./promotions";
import { list, seed } from "./store";

const campaignId = z.string().regex(/^promo_[a-z0-9_]{1,74}$/);
export const entrySchema = z.object({
  promotionId: campaignId,
  fullName: z.string().trim().min(2, "Nhập họ và tên (ít nhất 2 ký tự)").max(100, "Họ tên tối đa 100 ký tự"),
  phone: phoneSchema,
  consent: z.literal(true, "Xác nhận đồng ý để Sea Trip liên hệ"),
  company: z.string().max(0, "Đăng ký không hợp lệ").optional(),
  tourSlug: z.string().regex(/^[a-z0-9-]{1,120}$/).optional(),
});

function phoneKey(id: string, phone: string) {
  return createHmac("sha256", Buffer.from(process.env.LEAD_ENCRYPTION_KEY!, "hex"))
    .update(`promotion-entry:${id}:${phone}`).digest("hex");
}

export function registerPromotion(input: z.infer<typeof entrySchema>) {
  seed();
  const phone = normalizePhone(input.phone);
  const data = encrypt({ fullName: input.fullName, phone, tourSlug: input.tourSlug });
  const key = phoneKey(input.promotionId, phone);
  return transaction(() => {
    if (db().prepare("SELECT 1 FROM promotion_entries WHERE campaign_id=? AND phone_key=?").get(input.promotionId, key))
      return { ok: true };
    if (isPromotionClosed(input.promotionId) || activePromotion(publicPromotions(), input.tourSlug ?? null, Date.now())?.id !== input.promotionId)
      throw new HttpError(409, "Chiến dịch đã đóng hoặc không áp dụng cho tour này.");
    db().prepare("INSERT INTO promotion_entries(id,campaign_id,phone_key,data,created_at) VALUES(?,?,?,?,?)")
      .run(randomUUID(), input.promotionId, key, data, new Date().toISOString());
    return { ok: true };
  });
}

export function reconcileLegacyPromotion(id: string, apply: boolean, context: AuditContext) {
  requireCampaign(id);
  return transaction(() => {
    if (isPromotionClosed(id)) throw new HttpError(409, "Đối soát trước khi đóng đăng ký.");
    const rows = db().prepare(`SELECT l.id,l.data,l.created_at,l.deleted_at,
      (EXISTS(SELECT 1 FROM invoices WHERE lead_id=l.id) OR
       EXISTS(SELECT 1 FROM tour_bookings WHERE lead_id=l.id)) AS linked
      FROM leads l WHERE l.kind='tour' ORDER BY l.created_at,l.id`).all() as {
        id: string; data: string; created_at: string; deleted_at: string | null; linked: number;
      }[];
    const report = { eligible: 0, duplicates: 0, linked: 0, trash: 0, invalid: 0, unreadable: 0 };
    const keys = db().prepare("SELECT phone_key FROM promotion_entries WHERE campaign_id=?")
      .all(id) as { phone_key: string }[];
    const seen = new Set(keys.map((row) => row.phone_key));
    for (const row of rows) {
      let value: { promotionId?: string; fullName?: string; phone?: string; tourSlug?: string };
      try { value = decrypt(row.data); } catch { report.unreadable++; continue; }
      if (value?.promotionId !== id) continue;
      if (row.deleted_at) { report.trash++; continue; }
      if (row.linked) { report.linked++; continue; }
      const parsed = entrySchema.safeParse({ ...value, consent: true });
      if (!parsed.success) { report.invalid++; continue; }
      const phone = normalizePhone(parsed.data.phone);
      const key = phoneKey(id, phone);
      if (seen.has(key)) report.duplicates++;
      else {
        seen.add(key);
        report.eligible++;
        if (apply) db().prepare("INSERT INTO promotion_entries(id,campaign_id,phone_key,data,created_at) VALUES(?,?,?,?,?)")
          .run(randomUUID(), id, key, encrypt({ fullName: parsed.data.fullName, phone, tourSlug: parsed.data.tourSlug }), row.created_at);
      }
      if (apply) db().prepare("UPDATE leads SET kind='promotion_archived' WHERE id=?").run(row.id);
    }
    if (apply) audit("promotion-reconcile", `promotions/${id}`, { ...context, details: report });
    return report;
  });
}

export function isPromotionClosed(id: string) {
  return Boolean(db().prepare("SELECT 1 FROM promotion_results WHERE campaign_id=?").get(id));
}

export function promotionEntryCounts() {
  const rows = db().prepare("SELECT campaign_id, count(*) AS total FROM promotion_entries GROUP BY campaign_id")
    .all() as { campaign_id: string; total: number }[];
  return Object.fromEntries(rows.map(({ campaign_id, total }) => [campaign_id, total]));
}

export function unreadPromotionCount() {
  const row = db().prepare(`SELECT count(*) AS total FROM promotion_entries e
    JOIN records r ON r.collection='promotions' AND r.id=e.campaign_id
    WHERE e.read_at IS NULL AND r.state!='deleted'`).get();
  return Number(row?.total ?? 0);
}

function requireCampaign(id: string) {
  const row = list("promotions").find((row) => row.id === id && row.state !== "deleted");
  if (!row)
    throw new HttpError(404, "Không tìm thấy chiến dịch.");
  return row;
}

function effectiveCampaign(id: string, draft: unknown) {
  const published = db().prepare("SELECT published FROM records WHERE collection='promotions' AND id=?").get(id)?.published;
  return promotionSchema.parse(published ? JSON.parse(String(published)) : draft);
}

const rulesOf = (campaign: ReturnType<typeof effectiveCampaign>) => {
  return { method: campaign.selectionMode ?? "random", count: campaign.winnerCount ?? 1, reserves: campaign.reserveCount ?? 0,
    entriesPerWinner: campaign.entriesPerWinner };
};
type Rules = ReturnType<typeof rulesOf>;
const registrationExpired = (campaign: ReturnType<typeof effectiveCampaign>) => Boolean(campaign.ends) && promotionTime(campaign.ends) <= Date.now();
type Fulfillment = "contacted" | "confirmed" | "delivered";
type Result = { method: Rules["method"]; selected: string[]; alternates: string[]; fulfillment: Record<string, Fulfillment>; eligible: number; at: string; reason?: string };
function readResult(encoded: unknown): Result | null {
  if (typeof encoded !== "string") return null;
  const result = JSON.parse(encoded) as Result;
  return { ...result, alternates: result.alternates ?? [], fulfillment: result.fulfillment ?? {} };
}

export function promotionEntries(id: string) {
  const campaign = requireCampaign(id);
  const effective = effectiveCampaign(id, campaign.data);
  const state = db().prepare("SELECT closed_at, rules, result FROM promotion_results WHERE campaign_id=?").get(id);
  const rows = db().prepare("SELECT rowid,id,data,created_at,exclusion FROM promotion_entries WHERE campaign_id=? ORDER BY created_at DESC,id")
    .all(id) as { rowid: number; id: string; data: string; created_at: string; exclusion: string | null }[];
  return { closedAt: state?.closed_at ?? null, expired: registrationExpired(effective), ends: effective.ends, terms: effective.terms,
    rules: state ? JSON.parse(String(state.rules)) : rulesOf(effective),
    result: readResult(state?.result),
    seenThrough: rows.reduce((latest, row) => Math.max(latest, row.rowid), 0),
    entries: rows.map(({ data, id, created_at, exclusion }) => ({ ...decrypt(data), id, created_at, exclusion })) };
}

export const promotionAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark-read"), through: z.number().int().nonnegative() }),
  z.object({ action: z.literal("close") }),
  z.object({ action: z.literal("exclude"), id: z.uuid(), reason: z.string().trim().min(1, "Nhập lý do loại").max(250) }),
  z.object({ action: z.literal("random"), count: z.number().int().min(1, "Nhập ít nhất một suất").max(100) }),
  z.object({ action: z.literal("manual"), ids: z.array(z.uuid()).min(1, "Chọn ít nhất một người").max(100), reason: z.string().trim().min(1, "Nhập lý do chọn").max(250) }),
  z.object({ action: z.literal("fulfill"), id: z.uuid(), status: z.enum(["contacted", "confirmed", "delivered"]) }),
  z.object({ action: z.literal("replace"), id: z.uuid(), reason: z.string().trim().min(1, "Nhập lý do thay người trúng").max(250) }),
]);

export function updatePromotionEntries(id: string, input: z.infer<typeof promotionAction>, context: AuditContext) {
  const campaign = requireCampaign(id);
  if (input.action === "mark-read") {
    db().prepare("UPDATE promotion_entries SET read_at=? WHERE campaign_id=? AND read_at IS NULL AND rowid<=?")
      .run(new Date().toISOString(), id, input.through);
    return { ok: true };
  }
  return transaction(() => {
    const state = db().prepare("SELECT result,rules FROM promotion_results WHERE campaign_id=?").get(id);
    if (input.action === "fulfill" || input.action === "replace") {
      const result = readResult(state?.result);
      if (!result?.selected.includes(input.id)) throw new HttpError(409, "Người này không có trong kết quả hiện tại.");
      if (input.action === "fulfill") {
        result.fulfillment[input.id] = input.status;
      } else {
        if (result.fulfillment[input.id] === "delivered" || !result.alternates.length)
          throw new HttpError(409, "Không thể thay người đã nhận quà hoặc khi không còn dự phòng.");
        const alternate = result.alternates.shift()!;
        result.selected = result.selected.map((entry) => entry === input.id ? alternate : entry);
        delete result.fulfillment[input.id];
        audit("promotion-replace", `promotions/${id}`, { ...context, details: { from: input.id, to: alternate, reason: input.reason } });
      }
      db().prepare("UPDATE promotion_results SET result=? WHERE campaign_id=?").run(JSON.stringify(result), id);
      if (input.action === "fulfill") audit("promotion-fulfill", `promotions/${id}`, { ...context, details: { entry: input.id, status: input.status } });
      return { ok: true };
    }
    if (state?.result) throw new HttpError(409, "Kết quả đã chốt.");
    if (input.action === "close") {
      db().prepare("INSERT OR IGNORE INTO promotion_results(campaign_id,closed_at,rules) VALUES(?,?,?)")
        .run(id, new Date().toISOString(), JSON.stringify(rulesOf(effectiveCampaign(id, campaign.data))));
    } else if (input.action === "exclude") {
      const result = db().prepare("UPDATE promotion_entries SET exclusion=? WHERE campaign_id=? AND id=?").run(input.reason, id, input.id);
      if (!result.changes) throw new HttpError(404, "Không tìm thấy lượt đăng ký.");
    } else {
      const campaignForDraw = state ? null : effectiveCampaign(id, campaign.data);
      if (campaignForDraw && (input.action !== "random" || !registrationExpired(campaignForDraw)))
        throw new HttpError(409, "Đóng đăng ký trước khi chốt kết quả.");
      const pool = (db().prepare("SELECT id FROM promotion_entries WHERE campaign_id=? AND exclusion IS NULL").all(id) as { id: string }[]).map((row) => row.id);
      const count = input.action === "random" ? input.count : input.ids.length;
      const rules = campaignForDraw ? rulesOf(campaignForDraw) : JSON.parse(String(state?.rules)) as Rules;
      if (input.action !== rules.method || count !== promotionWinnerCount(pool.length, rules.count, rules.entriesPerWinner))
        throw new HttpError(400, "Cách chọn và số giải phải đúng với thể lệ đã chốt.");
      if (count > pool.length) throw new HttpError(400, "Số suất vượt quá số lượt đủ điều kiện.");
      const selected = input.action === "manual" ? [...new Set(input.ids)] : [];
      if (input.action === "manual" && (selected.length !== count || selected.some((entry) => !pool.includes(entry))))
        throw new HttpError(400, "Danh sách chọn có lượt trùng hoặc không đủ điều kiện.");
      const eligible = pool.length;
      if (input.action === "random") while (selected.length < count) selected.push(pool.splice(randomInt(pool.length), 1)[0]);
      const alternates: string[] = [];
      while (input.action === "random" && pool.length && alternates.length < rules.reserves)
        alternates.push(pool.splice(randomInt(pool.length), 1)[0]);
      const result: Result = { method: input.action, selected, alternates, fulfillment: {}, eligible, at: new Date().toISOString(), reason: input.action === "manual" ? input.reason : undefined };
      if (state) {
        db().prepare("UPDATE promotion_results SET result=? WHERE campaign_id=?").run(JSON.stringify(result), id);
      } else {
        db().prepare("INSERT INTO promotion_results(campaign_id,closed_at,rules,result) VALUES(?,?,?,?)")
          .run(id, result.at, JSON.stringify(rules), JSON.stringify(result));
      }
    }
    audit(`promotion-${input.action}`, `promotions/${id}`, context);
    return { ok: true };
  });
}
