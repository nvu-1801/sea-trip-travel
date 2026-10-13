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
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # node:test (89 test)
npm run build       # next build
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

| Cấp 1 | Cấp 2 | URL |
| --- | --- | --- |
| Trang chủ | | `/` |
| Tour Quy Nhơn - Phú Yên | | `/tour-quy-nhon-phu-yen` |
| | Tour Quy Nhơn 1 Ngày | `/tour-quy-nhon-phu-yen/tour-quy-nhon-1-ngay` |
| | Tour Quy Nhơn dài Ngày | `/tour-quy-nhon-phu-yen/tour-quy-nhon-dai-ngay` |
| Tour Trong Nước | | `/tour-trong-nuoc` |
| | Tour Miền Bắc | `/tour-trong-nuoc/tour-mien-bac` |
| | Tour Miền Trung | `/tour-trong-nuoc/tour-mien-trung` |
| | Tour Miền Nam | `/tour-trong-nuoc/tour-mien-nam` |
| | Tour Tây Nguyên | `/tour-trong-nuoc/tour-tay-nguyen` |
| Cẩm Nang Du Lịch | | `/cam-nang-du-lich` |
| Liên Hệ | | `/lien-he` |

Trang khác: `/tour/[slug]`, `/cam-nang-du-lich/[slug]`, `/chinh-sach-bao-mat`,
`/api/leads`, `sitemap.xml`, `robots.txt`.

## Biến môi trường

Xem `.env.example`. Không có secret nào được ghi vào source. Chỉ biến có tiền tố
`NEXT_PUBLIC_` mới lộ ra trình duyệt.

## Nội dung và dữ liệu

Nội dung hiện nằm trong `src/content/*.ts` và **đã được đánh dấu là demo**:

- Mọi bản ghi có `contentStatus: "demo"`. Đây là **metadata theo dõi nội bộ** (dùng
  cho `docs/CONTENT-TODO.md` và checklist nghiệm thu) — trường này **không** được
  render ra giao diện. Khách không thấy nhãn nào về "nội dung demo".
- Giá tour đặt `priceFrom: null` → giao diện hiển thị **"Liên hệ tư vấn"**, không
  bao giờ hiển thị `0 ₫`.
- Ảnh chưa có: `image.src` bỏ trống → hệ thống vẽ placeholder gradient thương
  hiệu. Thêm ảnh thật = điền `src` (một dòng dữ liệu), không sửa component.

Danh sách việc cần chủ website cung cấp: **`docs/CONTENT-TODO.md`**.

## Tài liệu

| File | Nội dung |
| --- | --- |
| `docs/PLAN.md` | Kế hoạch triển khai: phạm vi, sitemap, art direction, lộ trình |
| `docs/architecture.md` | Kiến trúc, cây thư mục, quy tắc phụ thuộc, luồng dữ liệu |
| `docs/design-tokens.md` | Token màu/chữ/khoảng cách + lý do đạt WCAG AA |
| `docs/lead-flow.md` | Luồng form → email, chống spam, xử lý lỗi, biến môi trường |
| `docs/admin-roadmap.md` | Lộ trình bổ sung admin/CMS sau MVP |
| `docs/acceptance-checklist.md` | Checklist nghiệm thu + cách kiểm chứng |
| `docs/CONTENT-TODO.md` | Thông tin còn thiếu cần chủ website cung cấp |

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
