# Train Agent — Tab Tổng quan & Thống kê (Admin SEA TRIP)

> Mục đích: dạy agent khác hiểu đúng skill + UI + API thống kê của repo `sea-trip-travel`, không bịa số liệu, không phá phân quyền, không phá visual.
> Nguồn thật đã kiểm chứng trong repo này. Mọi hành vi dưới đây đều có `file:line` đối chiếu.

## 1. Bối cảnh & định vị

* Tab `overview` = `Tổng quan`, icon `◉`, là tab mặc định đầu sidebar — `src/features/admin/dashboard.tsx:26,225`.
* Các tab còn lại: `tours/articles/categories/destinations/hero/landing/media/messages/settings/leads/account` — `src/features/admin/dashboard.tsx:26-35`.
* Mount: `src/app/admin/page.tsx:1-12` render `<Dashboard initialCsrf>`; `Dashboard` rẽ nhánh `tab === "overview" ? <Overview/>` — `src/features/admin/dashboard.tsx:733-735`.
* Tab `landing` = `Trang chủ sections`, 1 bản ghi `home-sections` — `src/domain/landing.ts:25-67`, seed `src/server/cms/store.ts:91`.

## 2. Phân quyền — agent KHÔNG được phá

* Chỉ 1 role duy nhất: đăng nhập bằng `ADMIN_USERNAME/ADMIN_PASSWORD` (scrypt, cookie `seatrip_admin` 8h) — `src/server/cms/auth.ts:69-111`.
* Mọi API admin đều `requireSession(request)` + check `x-csrf-token` với POST — `src/server/cms/auth.ts:59-68`.
* Không có `SALES/EDITOR/REVIEWER`, không có xem IP công khai. Bảng `page_views` không lưu IP thô (riêng tư) — `src/server/cms/db.ts:23-25`, `src/server/analytics/store.ts:60-78`.
* `GET /api/admin/stats` yêu cầu session; `POST /api/track` public nhưng rate-limit `120/phút/IP`, lỗi trả `202` không ảnh hưởng UX — `src/app/api/track/route.ts:14-17`, `src/app/api/admin/stats/route.ts:8-15`.

Hệ quả train:
* Không tự chế thêm role/tab quyền.
* Không đưa IP/browser/city vào modal — schema hiện tại không có các cột đó.
* Không track `/admin`, không track bot.

## 3. Luồng dữ liệu end-to-end

```
PageViewTracker (client, public pages)
  -> POST /api/track (sendBeacon, keepalive fallback)
  -> recordView() (lọc bot/admin, normalize path/locale, classify source, INSERT page_views)
  -> Admin mở tab Tổng quan -> GET /api/admin/stats?days=7|14|30 -> Overview render KPI/chart
```

### 3.1 Thu thập client

File: `src/components/analytics/page-view-tracker.tsx:1-94`, mount ở `src/app/[locale]/layout.tsx:124`.

* Bỏ qua nếu `pathname.startsWith('/admin')`.
* Chống track trùng: `last` ref theo `pathname`.
* Payload: `{path, referrer, device, sessionId, visitorId}`.
  * `device` theo `window.innerWidth`: `<768 mobile, <1024 tablet, còn lại desktop`.
  * `sessionId`: `sessionStorage st_visit_sid`, random `s+base36`.
  * `visitorId`: first-party cookie `st_visitor_id`, `max-age=31536000, SameSite=Lax`.
* Gửi: ưu tiên `navigator.sendBeacon('/api/track')`, fallback `fetch keepalive`. Lỗi không throw ra UX.

### 3.2 Xử lý backend

File: `src/server/analytics/store.ts:8-78`, `src/app/api/track/route.ts:1-32`.

* Lọc bot regex `BOT` (`bot|crawl|spider|...|petalbot`).
* `normalizePath`: cắt `?`/`#`, tách locale `vi|en` ở segment đầu, chuẩn hoá `/`, bỏ `/` cuối.
* `normalizeReferrer`: chỉ giữ `hostname` lowercase, cắt 255 ký tự.
* `classifySource`: rỗng→`direct`, `google`, `facebook|fb.`, `zalo`, `tiktok`, `youtube`, `bing|coccoc|duckduckgo`→`search`, còn lại `referral`.
* `recordView()` INSERT vào `page_views(path,locale,referrer,source,device,session_id,visitor_id,created_at)` — không cột IP/UA.
* Lấy IP chỉ để rate-limit (`consumeLimit track:<ip> 120/phút`), không persist.

### 3.3 Truy vấn tổng hợp

`getStats(days)` — `src/server/analytics/store.ts:82-189`:

* Đọc `page_views` từ `startIso` (giờ server, so sánh chuỗi `YYYY-MM-DD`), cap 20000 rows mới nhất.
* Fill đủ ngày từ `today-(days-1)` → `today`, kể cả ngày 0 view.
* `visitors` = `COUNT DISTINCT COALESCE(visitor_id, session_id)`.
* `today.views/visitors/leads` cắt theo `YYYY-MM-DD` của server.
* `topPages` top 8 theo `path`; `sources/devices/locales` count theo nhóm.
* Leads từ bảng `leads` (500 mới nhất): `byStatus {new,contacted,qualified,won,lost}`, `todayLeads`.
* `pipeline` = tổng `priceFrom.amount` của tour có `slug` trùng `tourSlug/interest` của leads `won|qualified` — `decrypt()` từ `src/server/cms/leads.ts`, thiếu key thì bỏ qua. Giá đọc từ `records.tours.published`.
* `conversion = leads/visitors*100 (2 decimals)`, visitors=0 thì 0.

### 3.4 Client fetch

`src/features/admin/overview.tsx:73-104`: `fetch(/api/admin/stats?days=)` với header `x-csrf-token`, `days ∈ {7,14,30}` default `14`.

## 4. UI inventory chi tiết

### 4.1 Tab Tổng quan (Overview)

File: `src/features/admin/overview.tsx:1-220`.

* Toolbar: cụm period `7/14/30 ngày` (`aria-pressed`, `data-active`), nút `↻ Làm mới`.
* 4 KPI `.adm-kpis > .adm-kpi` (`src/app/admin/studio.css`):
  1. `Lượt xem hôm nay` / sub `Tổng N ngày: X`.
  2. `Người vào web hôm nay` / sub `Tổng khách: X`.
  3. `Leads hôm nay` / sub `Tổng: X · Chốt: Y`.
  4. `Tỉ lệ chốt` `{conversion}%` / sub `Pipeline: N ₫`.
  * Loading: `—`. Số `Intl.NumberFormat('vi-VN')`.
* Trend: SVG thuần `.adm-chart` (gradient `#e0005a`), không dùng lib chart. Nhãn `DD/MM`.
* `Top trang` + `Kênh đến` + `Thiết bị` (dịch `mobile→Điện thoại`): `.adm-bars` bar gradient `#e0005a→#ff7a3d`. Empty: `Chưa có dữ liệu.`
* `Kinh doanh`: list `byStatus` dịch `new→Mới, contacted→Đã liên hệ, qualified→Tiềm năng, won→Đã chốt, lost→Chưa phù hợp` + ghi chú pipeline ước tính.

### 4.2 Select dropdown đẹp (thay `<select>` native)

File: `src/features/admin/ui-select.tsx`, dùng trong `src/features/admin/editor.tsx:3,200-274`.

* `AdmSelect` (single): nút + popup search, `role=listbox/option`, `aria-selected`, thumb preview khi `singleKind=media` (`photoSrc/src/ogImage`), cảnh báo `(đang dùng)` khi value lạ. Dùng cho `parentId`, `src/ogImage/photoSrc`, `hotlineHref` (readonly auto).
* `AdmMultiSelect` (multi chip): dùng cho `categoryIds→categories`, `destinationIds→destinations`, `relatedTourSlugs→tours`. Hiện chip + nút `×`, ô tìm thêm, đếm `values.length`, cảnh báo `Có mã không tồn tại…` khi value lạ.
* CSS: `.adm-select/.adm-multiselect/.adm-chips/.adm-chip` — `src/app/admin/studio.css`.

### 4.3 Trang chủ sections (landing)

* Schema `src/domain/landing.ts:25-67`, default `src/domain/landing.ts:71+`.
* Đọc ở: `quick-finder.tsx:10-24` (suggestions), `journey-story.tsx:13-48,118-135` (trips + FAQ), `explore-section.tsx:7-34` (copy), `regions-section.tsx:12-45` (copy + moods), `values-section.tsx:8-38` (photo/badge).
* Sửa ở Admin tab `landing`, bản ghi `home-sections`: Lưu nháp → Xuất bản (thuộc nhóm system, không có Ẩn/Thùng rác) — `src/server/cms/store.ts:221`, `src/features/admin/dashboard.tsx:1227,1283,1361`.

### 4.4 SĐT / liên hệ (yêu cầu cứng)

* Admin sửa ở tab `Website & footer → Thông tin liên hệ → Hotline (SĐT hiển thị + nút gọi)` — `src/features/admin/editor.tsx:119-121`.
* Server tự chuẩn hoá `hotlineHref = normalizeHotlineHref(hotline)` (`0xxx→tel:+84xxx`) nên admin chỉ cần sửa 1 ô SĐT — `src/server/cms/store.ts:19-36,163-180`.
* Web đọc qua `siteConfig.contact` (proxy `settings()`) → header/footer/floating-contact/Zalo dùng đúng số mới ngay sau Xuất bản — `src/config/runtime-site.ts:8-15`, `src/app/[locale]/layout.tsx:112-117`.

## 5. Anti-hallucination rules (bắt buộc)

1. Không bịa KPI: mọi số từ `GET /api/admin/stats`. Empty giữ nguyên câu `Chưa có dữ liệu.`
2. Không đổi ngữ nghĩa: `views` = số row `page_views`; `visitors` = distinct visitor/session; `conversion = leads/visitors`.
3. Không track `/admin`, không track bot. Không bỏ rate-limit track.
4. Ngày hiển thị `DD/MM`, số `vi-VN`, tiền `₫`.
5. UI giữ `studio.css` + brand `#e0005a`. Không thêm lib chart, không Unsplash trong admin.
6. Không tự thêm cột IP/UA/geo vào `page_views` khi chưa có migration + docs bảo mật.

## 6. Prompt examples để kiểm tra agent mới

* `P1 — KPI:` `Vẽ 4 KPI Lượt xem/Khách/Leads/Tỉ lệ chốt + pipeline VND. Dữ liệu GET /api/admin/stats?days=14. Không hardcode.`
* `P2 — Select:` `categoryIds dùng AdmMultiSelect chip + search từ references.categories; value lạ giữ lại + cảnh báo.`
* `P3 — Landing:` `Sửa gợi ý QuickFinder ở tab Trang chủ sections (landing/home-sections), xuất bản là web đổi.`
* `P4 — SĐT:` `Đổi Hotline ở settings/site, hotlineHref tự chuẩn hoá tel:+84, nút gọi/Zalo/footer đổi theo.`
* `P5 — Tracking:` `PageViewTracker chỉ gửi khi đổi pathname, bỏ /admin, payload sessionId + visitorId, sendBeacon trước fetch-keepalive.`

Tiêu chí pass: đúng cả 5 mà không vi phạm mục 5.

## 7. File tham chiếu nhanh

* Frontend: `src/features/admin/dashboard.tsx:26,225,733-735`, `src/features/admin/overview.tsx`, `src/features/admin/ui-select.tsx`, `src/features/admin/editor.tsx`, `src/components/analytics/page-view-tracker.tsx`, `src/app/[locale]/layout.tsx:124`.
* Backend: `src/app/api/track/route.ts`, `src/app/api/admin/stats/route.ts`, `src/server/analytics/store.ts`, `src/server/cms/db.ts:23-25`, `src/server/cms/store.ts:19-36,80-91,163-180,403-406`.
* Domain: `src/domain/landing.ts`, `src/domain/lead.ts:104-105,147-162`, home sections `src/features/home/*.tsx`.
