# Báo cáo kiểm chứng khu quản trị

Ghi lại **thay đổi**, **lệnh kiểm tra**, **kết quả thật** và **phần chưa xác minh**.
Mọi lệnh dưới đây chạy được lặp lại.

Môi trường: Windows 11, Node `v22.21.0`, npm `10.9.4`, Next.js `16.4.0` (Turbopack),
`cacheComponents: true`.

---

## 1. Thay đổi chính

| Nhóm | Nội dung |
| --- | --- |
| Nền tảng DB | `src/server/db/*` (connection, schema, migrate, tx, json, bootstrap, import-content) |
| Repository | `src/server/repo/*` (tours, articles, taxonomy, translations, settings, media, leads, admin, redirects, mappers, types) |
| Xác thực | `src/server/auth/*` (password, tokens, cookie-name, session, guard) |
| Upload | `src/server/media/service.ts`, `src/app/media/[id]/[variant]/route.ts`, `src/app/api/admin/media/route.ts` |
| Server Actions | `src/server/admin/actions.ts`, `action-state.ts` |
| Dữ liệu công khai | `src/lib/data/snapshot.ts` + đổi `lib/data/*` sang `async`, giữ chữ ký |
| API công khai | `src/app/api/public/content/route.ts` |
| Admin UI | `src/app/(admin)/**`, `src/components/admin/**` |
| CLI | `scripts/admin.ts`, `scripts/db-migrate.ts`, `scripts/import-content.ts`, `scripts/verify-admin.mjs` |
| Kiểm thử | `tests/helpers.ts`, `tests/search.test.ts`, `tests/admin-auth.test.ts`, `tests/db-content.test.ts` |
| Cấu hình | `next.config.ts` (`serverExternalPackages`, `images.localPatterns`), `src/proxy.ts` (chặn `/admin`), `.gitignore` (`/data/`), `.env.example` |
| Hợp đồng domain | `src/domain/tour.ts` (mở rộng `pricingOptions`), `src/domain/settings.ts`, `src/domain/admin.ts` |

---

## 2. Lệnh kiểm tra tĩnh & đơn vị

```bash
npm run lint        # eslint
npm run typecheck   # next typegen && tsc --noEmit
npm test            # node --test (11 tệp)
npm run build       # next build (Turbopack)
```

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run lint` | ✅ 0 lỗi, 0 cảnh báo |
| `npm run typecheck` | ✅ 0 lỗi |
| `npm test` | ✅ **162/162** (trước khi thêm test admin: 133) |
| `npm run build` | ✅ Thành công; 43 trang tĩnh/PPR; toàn bộ `/admin/**`, `/media/**`, `/api/**` ở chế độ **Dynamic (ƒ)** |

Ghi chú build:
- `sharp` phải khai báo `serverExternalPackages` (native module). Nếu không,
  Turbopack cố tạo junction trong `.next/node_modules` và build đỏ trên Windows.
- Admin pages khai báo `export const instant = false` **và** `await connection()` ở đầu
  mỗi trang. Thiếu `connection()` sẽ sinh cảnh báo
  `Next.js encountered the unstable value new Date() while prerendering` dù trang
  không gọi `new Date()` (Next vẫn cố dựng static shell).

### Test mới có ý nghĩa gì

| Tệp | Nội dung |
| --- | --- |
| `tests/search.test.ts` | Bỏ dấu tiếng Việt: `Quy Nhom` khớp `Quy Nhơn`, `đ→d`, token khớp |
| `tests/admin-auth.test.ts` | scrypt hash/verify (salt khác nhau mỗi lần), policy mật khẩu, token/phiên (chỉ lưu hash, hết hạn, thu hồi “all but this”), đếm và xoá login attempt |
| `tests/db-content.test.ts` | Vòng đời tour (publish/hide, soft delete/restore), giá “liên hệ” không thành 0 ₫, **priceFrom = min(gói)**, sinh redirect khi đổi slug, bài viết draft không lọt published, block round-trip, settings round-trip, lead + trạng thái + ghi chú, đếm tham chiếu ảnh |

---

## 3. Kiểm chứng HTTP trên bản production

```bash
npm run build
npx next start -p 3001
BASE_URL=http://localhost:3001 ADMIN_COOKIE=<cookie> node scripts/verify-admin.mjs
```

Kết quả (đã chạy thật): **26/26 PASS**

```
[PASS] GET / → 200                                       [PASS] GET /en → 200
[PASS] GET /tour-quy-nhon-phu-yen → 200                  [PASS] GET /cam-nang-du-lich → 200
[PASS] GET /sitemap.xml → 200                            [PASS] GET /robots.txt → 200
[PASS] GET /admin → 307 /admin/login                     [PASS] GET /admin/tours → 307 /admin/login
[PASS] GET /admin/media → 307 /admin/login               [PASS] GET /admin/login renders the sign-in card
[PASS] GET /api/public/content → 200                     [PASS] public content carries published tours — 22 tours
[PASS] public content has no drafts or trashed records   [PASS] GET /media/<unknown> → 404
[PASS] POST /api/leads rejects an invalid payload with field errors — status=400
[PASS] POST /api/leads silently drops a honeypot hit — status=200
[PASS] POST /api/admin/media without a session → 401
[PASS] GET /admin|tours|articles|media|leads|settings|account|tours/new|articles/new → 200 và render UI admin
```

### Kiểm chứng bổ sung đã chạy tay

| Hạng mục | Lệnh | Kết quả |
| --- | --- | --- |
| Import idempotent | `npm run db:import` ×2 | Lần 1: 8 danh mục, 19 điểm đến, 22 tour, 5 bài viết, 54 bản dịch, 28 ảnh. Lần 2: **0 inserted**, 8/19/22/5/54 updated, 28 ảnh skipped |
| Tạo admin | `ADMIN_PASSWORD=… npm run admin -- create-admin --username admin` | ✅ “Đã tạo tài khoản admin”; `list` hiển thị tài khoản |
| Upload hợp lệ | `curl -F file=@public/images/tours/…jpg` + cookie + `Origin` | ✅ 200; biến thể banner/cover/large **600×320** (nguồn 600×320 → **không phóng to**), thumb 480×320; `cover` trả `image/webp`, `original` trả `image/jpeg` |
| Upload sai định dạng | tệp text đổi tên `.jpg` | ✅ `{"ok":false,"error":"Không đọc được ảnh."}` |
| Upload không đăng nhập | không cookie | ✅ 401 |
| Upload khác origin | `Origin: http://evil.example` | ✅ 403 |
| Lead lưu DB trước email | `POST /api/leads` (SMTP chưa cấu hình) | ✅ `MAIL_NOT_CONFIGURED` + “Yêu cầu đã được ghi nhận…” + `requestId`; lead **vẫn** xuất hiện trong `/admin/leads` |
| Chống submit lặp | cùng `submissionId` gửi 2 lần | ✅ Cùng `requestId`; log `[lead] duplicate submission ignored`; **không** tạo bản ghi thứ hai |
| Honeypot | `company: "spam"` | ✅ 200 giả, **không** lưu lead, log `honeypot triggered` |
| Trang admin phản ánh DB | đặt tour `hidden` rồi tải `/admin/tours?status=hidden` và `?status=published` | ✅ Xuất hiện ở danh sách ẩn, **không** ở danh sách đã xuất bản |
| API công khai chỉ published | đặt `hidden` rồi gọi `/api/public/content` | ✅ Số tour published giảm 22 → 21 → 22 khi khôi phục |
| Ảnh tĩnh không hỏng URL | đăng ký 28 ảnh | ✅ `storage='static'`, URL `/images/tours/...` nguyên vẹn |

---

## 4. Những gì CHƯA xác minh (ghi rõ, không báo pass)

1. **Click-through trên trình duyệt thật không chạy được** trong phiên này:
   công cụ browser báo *“No desktop browser is connected to this session”*. Vì vậy các
   luồng **qua UI** (đăng nhập bằng form, sửa tour rồi bấm Lưu, upload kéo–thả, xác nhận
   hộp thoại, responsive 360/390px, keyboard focus) **chưa** được kiểm bằng mắt.
   Phần tương ứng đã được kiểm ở tầng HTTP + repository + unit test.
2. **`npm run verify:ui` (Playwright) của website cũ chưa chạy lại** trong phiên này.
   Nó cần Chromium tải được; môi trường này chặn `fonts.gstatic.com`, và `next dev`
   không render được trang nào (lỗi font), nên kiểm thử dev-server không dùng được.
   Bản production (`next start`) thì chạy đúng vì font đã đóng gói sẵn.
3. **Đường Server Action → `updateTag`**: đã kiểm bằng đọc mã (mọi action gọi
   `updateTag("content")`) và bằng kiểm chứng cơ chế tag qua một endpoint tạm dùng
   `revalidateTag(tag, "max")` (endpoint đã gỡ). Chưa gọi trực tiếp Server Action bằng
   HTTP để đo độ trễ hiển thị sau khi xuất bản.
4. **Gửi email thật** (SMTP Gmail) và **thư vào hộp thư** vẫn phụ thuộc domain/SPF/DKIM
   — ngoài phạm vi phiên này, như trước đây.
5. **SQLite nhiều tiến trình**: chạy một instance. Nếu scale nhiều bản ghi cùng file DB
   trên nhiều máy, cần một backend thật (Postgres) hoặc một tiến trình ghi duy nhất.
6. **`node:sqlite` là API thử nghiệm** của Node 22 → log có `ExperimentalWarning`.
   API ổn định nhưng có thể đổi ở Node tương lai; nâng cấp Node cần chạy lại kiểm thử.

---

## 5. Rủi ro còn lại

| Rủi ro | Mức | Ghi chú |
| --- | --- | --- |
| Chưa click-through UI | Trung bình | Đã phủ bằng HTTP + unit; nên chạy `verify:ui` khi có Chromium |
| `updategTag` chỉ làm mới instance sở hữu DB | Thấp | Với mô hình Vercel + VPS, nội dung mới đến trong lần đọc kế tiếp |
| `node:sqlite` experimental | Thấp | Không có dependency native; dễ thay bằng `better-sqlite3` nếu cần |
| Migration chưa có công cụ rollback | Thấp | Chỉ thêm bảng/cột; khôi phục bằng backup |
| Ảnh tĩnh chưa có width/height trong DB | Thấp | Vẫn phục vụ đúng URL; thêm sau khi nhập siêu dữ liệu |

---

## 6. Đợt 2 — sửa lỗi & thùng rác (17/10/2026)

Kế hoạch: `docs/ADMIN-IMPROVEMENT-PLAN.md`. Đã chạy lại toàn bộ kiểm tra.

```bash
npm run lint        # ✅ 0 lỗi, 0 cảnh báo
npm run typecheck   # ✅ 0 lỗi
npm test            # ✅ 169/169  (thêm tests/admin-workflows.test.ts)
npm run build       # ✅ thành công; /admin/trash là Dynamic (ƒ)
BASE_URL=http://localhost:3001 ADMIN_COOKIE=… node scripts/verify-admin.mjs   # ✅ 27/27
```

### Kiểm chứng theo từng lỗi

| # | Cách kiểm | Kết quả |
| --- | --- | --- |
| B1 | Đặt hotline `0911222333` trong `site_settings`, đợi cửa sổ cache rồi tải `/`, `/en`, `/lien-he`, `/en/lien-he`, `/chinh-sach-bao-mat` | ✅ Cả 5 trang hiển thị hotline mới; hotline cũ `0969 297 064` **không còn xuất hiện** ở đâu (kể cả JSON-LD). Unit test cũng khẳng định `getSiteSettings("en").contact.hotline` = giá trị VI, còn `hero` vẫn tách theo ngôn ngữ |
| B2 | Đặt 1 tour `hidden` + ghim + `sortOrder=4242` → `importContent()` | ✅ Sau import vẫn `hidden`/ghim/4242; bản ghi khác vẫn `published`. Tour đã ở thùng rác **không** bị khôi phục |
| B3 | Giữ `priceFrom` khi `pricingOptions` rỗng | ✅ Sửa ở action (giữ giá cũ); repo cũng đảm bảo không bao giờ ghi 0 ₫ |
| B4 | Upload 1 PNG → xoá mềm → upload lại cùng tệp | ✅ Cùng `id`, `restored: true`, bản ghi ra khỏi thùng rác, biến thể WebP được tạo lại |
| B5 | Tour 3 ngày nhưng 2 ngày lịch trình | ✅ Action trả lỗi “Cần đúng 3 ngày lịch trình…”, không ghi DB |
| B6 | Slug rỗng cho tour/bài viết | ✅ Schema chấp nhận slug rỗng; vẫn từ chối slug có dấu/khoảng trắng |
| B7 | Trang danh sách tour | ✅ Bộ đếm dùng `countToursByState` + `countTrashedTours` (một truy vấn mỗi loại) |
| B8 | Xoá mềm lead → mở `/admin/trash` | ✅ Lead xuất hiện trong thùng rác (HTTP 200, có `requestId`); có nút Khôi phục; xoá tour/bài viết/ảnh cũng vào đây |
| B9 | `isAdminEnabled()` sai | ✅ Layout render thông báo “Khu quản trị không khả dụng” |

### Vẫn chưa xác minh ở đợt 2

- Click-through trên browser thật vẫn không chạy được (không có desktop browser kết
  nối trong phiên này). Các thao tác qua Server Action (bấm Lưu, Khôi phục) được kiểm
  ở tầng repository/HTTP + unit test, **chưa** bấm tay trên trình duyệt.
- `PostalAddress` trong JSON-LD còn dùng thành phần địa chỉ có cấu trúc từ
  `config/site.ts` (telephone/email/sameAs đã theo settings).

---

## 7. Đợt 3 — sửa build Vercel (17/10/2026)

**Triệu chứng từ log deploy Vercel:** `next build` đỏ ở bước
`Collecting page data`:

```
⨯ Error: no such table: content_translation
    at src/server/repo/translations.ts:43
Error: Failed to collect page data for /[locale]/cam-nang-du-lich/[slug]
```

**Nguyên nhân:** máy build của Vercel không có file SQLite (đúng — `data/` bị
gitignore), và `instrumentation.ts` **không chạy trong build worker**, nên
`getDb()` mở một file rỗng rồi truy vấn ngay ⇒ `no such table`.

**Cách sửa:** `connection.ts` chạy migration ngay khi mở kết nối;
`ensureLocalDatabase()` (memoised) tạo schema + seed nội dung trước lần đọc đầu tiên;
`outputFileTracingIncludes` mang `./data` theo output; `isAdminEnabled()` tự tắt admin
khi `VERCEL=1` (filesystem deployment là chỉ đọc).

**Kiểm chứng (mô phỏng đúng môi trường Vercel: xoá `data/` + `.next`, `VERCEL=1`, không
đặt biến môi trường nào):**

```bash
rm -rf data .next
VERCEL=1 npm run build
```

| Kiểm tra | Kết quả |
| --- | --- |
| Build | ✅ `Compiled successfully`; `Generating static pages (85/85)` |
| DB tự tạo | ✅ `data/sea-trip.db` (+ WAL) được tạo trong lúc build |
| Nội dung thật | ✅ Trang tour prerender ~230 KB (`.next/server/app/vi/tour/quy-nhon-ky-co-eo-gio-1-ngay.html`) |
| `GET /` (chạy `next start` với `VERCEL=1`) | ✅ 200, HTML chứa tour thật |
| `GET /api/public/content` | ✅ 200, có `tours` |
| `/admin` khi `VERCEL=1` | ✅ `/admin/login` hiện “Khu quản trị không khả dụng”, **không** hiện form đăng nhập |
| Không còn cảnh báo trace | ✅ Không còn `Dynamic filesystem access causes tracing of the whole project` |
| Sau đó chạy lại bình thường (không `VERCEL`) | ✅ `npm test` 169/169 · build xanh · `verify:admin` 27/27 |

### Chưa xác minh

- Chưa deploy thật lên Vercel trong phiên này (không có quyền/không có VPS). Kiểm
  chứng trên là mô phỏng chính xác các điều kiện gây lỗi: thiếu DB, `VERCEL=1`,
  không biến môi trường.
- Chế độ `CONTENT_SOURCE=remote` **đọc API trong lúc build**; chưa kiểm với một backend
  thật đang chạy.


