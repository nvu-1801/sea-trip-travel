# Thông tin cần chủ website cung cấp

Mọi mục dưới đây hiện là **placeholder** trong source. Website đã chạy được và
hiển thị hợp lý, nhưng **không được xuất bản** trước khi các mục nhóm A được xác
nhận — vì chúng ảnh hưởng tới pháp lý, khả năng liên hệ và độ tin cậy.

Ký hiệu: 🔴 chặn xuất bản · 🟠 nên có trước khi chạy quảng cáo · 🟡 cải thiện sau.

---

## A. Bắt buộc trước khi xuất bản

| # | Mục | Placeholder hiện tại | Ở đâu |
| --- | --- | --- | --- |
| A1 | 🔴 **Hotline chính thức** | `0000 000 000` | `src/config/site.ts` → `contact.hotline`, `contact.hotlineHref` |
| A2 | 🔴 **Email nhận yêu cầu tư vấn** | `hello@example.com` | `src/config/site.ts` → `contact.email` |
| A3 | 🔴 **Người nhận email sales** | `sales@example.com` | `.env` → `SALES_RECIPIENTS` |
| A4 | 🔴 **Domain thật** | `http://localhost:3000` | `.env` → `NEXT_PUBLIC_SITE_URL` |
| A5 | 🔴 **Email gửi đi thuộc domain đã xác minh** + SPF/DKIM/DMARC | `no-reply@example.com` | `.env` → `MAIL_FROM_EMAIL` |
| A6 | 🔴 **Tên pháp nhân, mã số thuế, địa chỉ đăng ký** | "Địa chỉ văn phòng sẽ được cập nhật" | `src/config/site.ts` → `contact.address`, và `src/app/chinh-sach-bao-mat/page.tsx` |
| A7 | 🔴 **Chính sách xử lý thông tin đã được duyệt** | Bản dự thảo có ghi chú | `src/app/chinh-sach-bao-mat/page.tsx` |
| A8 | 🔴 **Duyệt toàn bộ nội dung tour** — lịch trình, dịch vụ bao gồm/không bao gồm, lưu ý | `contentStatus: "demo"` | `src/content/tours/*.ts` |
| A9 | 🔴 **Giá tour, hoặc xác nhận giữ "Liên hệ tư vấn"** | `priceFrom: null` | `src/content/tours/*.ts` |
| A10 | 🔴 **Điều kiện & chính sách huỷ/thanh toán** (nếu công bố) | Mảng rỗng ⇒ khối chính sách bị ẩn | `policies: []` trong mỗi tour |

## B. Nên có trước khi chạy quảng cáo

| # | Mục | Ghi chú |
| --- | --- | --- |
| B1 | 🟠 **Ảnh thật cho từng tour và điểm đến** | Thêm `image.src = "/images/…"` trong `content/`. Xem hướng dẫn chọn ảnh ở `docs/design-tokens.md` mục 7 |
| B2 | 🟠 **Giờ làm việc thật** | `src/config/site.ts` → `contact.workingHours` |
| B3 | 🟠 **Logo dạng vector (SVG/AI)** | Hiện đang tách từ PNG do khách cung cấp. SVG sẽ nét hơn ở mọi kích thước |
| B4 | 🟠 **Kênh social chính thức (Facebook, Zalo)** | `src/config/site.ts` → `social.*`. Đang để trống nên nút dùng **đường dẫn dự phòng**: Facebook → `facebook.com`, Zalo → `zalo.me/<hotline>`. Nút vẫn hiển thị (theo yêu cầu) nhưng **phải cập nhật trước khi chạy quảng cáo**, nếu không khách bấm sẽ tới trang chủ của nền tảng |
| B5 | 🟠 **Ảnh Open Graph riêng theo tour** | Hiện dùng ảnh thương hiệu chung `src/app/opengraph-image.png` |
| B6 | 🟠 **Điểm khởi hành thật** cho từng tour | `departurePoints` |

## C. Cải thiện sau

| # | Mục |
| --- | --- |
| C1 | 🟡 Bổ sung `policies` khi đã có nội dung chính sách được duyệt |
| C2 | 🟡 Thêm bài cẩm nang mới (hiện có 5 bài demo) |
| C3 | 🟡 Bổ sung ảnh thật cho địa danh trong bài viết |
| C4 | 🟡 Xem lại tiêu đề/description SEO cho từng tour và danh mục (`seo` trong `content/`) |
| C5 | 🟡 Chuyển nội dung sang CMS (xem `docs/admin-roadmap.md`) |

---

## Cách thay thế nội dung demo

1. **Đổi thông tin liên hệ**: sửa `src/config/site.ts`. Sau khi sửa, kiểm tra
   `isPlaceholderContact` không còn bật cho mục nào.
2. **Thêm tour thật**: thêm một object vào file trong `src/content/tours/`, rồi
   đặt `contentStatus: "verified"`. Nếu viết sai khoá danh mục hoặc điểm đến,
   `npm run build` sẽ đỏ ngay kèm thông báo cụ thể — không lọt ra production.
3. **Thêm ảnh**: bỏ file vào `public/images/…`, rồi điền `image.src = "/images/…"`.
   Không cần sửa component nào.
4. **Không có nhãn demo trên giao diện**: `contentStatus` chỉ là metadata nội bộ,
   không được render. Khách không thấy nhãn nào về nội dung demo.
5. **Gỡ khỏi danh sách này**: đặt `contentStatus: "verified"` cho bản ghi đã duyệt,
   và xoá dòng tương ứng ở mục A8/A9.

## Kiểm tra sau khi cập nhật

```bash
npm run typecheck   # kiểu dữ liệu nội dung đúng
npm test            # toàn vẹn dữ liệu, không còn giá 0, không có slug trùng
npm run build       # tất cả trang tĩnh dựng thành công
```

Nếu có lỗi, thông báo sẽ nêu tên bản ghi và khoá bị sai, ví dụ:

```
Lỗi toàn vẹn dữ liệu nội dung (1):
- Tour "abc" tham chiếu danh mục không tồn tại: cat_khong_co
```
