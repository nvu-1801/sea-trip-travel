# Kế hoạch & kiến trúc khu quản trị SEA TRIP TRAVEL

Tài liệu này mô tả **khu quản trị (admin/CMS) đã được triển khai** cho website Sea
Trip Travel: kiến trúc, schema, API, xác thực, upload, xuất bản và cách vận hành.
Bản kế hoạch ban đầu nằm trong `docs/admin-roadmap.md` (đã cập nhật trạng thái).

- Baseline nhánh nền: `feat/travel-soft-motion` @ `95c9512975b2752ad58d7a34fdae8ccaf87217e8`
- Nhánh triển khai: `feat/tour-admin`
- Phạm vi: một tài khoản ADMIN, không nhân viên, không phân quyền nhiều cấp,
  không đăng ký công khai, không thanh toán/booking.

---

## 1. Kiến trúc hiện có & phần tái sử dụng

MVP trước đó đã chuẩn bị sẵn ranh giới dữ liệu để chuyển nguồn mà không sửa UI:

```
Hôm nay (trước):  UI → lib/data → content/*.ts
Sau khi triển khai: UI → lib/data → SQLite (hoặc HTTP tới backend)
```

| Thành phần | Xử lý | Vì sao |
| --- | --- | --- |
| `domain/*` (Zod schema) | **Dùng lại nguyên vẹn** | Là hợp đồng. Admin ghi/đọc đều đi qua schema này |
| `components/ui/*`, `features/*` | **Dùng lại nguyên vẹn** | Nhận props đã qua projection; không biết nguồn dữ liệu |
| `lib/data/*` | **Đổi phần thân, giữ chữ ký** | Trước đọc file TS, nay đọc snapshot từ SQLite; hàm trở thành `async` |
| `lib/format.ts`, `lib/seo.ts`, `lib/json-ld.ts`, `lib/sanitize.ts` | **Dùng lại nguyên vẹn** | Thuần tuý |
| `server/email/*`, `server/leads/*` | **Dùng lại, mở rộng** | Lead nay lưu DB trước khi gửi email |
| Auth, CMS, DB, upload | **Bổ sung mới** | Trước đây cố tình không có |

### Bổ sung mới

| Thành phần | File |
| --- | --- |
| SQLite + migration | `src/server/db/{connection,migrate,schema,json,tx,bootstrap,import-content}.ts` |
| Repository | `src/server/repo/{tours,articles,taxonomy,translations,settings,media,leads,admin,redirects,mappers,types}.ts` |
| Xác thực | `src/server/auth/{password,tokens,session,guard}.ts` |
| Upload/ảnh | `src/server/media/service.ts` |
| Server Actions | `src/server/admin/{actions,action-state}.ts` |
| Snapshot công khai + cache | `src/lib/data/{snapshot,localize,tours,articles,categories,destinations,settings}.ts` |
| API | `src/app/api/{public/content,admin/media}/route.ts`, `src/app/media/[id]/[variant]/route.ts` |
| Admin UI | `src/app/(admin)/**`, `src/components/admin/**` |
| CLI | `scripts/{admin,db-migrate,import-content}.ts` |
| Kiểm thử | `tests/{helpers,search,admin-auth,db-content}.test.ts` |

---

## 2. Quyết định kiến trúc

### 2.1 SQLite trên VPS, frontend có thể ở Vercel

Một codebase, hai profile triển khai, chọn bằng `CONTENT_SOURCE`:

```
CONTENT_SOURCE=sqlite  → VPS: website + ADMIN + public API + ghi DB + upload.
                         (mặc định; dùng cho local và VPS)
CONTENT_SOURCE=remote  → Vercel/edge: chỉ website công khai. Đọc nội dung đã
                         xuất bản từ CONTENT_API_BASE_URL. /admin bị vô hiệu.
```

- **SQLite là nguồn sự thật**, đặt trên ổ đĩa bền vững của VPS (`DATABASE_PATH`).
- **Ảnh không nằm trong SQLite**: file thật ở `UPLOAD_DIR`; DB chỉ lưu metadata
  (kích thước, mime, sha256, biến thể).
- **Không đặt SQLite hoặc ảnh upload trong filesystem tạm của Vercel Functions.**
  Vercel ở chế độ `remote` không mở DB và không nhận upload.
- Admin + API ghi **cùng origin** với nhau (trên VPS) ⇒ cookie same-origin, không
  cần CORS, không cần `SameSite=None`.

### 2.2 Ghi dữ liệu bằng Server Actions

Mutation của admin dùng **Server Actions** (Next 16) vì có sẵn kiểm tra Origin/Host
chống CSRF và tự làm mới UI. Riêng **upload** dùng Route Handler vì Server Actions
giới hạn body ~1 MB, còn ảnh ở đây tới 10 MB.

Mọi Server Action **tự kiểm tra phiên đăng nhập** (`requireAdmin()`), không dựa vào
việc “UI chỉ hiện cho admin”.

### 2.3 Cache & revalidation rõ ràng

Toàn bộ nội dung công khai đọc qua **một** điểm duy nhất:

```ts
// src/lib/data/snapshot.ts
export async function loadPublishedSnapshot(): Promise<ContentSnapshot> {
  "use cache";
  cacheLife("minutes");
  cacheTag("content");   // ← một tag duy nhất
  ...
}
```

Sau mỗi thay đổi (xuất bản, ẩn, sửa, xoá mềm, đổi cấu hình) admin gọi:

```ts
updateTag("content");   // trong Server Action → hiệu lực ngay lập tức
```

Trang public vì thế vẫn là **static shell + tag cache 1 phút**, và luôn cập nhật
sau khi bấm Lưu. Chi tiết: mục 6.

Vì snapshot là cached, các hàm đọc trong `lib/data` **không** cần `'use cache'`
riêng — một tag, một quy tắc vô hiệu hoá, dễ giải thích và khó quên.

---

## 3. Schema database (SQLite)

Nguyên tắc: cột cho kiểu vô hướng, **JSON text cho mảng thuộc sở hữu một bản ghi**,
**bảng nối cho quan hệ nhiều-nhiều**, không bao giờ hard-delete trong lượt này.

| Nhóm | Bảng |
| --- | --- |
| Hạ tầng & auth | `schema_migration`, `admin_user`, `admin_session`, `login_attempt`, `admin_audit` |
| Danh mục/điểm đến | `category`, `destination` |
| Tour | `tour`, `tour_image`, `tour_itinerary_day`, `tour_pricing_option`, `tour_category`, `tour_destination` |
| Bài viết | `article`, `article_block`, `article_destination`, `article_tour` |
| Bản dịch | `content_translation` (entity_type, entity_id, locale, source_updated_at, status, payload) |
| Ảnh | `media` (storage `static`/`upload`, url, mime, bytes, width, height, sha256, variants) |
| SEO/redirect | `slug_redirect` |
| Lead | `lead`, `lead_note` |
| Cấu hình site | `site_setting` |

Các bất biến được **thực thi ở tầng ghi** chứ không chỉ ở UI:

1. **Giá**: `tour.price_amount` luôn = giá người lớn thấp nhất trong
   `tour_pricing_option` khi bảng giá không rỗng (`saveTour`). Không có bảng giá ⇒
   `NULL` ⇒ UI hiển thị **“Liên hệ tư vấn”**, **không bao giờ 0 ₫**.
2. **Slug**: là bất biến. Đổi slug tự động sinh bản ghi `slug_redirect` (301).
3. **Xoá mềm**: `deleted_at`; thùng rác + khôi phục; không xoá vĩnh viễn.
4. **Trạng thái**: `draft` | `published` | `hidden`. Chỉ `published` và
   `deleted_at IS NULL` mới vào snapshot công khai.
5. **Bản dịch cũ**: overlay `en` chỉ áp dụng khi `source_updated_at` khớp
   `updated_at` của bản nguồn — dữ liệu mới không bị bản dịch cũ ghi đè.
6. **Tìm kiếm**: `tour.search_text` lưu chuỗi đã bỏ dấu (NFD + strip + `đ→d`).

Migrations là **append-only**: `src/server/db/schema.ts` → `MIGRATIONS`, chạy bởi
`runMigrations()` (ghi vào `schema_migration`, chạy lại là no-op).

---

## 4. API

| Route | Phương thức | Bảo vệ | Mục đích |
| --- | --- | --- | --- |
| `/api/leads` | POST | công khai + honeypot + rate limit + idempotency | Nhận yêu cầu tư vấn; **lưu DB trước**, gửi email sau |
| `/api/public/content` | GET | công khai, chỉ dữ liệu published | Snapshot JSON cho frontend ở chế độ `remote` |
| `/api/admin/media` | POST | phiên admin + same-origin | Upload ảnh (multipart, ≤10 MB) |
| `/media/[id]/[variant]` | GET | công khai | Phục vụ ảnh upload (immutable cache) |
| Server Actions `/admin/*` | POST | phiên admin (tự kiểm tra) | Toàn bộ mutation nội dung |

Hợp đồng lead không đổi (`LeadResponse`, mã lỗi `LEAD_ERROR_CODES`). Thay đổi duy
nhất: khi email lỗi/chưa cấu hình, phản hồi vẫn là 4xx/5xx **nhưng lead đã được lưu**
và thông điệp nói rõ “yêu cầu đã được ghi nhận”.

---

## 5. Xác thực & bảo vệ admin

- **Một tài khoản**, tạo bằng CLI, không đăng ký công khai, không seed mặc định.
- **Mật khẩu**: `scrypt` (`node:crypto`), định dạng tự mô tả
  `scrypt$N$r$p$salt$hash`, so sánh `timingSafeEqual`. Không thêm native dependency.
- **Phiên**: token 32 byte ngẫu nhiên; DB chỉ lưu **sha256** của token; cookie
  `httpOnly`, `sameSite=lax`, `secure` khi production, TTL 12 giờ.
- **Chống brute force**: 5 lần / 15 phút theo `username + IP hash` (bảng
  `login_attempt`), có `retryAfterSeconds`.
- **CSRF**: Server Actions tự kiểm tra Origin; Route Handler ghi kiểm tra thêm
  `isSameOriginRequest()` (`Origin`/`Sec-Fetch-Site`).
- **Thu hồi phiên**: logout thu hồi phiên hiện tại; đổi mật khẩu thu hồi **mọi**
  phiên khác.
- **Chống XSS lưu trữ**: nội dung bài viết là **union block có cấu trúc**, không có
  `dangerouslySetInnerHTML` ở bất kỳ đâu; mọi text đi qua React (tự escape).
- **Không ghi log PII/mật khẩu/token**: log chỉ có request id, loại sự kiện, số
  người nhận.

---

## 6. Upload & thư viện ảnh

1. Kiểm tra dung lượng (≤ `MEDIA_MAX_BYTES`, mặc định 10 MB) **trước khi** giải mã.
2. Xác định **định dạng thật** bằng `sharp.metadata()`; chỉ nhận `jpeg`/`png`/`webp`.
   Không tin `Content-Type` hay phần mở rộng.
3. Tên tệp do server sinh (`original.<ext>`), ảnh gốc lưu theo `sha256` ⇒ không thể
   thoát thư mục; upload trùng nội dung tự dùng lại bản ghi.
4. Biến thể **WebP**: banner 1920×1080, bìa 1200×800, nội dung rộng 1600, thumb
   480×320. **Không phóng to** ảnh nhỏ (`withoutEnlargement`).
5. Xoá ảnh **bị chặn** nếu còn tham chiếu (ảnh tour, ảnh bìa bài viết, block ảnh,
   cấu hình trang chủ) — trả về danh sách nơi đang dùng.
6. **28 ảnh khách đã cho phép** được đăng ký ở `storage='static'` với URL
   `/images/tours/...` **nguyên vẹn** — không copy, không đổi tên, không hỏng URL.

---

## 7. Xuất bản, cache & chuyển dữ liệu

- **Import** (`src/server/db/import-content.ts`): đọc `src/content/*` +
  `src/content/locales/en/*`, upsert theo `id`/`slug`, chạy lại **không trùng**,
  giữ slug/URL, ảnh, bảng giá, lịch trình và song ngữ. 28 ảnh được đăng ký vào
  thư viện.
- **Publish/ẩn**: chỉ đổi `status`; snapshot công khai tự loại phần không published.
- **Revalidation**: `updateTag("content")` sau mỗi mutation (xem §2.3). Với bản
  triển khai tách Vercel, `revalidateTag("content","max")` là cơ chế cho instance
  không sở hữu DB.
- **Lỗi backend**: nếu đọc DB lỗi, trang public **throw** (500) — không âm thầm trả
  snapshot cũ như thể là mới, và không bao giờ lộ bản nháp.
- **Không mock/localStorage**: không có nhánh nào biến localStorage thành database.

---

## 8. Giao diện admin

- Route group `(admin)` **ngoài** `[locale]`; URL tiếng Việt không dấu `/admin/...`;
  `proxy.ts` loại trừ `/admin`, `/media`, `/api` khỏi rewrite locale.
- `noindex`, `nocache` cho toàn bộ khu admin.
- Bố cục: header (logo, user, đăng xuất) + sidebar (desktop) / menu (mobile) +
  vùng nội dung. Dùng lại token thiết kế của website (hồng thương hiệu, Be Vietnam
  Pro) nên admin đồng bộ nhận diện.
- Mọi danh sách có: bảng, tìm kiếm, lọc theo trạng thái, phân trang/giới hạn,
  trạng thái rỗng, và thao tác có xác nhận cho hành động phá huỷ.
- Dashboard dùng **dữ liệu thật**: số tour/bài viết published, số nháp, số lead
  theo trạng thái, số ảnh, tour cập nhật gần đây, nhật ký thao tác (`admin_audit`).

Các màn: Đăng nhập · Tổng quan · Tour (danh sách/thêm/sửa) · Bài viết
(danh sách/thêm/sửa) · Thư viện ảnh · Yêu cầu tư vấn (danh sách/chi tiết) ·
Trang chủ & liên hệ · Tài khoản.

---

## 9. Giai đoạn triển khai & tiêu chí nghiệm thu

| # | Giai đoạn | Đầu ra | Tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| P0 | Nhánh & an toàn dữ liệu | `feat/tour-admin` từ `95c9512` | WIP được bảo toàn (stash + backup); 28 ảnh & nội dung còn nguyên |
| P1 | Nền tảng DB | schema, migrate, repo | `db:migrate` idempotent; repo round-trip có test |
| P2 | Import & media | `import-content.ts` | Chạy 2 lần không tạo trùng; 28 ảnh URL gốc nguyên vẹn |
| P3 | Chuyển `lib/data` + cache | snapshot + `content` tag | Trang public vẫn render; sửa nội dung → landing cập nhật |
| P4 | Xác thực | scrypt, session, CLI | Login/logout/đổi/reset; API chưa login bị chặn; rate limit |
| P5 | Khung admin | layout + nav + primitives | VI; responsive; loading/empty/error/success/confirm |
| P6 | Quản lý tour | list/form/actions | Đủ trường; slug trùng chặn; draft/publish/hidden; soft delete |
| P7 | Quản lý bài viết | editor block | Nháp không lọt public/API; ghim + thứ tự; soft delete |
| P8 | Thư viện ảnh | uploader + quản lý | MIME thật; >10 MB bị chặn; không upscale; chặn xoá ảnh đang dùng |
| P9 | Lead | ghi DB + admin inbox | Form lưu thật; trạng thái + ghi chú; submit lặp không nhân bản |
| P10 | Cấu hình trang chủ | settings | Hero/liên hệ/social/nổi bật cập nhật landing |
| P11 | Tìm kiếm nhanh | search không dấu | Không dấu khớp có dấu; tour chưa giá không tính là 0 ₫ |
| P12 | API công khai + `remote` | public content API | Chỉ published; `remote` render được không cần DB |
| P13 | Kiểm thử & tài liệu | 3 tài liệu admin + `.env.example` | lint/typecheck/test/build xanh; ghi rõ phần chưa xác minh |
| P14 | Commit & push | nhánh `feat/tour-admin` | Chỉ stage file thuộc tác vụ; SHA remote khớp HEAD |

---

## 10. Cấu hình local, production, backup & khôi phục

### Local

```bash
cp .env.example .env.local      # không commit
npm install
npm run db:setup                # migrate + import (idempotent)
npm run admin -- create-admin --username admin
npm run dev
```

### Production (VPS)

1. Node 22+ (cần `node:sqlite`), reverse proxy HTTPS (Caddy/Nginx).
2. `CONTENT_SOURCE=sqlite`, `DATABASE_PATH` và `UPLOAD_DIR` trỏ vào ổ bền vững
   (ví dụ `/var/lib/seatrip/data.db` và `/var/lib/seatrip/uploads`).
3. `ADMIN_SESSION_SECRET` ngẫu nhiên dài; `NEXT_PUBLIC_SITE_URL` là domain thật.
4. `npm ci && npm run db:setup && npm run build && next start`.
5. Cron: `sqlite3 ... ".backup"` + `rsync` thư mục upload; xem `docs/ADMIN-SETUP.md`.

### Production (Vercel – chỉ frontend)

- `CONTENT_SOURCE=remote`, `CONTENT_API_BASE_URL=https://<vps>`; **không** đặt
  `DATABASE_PATH`/`UPLOAD_DIR`. `/admin` báo “không khả dụng” (đúng thiết kế).

### Backup & khôi phục

- DB: `sqlite3 data.db ".backup backup.db"` (an toàn khi đang chạy, WAL).
- Ảnh: `rsync -a data/uploads/ backup/uploads/`.
- Khôi phục: dừng app → thay file DB + thư mục uploads → khởi động lại.
- Vì `slug`, `id` và URL ảnh tĩnh là bất biến, khôi phục backup **không** làm hỏng
  URL nào.

---

## 11. Ngoài phạm vi (cố ý)

Thanh toán/đặt tour trực tuyến, nhiều tài khoản & phân quyền, đăng ký nhận tin
marketing, page builder, xoá vĩnh viễn, đa ngôn ngữ thứ ba. Xem `docs/admin-roadmap.md`.
