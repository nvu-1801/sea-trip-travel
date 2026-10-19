# SEA TRIP TRAVEL

Website giới thiệu điểm đến, tour và trải nghiệm du lịch trong nước, tập trung vào
tuyến **Quy Nhơn – Phú Yên**. Khách xem lịch trình và gửi **yêu cầu tư vấn**; hệ
thống gửi email cho bộ phận tư vấn; tư vấn viên liên hệ lại.

> **Giai đoạn MVP chưa có:** admin/CMS, tài khoản khách, thanh toán, đặt tour
> trực tuyến, vé máy bay, khách sạn. Xem `docs/admin-roadmap.md` cho lộ trình mở
> rộng.

## Bắt đầu

```bash
npm install
cp .env.example .env.local     # rồi điền giá trị thật
npm run dev                    # http://localhost:3000
```

Kiểm tra chất lượng:

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm test              # node:test (132 test)
npm run build         # next build (42 trang)

npm run verify:ui     # Chrome thật: 82 kiểm tra (layout, bàn phím, form → SMTP)
npm run content:report # nội dung nào còn thiếu, theo từng bản ghi
```

## Cấu trúc

```
src/
├── app/         Route + page composition (mỏng, không chứa logic nghiệp vụ)
├── components/  UI primitives không biết domain (button, form, layout, icons)
├── features/    UI theo tính năng (home, tours, guides, leads, destinations)
├── content/     Nội dung dạng file TS + kiểm tra toàn vẹn
├── domain/      Kiểu + schema Zod (nguồn sự thật duy nhất)
├── server/      Chỉ chạy trên server: mailer, template, service lead
├── lib/         Repository (lib/data), format, seo, sanitize, json-ld
└── config/      site.ts (nhận diện, liên hệ), navigation.ts (menu)
```

Quy tắc phụ thuộc và lý do: **`docs/architecture.md`**.

## Menu

Giữ đúng thứ tự yêu cầu. Nguồn duy nhất: `src/config/navigation.ts`.

| Cấp 1                   | Cấp 2                  | URL                                             |
| ----------------------- | ---------------------- | ----------------------------------------------- |
| Trang chủ               |                        | `/`                                             |
| Tour Quy Nhơn - Phú Yên |                        | `/tour-quy-nhon-phu-yen`                        |
|                         | Tour Quy Nhơn 1 Ngày   | `/tour-quy-nhon-phu-yen/tour-quy-nhon-1-ngay`   |
|                         | Tour Quy Nhơn dài Ngày | `/tour-quy-nhon-phu-yen/tour-quy-nhon-dai-ngay` |
| Tour Trong Nước         |                        | `/tour-trong-nuoc`                              |
|                         | Tour Miền Bắc          | `/tour-trong-nuoc/tour-mien-bac`                |
|                         | Tour Miền Trung        | `/tour-trong-nuoc/tour-mien-trung`              |
|                         | Tour Miền Nam          | `/tour-trong-nuoc/tour-mien-nam`                |
|                         | Tour Tây Nguyên        | `/tour-trong-nuoc/tour-tay-nguyen`              |
| Cẩm Nang Du Lịch        |                        | `/cam-nang-du-lich`                             |
| Liên Hệ                 |                        | `/lien-he`                                      |

Trang khác: `/tour/[slug]`, `/cam-nang-du-lich/[slug]`, `/chinh-sach-bao-mat`,
`/api/leads`, `sitemap.xml`, `robots.txt`.

## Song ngữ (vi / en)

Website hiện hỗ trợ **tiếng Việt** (mặc định, URL không prefix) và **tiếng Anh**
(`/en/...`). Slug nội dung giữ nguyên ở cả hai ngôn ngữ.

- **Không dùng thư viện i18n ngoài:** `next-intl` chưa hỗ trợ `cacheComponents`
  (đang bật), nên i18n dựng trên `next/root-params` + `src/proxy.ts`.
- Chuỗi giao diện: `src/messages/{vi,en}.json` (key khớp nhau, `typecheck` kiểm).
- Nội dung: bản dịch đặt ở `src/content/locales/en/*.ts`, **khoá theo `id`** bản
  ghi, kèm `translationStatus: draft | reviewed`.
- Bản dịch tiếng Anh do agent tạo đang là **draft**: xem được nhưng có banner,
  `noindex`, và **không** nằm trong `sitemap.xml`/`hreflang`.

Vận hành: **`docs/I18N_GUIDE.md`**. Danh sách bản dịch cần duyệt:
**`docs/I18N_CONTENT_REVIEW.md`**.

## Biến môi trường

Xem `.env.example`. Không có secret nào được ghi vào source. Chỉ biến có tiền tố
`NEXT_PUBLIC_` mới lộ ra trình duyệt.

## Nội dung và dữ liệu

Nội dung nằm trong `src/content/`. Đợt 16/10/2026 đã nhập 11 chương trình từ tài liệu khách hàng, bảng giá lưu trú và metadata ảnh. 28 ảnh gốc từ Word chưa được công khai; bản code sử dụng placeholder. Xem `docs/TOUR-CONTENT-IMPLEMENTATION-PLAN.md` và `docs/TOUR-IMPORT-VERIFICATION.md`.

- Tour từ tài liệu khách có `contentStatus: "verified"`; tour chưa có tài liệu đối ứng giữ `demo`. Đây là **metadata theo dõi nội bộ** (dùng
  cho `docs/CONTENT-TODO.md` và checklist nghiệm thu) — trường này **không** được
  render ra giao diện. Khách không thấy nhãn nào về "nội dung demo".
- Tour một ngày chưa có giá giữ `priceFrom: null` → **"Liên hệ tư vấn"**; bốn tour dài ngày có bảng giá theo gói. Giá thiếu không
  bao giờ hiển thị `0 ₫`.
- Ảnh chưa có: `image.src` bỏ trống → hệ thống vẽ placeholder gradient thương
  hiệu. Thêm ảnh thật = điền `src` (một dòng dữ liệu), không sửa component.

Danh sách việc cần chủ website cung cấp: **`docs/CONTENT-TODO.md`**.

## Tài liệu

| File                           | Nội dung                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `docs/PLAN.md`                 | Kế hoạch triển khai: phạm vi, sitemap, art direction, lộ trình                                    |
| `docs/verification.md`         | **Báo cáo kiểm chứng**: email thật, rate limit, mobile, animation, và những gì còn chưa kiểm được |
| `docs/architecture.md`         | Kiến trúc, cây thư mục, quy tắc phụ thuộc, luồng dữ liệu                                          |
| `docs/design-tokens.md`        | Token màu/chữ/khoảng cách + lý do đạt WCAG AA                                                     |
| `docs/lead-flow.md`            | Luồng form → email, chống spam, xử lý lỗi, biến môi trường                                        |
| `docs/admin-roadmap.md`        | Lộ trình bổ sung admin/CMS sau MVP                                                                |
| `docs/I18N_GUIDE.md`           | Vận hành song ngữ vi/en: thêm chuỗi, thêm tour/bài viết, bật index EN                             |
| `docs/I18N_CONTENT_REVIEW.md`  | Danh sách bản dịch tiếng Anh đang chờ duyệt                                                       |
| `docs/acceptance-checklist.md` | Checklist nghiệm thu + cách kiểm chứng                                                            |
| `docs/CONTENT-TODO.md`         | Thông tin còn thiếu cần chủ website cung cấp                                                      |

## Ghi chú kỹ thuật

- **Next.js 16.4** với Cache Components. Điều này ảnh hưởng tới cách viết code:
  - `new Date()`, `Math.random()` khi prerender sẽ báo lỗi → năm bản quyền được
    bọc trong `'use cache'`.
  - Không dùng được `export const runtime` hay `dynamicParams`.
  - Hai trang chi tiết đặt `export const instant = false` (nội dung phụ thuộc
    hoàn toàn vào slug).
- **React Compiler** đang bật qua ESLint: không gọi `setState` trực tiếp trong
  thân `useEffect`. Chỗ nào cần theo dõi trạng thái ngoài React (vị trí cuộn)
  thì dùng `useSyncExternalStore`.
- **Animation cuộn** dùng CSS scroll-driven animation
  (`animation-timeline: view()`), không có IntersectionObserver và không có
  JavaScript. Trình duyệt không hỗ trợ sẽ hiển thị nội dung bình thường.

# SEA TRIP Studio · CMS và triển khai VPS

Nguồn chính là thư mục `sea-trip-travel`. Bản cập nhật 18/10/2026 bổ sung `/admin` cho một chủ quản trị, quản lý tour/bài viết/danh mục/điểm đến, nội dung VI/EN, footer, media và lead. SQLite và uploads phải nằm trên ổ đĩa bền vững. Bản public đọc snapshot đã xuất bản ngay ở runtime.

Xem [hướng dẫn CMS, Docker, CI/CD, backup và VPS](docs/VPS-DEPLOY.md) cùng [kế hoạch triển khai](docs/IMPLEMENTATION-2026-10.md). Không có mật khẩu mặc định. Tạo tài khoản bằng `npm run admin -- bootstrap` sau khi cấu hình môi trường theo hướng dẫn.

Kiểm tra thêm: `npm run test:cms` và `npm run verify:cms`. Browser test dùng tài khoản, database và khóa mã hóa tạm riêng. Workflow deploy main chỉ bật khi đã có cấu hình VPS và `DEPLOY_ENABLED=true`.
