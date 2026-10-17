# Vận hành khu quản trị SEA TRIP TRAVEL

Hướng dẫn cài đặt, cấu hình và backup cho khu quản trị (SQLite + upload ảnh).
Kiến trúc và quyết định thiết kế: `docs/ADMIN-IMPLEMENTATION-PLAN.md`.

Yêu cầu: **Node.js 22+** (cần `node:sqlite`). Đã kiểm thử với Node `v22.21.0`.

---

## 1. Biến môi trường

Sao chép `.env.example` → `.env.local` (không commit). Các biến của khu quản trị:

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `CONTENT_SOURCE` | không | `sqlite` | `sqlite` = instance sở hữu DB + admin. `remote` = chỉ đọc nội dung qua API, admin bị tắt |
| `CONTENT_API_BASE_URL` | khi `remote` | — | URL backend, phải có `GET /api/public/content` |
| `DATABASE_PATH` | không | `./data/sea-trip.db` | File SQLite (**ổ đĩa bền vững**, không nằm trong `public/`) |
| `UPLOAD_DIR` | không | `./data/uploads` | Ảnh tải lên (**ổ đĩa bền vững**) |
| `MEDIA_MAX_BYTES` | không | `10485760` | Dung lượng ảnh gốc tối đa (byte) |
| `ADMIN_SESSION_SECRET` | **nên đặt** | — | Salt cho hash phiên/fingerprint. Chuỗi ngẫu nhiên dài |
| `ADMIN_ENABLED` | không | `true` (tự `false` khi `VERCEL=1`) | `false` để tắt khu admin trên một instance vẫn có DB |
| `SEED_ON_BOOT` | không | `false` | Import nội dung khi khởi động lần đầu (chỉ non-production) |

> Cơ chế tự phục hồi: mở kết nối DB sẽ chạy migration, và lần đọc nội dung đầu tiên sẽ
> tạo schema + nhập nội dung nếu DB chưa có tour. Nhờ vậy `next build` và `next start`
> chạy được cả trên máy **chưa có** database (Vercel, CI sạch).
| `NEXT_PUBLIC_SITE_URL` | **production** | `http://localhost:3000` | Domain thật (canonical, OG, link trong email) |
| `SALES_RECIPIENTS`, `MAIL_*`, `LEAD_*` | production | — | Xem phần lead trong `.env.example` |

`DATABASE_PATH`/`UPLOAD_DIR` tương đối được tính từ thư mục chạy. Trên VPS nên dùng
đường dẫn tuyệt đối, ví dụ `/var/lib/seatrip/data.db` và `/var/lib/seatrip/uploads`.

---

## 2. Cài đặt & chạy local

```bash
cp .env.example .env.local
npm install

# Tạo schema + nhập nội dung hiện có (idempotent, chạy lại không trùng)
npm run db:setup

# Tạo tài khoản quản trị (hệ thống không có đăng ký công khai)
npm run admin -- create-admin --username admin
#   → nhập mật khẩu ẩn 2 lần, hoặc đặt biến ADMIN_PASSWORD cho script tự động hoá

npm run dev            # http://localhost:3000
# → http://localhost:3000/admin
```

### Lệnh có sẵn

| Lệnh | Tác dụng |
| --- | --- |
| `npm run db:migrate` | Chạy migration còn thiếu (append-only) |
| `npm run db:import` | Nhập lại nội dung từ `src/content/*` (idempotent) |
| `npm run db:setup` | `db:migrate` + `db:import` |
| `npm run admin -- create-admin --username <tên>` | Tạo tài khoản đầu tiên |
| `npm run admin -- reset-password --username <tên>` | Đặt lại mật khẩu |
| `npm run admin -- list` | Liệt kê tài khoản |
| `npm run verify:admin` | Kiểm tra HTTP khu admin/công khai (cần server đang chạy) |
| `npm test` / `npm run lint` / `npm run typecheck` / `npm run build` | Kiểm thử & build |

`npm test` tự tạo một database tạm và nhập nội dung, nên **không cần `db:setup` trước**.

---

## 3. Chuyển dữ liệu hiện có

`npm run db:import` đọc `src/content/{tours,categories,destinations,articles}` và
`src/content/locales/en/*`, sau đó:

- upsert theo `id`/`slug` → chạy lại **không tạo bản ghi trùng**;
- giữ nguyên slug/URL, ảnh, bảng giá, lịch trình và dữ liệu song ngữ;
- ghi `source_updated_at` cho overlay tiếng Anh để bản dịch cũ không ghi đè bản mới;
- đăng ký **28 ảnh** trong `public/images/tours` vào thư viện với `storage='static'`,
  **giữ nguyên URL** (không copy, không đổi tên).

Bản dịch tiếng Anh và `contentStatus` (demo/verified) được bảo toàn.

---

## 4. Triển khai production

### 4.1 Backend trên VPS (nguồn sự thật)

```bash
# Node 22+, reverse proxy HTTPS (Caddy/Nginx)
export DATABASE_PATH=/var/lib/seatrip/data.db
export UPLOAD_DIR=/var/lib/seatrip/uploads
export ADMIN_SESSION_SECRET="$(openssl rand -base64 48)"
export NEXT_PUBLIC_SITE_URL=https://seatriptravel.vn
# + SALES_RECIPIENTS, MAIL_TRANSPORT=smtp, SMTP_*, LEAD_RATE_LIMIT_* …

npm ci
npm run db:setup
npm run admin -- create-admin --username admin
npm run build
next start -p 3000
```

- SQLite ở chế độ WAL; backup an toàn khi đang chạy (xem §5).
- `UPLOAD_DIR` không cần nằm trong `public/`: ảnh được phục vụ qua `/media/...`.
- Migration tự chạy khi khởi động (`src/instrumentation.ts`), nên `git pull` + restart
  là đủ khi chỉ có migration mới.

### 4.2 Frontend trên Vercel (tuỳ chọn)

Có **hai** cách, chọn theo việc bạn đã có backend VPS hay chưa.

#### a) Chưa có VPS — để mặc định, build tự dựng nội dung

Không cần biến môi trường nào. Khi build, `next build` sẽ tự:
tạo schema → nhập nội dung trong `src/content` → prerender site thật.
Nội dung **đóng băng tại thời điểm build**; muốn cập nhật phải build lại.
Admin tự động **bị tắt** trên Vercel (`VERCEL=1`), vì filesystem của deployment
là chỉ đọc.

Đặt thêm nếu muốn:

| Biến | Giá trị | Vì sao |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://seatriptravel.vn` | canonical / OG / link trong email |
| `SALES_RECIPIENTS`, `MAIL_*` | … | form tư vấn gửi được email |

#### b) Đã có VPS — đọc nội dung sống từ backend

| Biến | Giá trị |
| --- | --- |
| `CONTENT_SOURCE` | `remote` |
| `CONTENT_API_BASE_URL` | `https://<vps-cua-ban>` |
| `NEXT_PUBLIC_SITE_URL` | domain công khai |
| `SALES_RECIPIENTS`, `MAIL_*` | … |

**Không** đặt `DATABASE_PATH`/`UPLOAD_DIR` trên Vercel. Ở chế độ này `/admin` báo
“không khả dụng” và nội dung đọc từ `GET {CONTENT_API_BASE_URL}/api/public/content`.

> Lưu ý: chế độ `remote` đọc API **ngay trong lúc build** để prerender trang. Vì vậy
> backend phải truy cập được từ môi trường build của Vercel; nếu API chưa lên, build
> sẽ báo lỗi rõ ràng (đúng ý đồ — không âm thầm dựng site rỗng).
>
> Đổi xuất bản/ẩn trên VPS làm mới cache **của VPS**. Instance Vercel đọc qua HTTP nên
> nhận bản mới ở lần đọc kế tiếp; nếu bật cache ở tầng Vercel, cache đó phải gắn tag
> `content` (adapter `remote` đã gắn `next: { tags: ["content"] }`).

#### Ghi chú kỹ thuật

- `getDb()` chạy migration khi mở kết nối, và `ensureLocalDatabase()` tạo schema +
  seed trước lần đọc nội dung đầu tiên ⇒ **build không cần DB có sẵn**.
- `next.config.ts` có `outputFileTracingIncludes: { "/**": ["./data/**"] }` để file
  SQLite (và thư mục upload) đi theo server output.
- `serverExternalPackages: ["sharp"]` là bắt buộc (native module).

---

## 5. Backup & khôi phục

```bash
# Database (an toàn khi đang chạy nhờ WAL)
sqlite3 /var/lib/seatrip/data.db ".backup '/var/backups/seatrip-$(date +%F).db'"

# Ảnh tải lên
rsync -a --delete /var/lib/seatrip/uploads/ /var/backups/seatrip-uploads/
```

Khôi phục: dừng app → thay file DB + thư mục uploads → khởi động lại. Vì `id`, `slug`
và URL ảnh tĩnh là bất biến, khôi phục không làm hỏng URL nào.

Cron gợi ý: backup DB mỗi ngày, giữ 14 bản; rsync uploads mỗi ngày.

**Không** commit `data/`, `.env.local`, log, hay ảnh upload vào git
(`.gitignore` đã chặn `/data/` và `.env*`).

---

## 6. Sự cố thường gặp

| Triệu chứng | Nguyên nhân & cách xử lý |
| --- | --- |
| `Cannot find module 'node:sqlite'` | Node < 22. Nâng lên Node 22+ |
| `/admin` báo “không khả dụng” | `CONTENT_SOURCE=remote` hoặc `ADMIN_ENABLED=false` |
| Đăng nhập mãi không được | Quá 5 lần sai/15 phút → chờ hết cửa sổ, hoặc `reset-password` |
| Ảnh tải lên báo “Không đọc được ảnh” | Tệp không phải ảnh thật (kiểm tra bằng pixel, không theo đuôi tệp) |
| Ảnh tải lên báo vượt dung lượng | Tăng `MEDIA_MAX_BYTES` nếu thực sự cần |
| Không xoá được ảnh | Ảnh đang được nội dung dùng; thay ảnh ở những nơi được liệt kê trước |
| Xuất bản xong web chưa đổi | Xem lại qua hard refresh; cache trang tối đa 1 phút nếu tag chưa bị vô hiệu |
| Build báo bộ nhớ/tracing | Kiểm tra `serverExternalPackages: ["sharp"]` còn trong `next.config.ts` |
