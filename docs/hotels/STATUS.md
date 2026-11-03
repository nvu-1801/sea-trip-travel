# Trạng thái pipeline

Cập nhật: 2026-11-02. Đã tích hợp thay đổi carousel/menu từ worktree nguồn và triển khai module Khách sạn đến hết P5 local.

## Checkout

- Worktree: `C:/Users/Nguyen Vu/Downloads/Landingpage Tourist/sea-trip-travel-hotels`.
- Branch: `feat/hotel-catalog` (không cấu hình upstream để tránh vô tình đẩy vào main).
- Base SHA: `676ccc5922f9a8e42ef29ed0bc6574e69add0e70`; hiện chưa có commit mới (theo yêu cầu không commit).
- Worktree gốc `sea-trip-travel` giữ branch `fix/customer-carousel-entry`; không bị thao tác nào từ task này.

## Tích hợp carousel/menu (2026-11-02)

- Nguồn: `sea-trip-travel` @ `fix/customer-carousel-entry`, HEAD `676ccc5`.
- Patch: `C:/Users/Nguyen Vu/AppData/Local/Temp/opencode/carousel-menu-676ccc5.patch` (ngoài source tree), tạo bằng `git diff --binary --full-index --output` với danh sách path tường minh.
- `git apply --check --binary` + `git apply --binary` trong đích: exit 0 cho 15/15 file.
- Đối chiếu: SHA-256 15 file hai worktree trùng nhau (0 mismatch); `git diff --stat` giống nhau (15 files, 211 insertions, 72 deletions).
- Worktree nguồn sau thao tác vẫn đúng 15 file modified, không staged, không thêm thay đổi.
- Phạm vi: `next.config.ts`, `public/images/customers/SOURCE.md`, 6 ảnh JPG trong `public/images/customers/videos/`, `desktop-nav.tsx`, `mobile-nav.tsx`, `customer-stories-demo.ts`, `customer-video-carousel.tsx`, `customers.css`, `lib/customer-carousel.ts`, `tests/customer-carousel.test.ts`.

## Tiến độ

| Chặng | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Chuẩn bị nhánh và tài liệu | Hoàn tất | 7 file Markdown ban đầu |
| Tích hợp carousel/menu | Hoàn tất | Patch binary; hash hai worktree trùng |
| P0: audit code và môi trường | Hoàn tất | `npm ci` 411 packages/39s; Node 22.21.0; Chrome có sẵn (verify scripts dùng `channel: chrome`); DB test tách riêng |
| P1: dữ liệu và resolver | Hoàn tất | 4 bảng mới + migration cột lead; 91 test domain/persistence |
| P2: admin | Hoàn tất | Panel 5 tab; API rates/availability/tour-links; preview; conflict + atomic; browser check 30/30 |
| P3: public UI | Hoàn tất | `/khach-san`, `/khach-san/[slug]`, section home, menu/footer, sitemap, metadata/JSON-LD; VI/EN; flag chặn route/API/menu/home/sitemap |
| P4: lead và sale | Hoàn tất | Lead pipeline mở rộng; snapshot giá máy chủ tính; báo giá + phương án; liên kết booking tour qua lead |
| P5: nghiệm thu local | Hoàn tất | Preflight 13/13; security 0 findings; Docker build + smoke PASS |

## P0 — Môi trường

- `npm ci --no-audit --no-fund` tại worktree đích: exit 0, 411 packages, 39s.
- Node `v22.21.0`, npm `10.9.4`, Next `16.4.2`; đọc `node_modules/next/dist/docs/` trước khi viết route/metadata.
- Playwright không cần tải browser: script dùng Chrome cài sẵn (`channel: "chrome"`); CI dùng `CHROMIUM_EXECUTABLE_PATH` có sẵn.
- DB/uploads test tách riêng (`CMS_DB_PATH`/`CMS_UPLOAD_DIR` trỏ file tạm), `MAIL_TRANSPORT=log`, `LEAD_ENCRYPTION_KEY` sinh riêng. Không dùng dữ liệu/email production.
- Baseline trước khi sửa: `npm test` 347 pass, 0 fail.
- Dev/verify port không đụng nhau: dev 3050, verify:ui 3100, verify:hotels 3131.

## P1 — Dữ liệu, giá, tình trạng

Bảng mới (migration additive, chạy lại an toàn):

- `hotel_rate_rules`: giá theo hạng phòng/ngày, `kind` base/weekday/date_range, unique base mỗi phòng, chặn chồng lấn cùng ưu tiên ở service.
- `hotel_availability`: số phòng tham khảo theo đêm, unique `(room_id, date)`, `0` khác “ngừng nhận”, thiếu dòng = chưa xác định.
- `hotel_tour_links`: quan hệ included/upgrade/additional theo khách sạn hoặc hạng phòng.
- `hotel_lead_plans`: báo giá/phương án/booking của sale, ghi chú mã hoá.
- `leads` thêm cột `kind`, `hotel_id`, `stay_checkin`, `stay_checkout` (chỉ để lọc; dữ liệu khách vẫn nằm trong blob mã hoá).
- Trigger version admin cho bảng mới + trigger public cho giá/tồn/liên kết.

Luật giá: date_range > weekday > base; ngày `[checkIn, checkOut)`; date-only bằng `lib/date.ts` (không UTC round-trip); thiếu đêm = “cần báo giá”, không thay bằng 0; included không cộng lại; upgrade không tự suy chênh lệch; tổng vượt safe range bị từ chối.

## P2 — Admin

- Menu Studio **Khách sạn** (`/admin/hotels`), danh sách + lọc + trạng thái + chuyển nhanh xuất bản/ẩn/lưu trữ.
- Editor 5 tab: Thông tin, Ảnh & tiện ích, Hạng phòng, Giá & tình trạng, Tour & xuất bản.
- Media dùng lại `ImageField`/`/api/admin/media`; alt bắt buộc; sắp xếp ảnh.
- `GET/POST /api/admin/hotels/[id]/rates`: lưu cả bộ quy tắc trong một transaction, trả conflict khi `updatedAt` lệch.
- `GET/POST .../availability`: nhập theo ngày, áp dụng nhiều ngày, xoá về “chưa nhập”.
- `GET/POST .../tour-links`: validate tour tồn tại + phòng thuộc khách sạn.
- Mọi API admin dùng `requireSession` + CSRF; audit chỉ ghi sau khi thành công.

## P3 — Public

- `/khach-san` (VI/EN) với tìm/lọc/sắp xếp/phân trang trong URL; form là GET nên Back/Forward khôi phục đúng.
- `/khach-san/[slug]`: breadcrumb, gallery dialog bàn phím, hạng phòng, giá/tình trạng, tour liên quan, panel tư vấn.
- Home: section sau tour nổi bật, tối đa 6 khách sạn, tự ẩn khi rỗng/tắt.
- Menu desktop/mobile/footer thêm “Khách sạn” theo cùng công tắc.
- Sitemap chỉ thêm URL khi module bật; EN chỉ khi `_enReviewed`; filter tổ hợp noindex.
- JSON-LD `LodgingBusiness` không rating, `Offer` chỉ khi có giá thực.

## P4 — Lead và sale

- `/api/leads` nhận `kind: "hotel"`; server tự đọc lại khách sạn/phòng/giá/quan hệ tour, không tin tổng tiền client.
- Snapshot lưu: phòng × số lượng, ngày/linh hoạt, người lớn/trẻ em + tuổi, tour + quan hệ, tình trạng từng phòng, giá tham khảo, cờ `needsReview`.
- Tắt module: 403 `MODULE_DISABLED`, tour lead vẫn 200.
- Email bán hàng thêm khối khách sạn; lỗi mail vẫn lưu lead (`mail_status=failed`), retry không nhân đôi.
- Tab Tư vấn: chip loại yêu cầu, khối khách sạn, lưu báo giá/phương án, trạng thái mới `quoted`/`confirmed`, hiển thị booking tour đã liên kết; không tự tạo doanh thu/trừ phòng.

## P4b — Ước tính tour + phòng và nhập dữ liệu

- `/api/hotels/quote` nhận `adults`/`children`, trả thêm `tourPrice` và `estimate` (tour + lưu trú + tổng).
- Giá tour dùng gói rẻ nhất đang xuất bản; thiếu giá trẻ em/chưa có giá → “Cần báo giá”, không bịa số.
- Form hiện ô **Tổng ước tính**; bấm mở dropdown chi tiết: gói tour, người lớn × đơn giá, trẻ em × đơn giá, từng hạng phòng × số lượng, tổng cộng, ghi chú tham khảo.
- `npm run hotels:import` nhận JSON do chủ site có quyền dùng, chỉ tạo bản nháp `contentStatus: demo`, chặn ảnh ngoài và chặn `--publish`; chạy lại không nhân đôi. Mẫu: `scripts/hotels/quynhon-demo.json` (3 khách sạn demo).
- Không cào ảnh/giá từ website khác (xem `docs/hotels/IMPORT.md`).

## P5 — Kiểm thử đã chạy

| Lệnh | Kết quả |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm test` | 435 pass, 0 fail |
| `npm run build` | exit 0 (có `/[locale]/khach-san`, `/[locale]/khach-san/[slug]`, `/api/hotels/quote`, 3 API admin) |
| `npm run verify:hotels` | 32/32 check pass |
| `npm run verify:preflight -- --full` | xem mục “Gate cuối” bên dưới |
| `npm run security:check` | xem mục “Gate cuối” bên dưới |
| Docker build + smoke | xem mục “Gate cuối” bên dưới |

Test mới (đã nối vào `npm test`):

- `tests/hotel-pricing.test.ts`: thứ tự ưu tiên, chồng lấn, đêm thiếu, 0/âm/NaN/vượt mức, nhiều phòng, included/upgrade/additional, phụ thu chưa rõ.
- `tests/hotel-availability.test.ts`: on_request, min các đêm, bỏ đêm trả, thiếu đêm, 0/ngừng, quá khứ, timestamp.
- `tests/hotel-filters.test.ts`: parse/clamp URL, budget, sort (giá thiếu xếp cuối), phân trang, canonical.
- `tests/hotel-store.test.ts`: migration trên DB cũ, draft/publish/revision, slug, phòng thuộc khách sạn, giá atomic + conflict, tồn kho, tour link, plan mã hoá, projection public.
- `tests/hotel-lead.test.ts`: flag, validate phòng/khách sạn/ngày, snapshot, included, sức chứa, mail lỗi + idempotency, tour lead regression.
- `tests/tour-estimate.test.ts`: gói rẻ nhất, fallback `priceFrom`, thiếu giá trẻ em, thiếu giá tour, chặn party size, giá trẻ em 0.

Ảnh kiểm thử thật (gitignored): `verify-screenshots/hotels/list-1440.png`, `detail-1440.png`, `list-390.png`, `detail-390.png`, `estimate-1440.png`, `admin-hotels-1440.png`, `admin-rates-1440.png`.

## Quyết định nghiệp vụ mới

- Module mặc định **tắt**; bật bằng công tắc trong Studio (publish settings).
- Slug khách sạn đã lưu là bất biến (theo convention slug hiện có), nên không phát sinh redirect mới.
- `included` trả tổng lưu trú 0 nhưng UI ghi “đã bao gồm trong tour”, không hiện “0 ₫”.
- Quá sức chứa hoặc thiếu giá/phụ thu: vẫn nhận yêu cầu, đánh dấu cần kiểm tra, không tạo báo giá chắc chắn.
- Số phòng tham khảo là nhập tay; không có tồn kho realtime, không giữ chỗ, không trừ khi gửi lead.

## Giới hạn và việc chưa làm

- Chưa có upload ảnh end-to-end trong browser test (dùng lại media flow đã có test riêng); chưa kiểm tra 200% zoom và focus ring trong browser suite.
- Chưa có booking tự động/thanh toán; liên kết booking dựa vào booking tour tạo trong Tài chính tour với đúng lead.
- Dữ liệu demo chỉ tồn tại trong DB local/DB tạm của verify; không seed production. Importer từ chối ảnh ngoài và không publish.
- Ước tính tour dùng **gói rẻ nhất đang xuất bản**; nếu chủ site muốn khách chọn gói khác thì cần thêm bộ chọn gói (chưa làm).
- Không cào ảnh/mô tả/giá từ website đối tác. Muốn có dữ liệu thật, dùng file do khách sạn cung cấp hoặc ảnh bạn sở hữu (xem `IMPORT.md`).
- Docker gate đã chạy PASS trên cây hiện tại; khi release thật vẫn phải chạy lại trên commit được merge.

## Gate cuối

- `npm run verify:preflight -- --full`: **pass 13/13** (exit 0, 335.4s), gồm lint, typecheck, unit + CMS tests, production build, verify:ui, verify:hotels, verify:depth, verify:tour-import, verify:cms, verify:hero, verify:tour-editor, verify:seo.
- `npm run security:check`: **exit 0** — semgrep 0 findings (91 rules, 339 tracked files) và gitleaks “no leaks found”.
- Quét bổ sung các file mới chưa được git track: semgrep `--no-git-ignore` trên bản copy `src` + `scripts` (401 file) → **0 findings, exit 0**. Semgrep mặc định chỉ quét file đã track, nên đây là bằng chứng bổ sung cần thiết cho code mới.
- Docker: `docker build --build-arg APP_SHA=local-hotels -t sea-trip:hotels-check .` exit 0; smoke read-only + volume bền vững: health `ok/connected/local-hotels`, `/` 200, `/admin` 200, `/api/hotels/quote` 404 khi module tắt, restart vẫn `ok/connected` → **SMOKE-PASS**. Bắt buộc vì `.github/workflows/ci-deploy.yml` đã thêm bước `verify:hotels`.
- Chưa commit/push/PR/merge/deploy.
