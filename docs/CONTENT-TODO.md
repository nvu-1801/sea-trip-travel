# Thông tin cần chủ website cung cấp

Website **đã chạy được** và hiển thị hợp lý. Nhưng **không được xuất bản** trước
khi nhóm A được xác nhận — vì chúng ảnh hưởng tới pháp lý, khả năng liên hệ và độ
tin cậy.

Ký hiệu: ✅ đã có · 🔴 chặn xuất bản · 🟠 nên có trước khi chạy quảng cáo · 🟡 cải thiện sau.

Kiểm tra lại bất cứ lúc nào:

```bash
npm run content:report   # liệt kê mục còn thiếu, suy ra từ config thật
```

---

## Cập nhật tài liệu tour ngày 16/10/2026

Đã nhận 13 file Word, loại hai cặp trùng thành 11 chương trình. Tổng dự kiến 14 file nên còn thiếu một file chưa xác định. Đã nhập lịch trình, dịch vụ, chính sách riêng theo tour, 28 ảnh và bảng giá bốn tour dài ngày. Bảy tour một ngày chưa có giá, tiếp tục hiển thị Liên hệ tư vấn. Các tour cũ chưa có tài liệu đối ứng và các mục ngoài tour để bổ sung sau theo yêu cầu người dùng.

Danh sách A8–A10 cũ bên dưới là baseline trước đợt nhập; trạng thái hiện tại lấy từ `npm run content:report`. Chi tiết mâu thuẫn tài liệu và giới hạn ảnh ở `TOUR-CONTENT-IMPLEMENTATION-PLAN.md`. Chưa tự điền pháp nhân, MST, phụ thu hoặc domain.

## Đã nhận (2026-10-14)

| Mục | Giá trị | Nơi lưu |
| --- | --- | --- |
| Hotline | `0969 297 064` (`tel:+84969297064`) | `src/config/site.ts` |
| Email nhận tư vấn | `seatriptravel@gmail.com` | `src/config/site.ts` |
| Người nhận email sales | `seatriptravel@gmail.com` | `.env` → `SALES_RECIPIENTS` |
| Địa chỉ | 42-44 Chế Lan Viên, Phường Quy Nhơn Nam, Tỉnh Gia Lai | `src/config/site.ts` |
| Facebook | `facebook.com/share/1C64q28Cz5/` | `src/config/site.ts` |
| Tỉnh của 4 điểm đến Quy Nhơn | `Gia Lai` (theo địa chỉ trên) | `src/content/destinations.ts` |

Các giá trị này đã xuất hiện ở: header, footer, nút liên hệ nổi, form tư vấn
(nút gọi hotline), trang liên hệ, trang chính sách, email nội bộ và JSON-LD.

---

## A. Bắt buộc trước khi xuất bản

| # | Mục | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| A1 | Hotline chính thức | ✅ | Đã nhận |
| A2 | Email nhận yêu cầu tư vấn | ✅ | Đã nhận |
| A3 | Người nhận email sales | ✅ có trong `.env.example` | **Phải đặt lại** trong môi trường deploy thật |
| A4 | **Domain thật** | 🔴 | Vẫn là `http://localhost:3050`. Cần domain + DNS trước khi deploy, vì nó vào canonical, OG và link trong email |
| A5 | **Bảo đảm email gửi đi** | 🔴 | Xem mục riêng bên dưới |
| A6 | **Tên pháp nhân + mã số thuế** | 🔴 | Đã có địa chỉ; còn thiếu **tên công ty/hộ kinh doanh** và **MST** để ghi ở footer và trang chính sách |
| A7 | **Duyệt chính sách xử lý thông tin** | 🔴 | Bản dự thảo ở `src/app/chinh-sach-bao-mat/page.tsx` cần được đọc và duyệt |
| A8 | **Nội dung tour** | Đã nhập một phần | 11 chương trình đã có tài liệu khách; phần còn lại chờ bổ sung |
| A9 | **Giá tour** | Đã nhập một phần | Bốn tour dài ngày có bảng giá, bảy tour một ngày chưa có giá; xác nhận thời hạn áp dụng sau |
| A10 | **Điều kiện & chính sách huỷ/thanh toán** | Đã nhập một phần | Giữ chính sách từng tour từ Word; chưa tự tính phí cho ranh giới thời gian còn mơ hồ |

### A5 — Bảo đảm email gửi đi

Hiện tại phương án khả thi là **Gmail SMTP** (`smtp.gmail.com:587`), vì chưa có
hộp thư theo domain. Cách bật:

1. Bật **xác minh 2 bước** cho tài khoản Google `seatriptravel@gmail.com`.
2. Tạo **Mật khẩu ứng dụng** (App Password) 16 ký tự → dán vào `SMTP_PASSWORD`.
   Không dùng mật khẩu đăng nhập Google.
3. Đặt `MAIL_TRANSPORT=smtp`, `MAIL_FROM_EMAIL=seatriptravel@gmail.com`.
4. Gửi thử và **kiểm tra thư đã vào hộp thư**, cả trên Gmail mobile và Outlook.

Điều cần biết (chưa kiểm chứng số cụ thể, cần tra trang chính sách hiện hành của
Google): tài khoản Gmail miễn phí có **giới hạn số thư gửi mỗi ngày**, và `From`
sẽ là địa chỉ Gmail chứ không phải tên miền riêng.

**Vì sao nên chuyển sang hộp thư theo domain** (khi có điều kiện): địa chỉ gửi
thuộc domain riêng + SPF/DKIM/DMARC giúp thư ít vào spam hơn và không bị giới hạn
theo tài khoản cá nhân. Khi đó chỉ cần đổi `SMTP_*` và `MAIL_FROM_EMAIL`, không
sửa code.

> Lưu ý: `POST /api/leads` trả 200 nghĩa là **transport đã nhận thư**, chưa chứng
> minh thư đã vào hộp thư. Việc kiểm bằng hộp thư thật là bắt buộc và không thể
> thay bằng test tự động. Chi tiết ở `docs/verification.md` mục 2.

---

## B. Nên có trước khi chạy quảng cáo

| # | Mục | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| B0 | **Xác nhận tên tỉnh/thành của từng điểm đến** | 🔴 cần xác nhận | Xem mục riêng bên dưới |
| B1 | **Ảnh thật cho tour và điểm đến** | 🟠 | Hiện dùng placeholder gradient. Thêm `image.src = "/images/…"`, xem `docs/design-tokens.md` mục 7 |
| B2 | **Giờ làm việc thật** | 🟠 | Đang là "Thứ 2 – Thứ 7, 08:00 – 18:00" |
| B3 | **Logo dạng vector (SVG/AI)** | 🟠 | Hiện tách từ PNG |
| B4 | Kênh social | ✅ Facebook | Facebook đã có. Zalo chưa đặt → web tự dùng `zalo.me/0969297064`, link chạy được; điền link Zalo OA riêng nếu có. Instagram/TikTok/YouTube: để trống thì nút bị ẩn |
| B5 | Ảnh Open Graph riêng theo tour | 🟠 | Hiện dùng ảnh thương hiệu chung |
| B6 | Điểm khởi hành thật cho từng tour | 🟠 | |

### B0 — Tên tỉnh/thành sau sáp nhập 2025

Địa chỉ bạn cung cấp ghi **Tỉnh Gia Lai**, nên 4 điểm đến ở khu vực Quy Nhơn đã
được cập nhật thành `Gia Lai`.

**Nhưng 4 điểm đến ở Phú Yên thì chưa** — tôi không truy cập được mạng để xác
minh cấu trúc hành chính mới, nên không tự sửa. Cần bạn xác nhận tên tỉnh/thành
hiện tại cho các điểm sau (và cả các vùng khác nếu có thay đổi):

| Điểm đến | Đang ghi | Cần xác nhận |
| --- | --- | --- |
| Ghềnh Đá Đĩa | Phú Yên | ? |
| Bãi Xép | Phú Yên | ? |
| Mũi Điện – Đại Lãnh | Phú Yên | ? |
| Đầm Ô Loan | Phú Yên | ? |
| Đà Nẵng / Hội An / Huế | Đà Nẵng / Quảng Nam / Huế | ? |
| Phú Quốc | Kiên Giang | ? |
| Cần Thơ | Cần Thơ | ? |
| Đà Lạt | Lâm Đồng | ? |
| Buôn Ma Thuột | Đắk Lắk | ? |

Cách sửa: một dòng `province` cho mỗi điểm trong `src/content/destinations.ts`.
Nếu bạn muốn bỏ hẳn tên tỉnh để tránh nhầm, cũng nói — sửa một chỗ trong
`DestinationCard` là xong.

---

## C. Cải thiện sau

| # | Mục |
| --- | --- |
| C1 | 🟡 Bổ sung `policies` khi đã có nội dung chính sách được duyệt |
| C2 | 🟡 Thêm bài cẩm nang mới (hiện có 5 bài demo) |
| C3 | 🟡 Bổ sung ảnh thật cho địa danh trong bài viết |
| C4 | 🟡 Xem lại tiêu đề/description SEO cho từng tour và danh mục (`seo` trong `content/`) |
| C5 | 🟡 Chuyển nội dung sang CMS (xem `docs/admin-roadmap.md`) |
| C6 | 🟡 Thay link Facebook dạng `share/…` bằng link trang chính thức nếu có |

---

## Cách thay thế nội dung demo

1. **Đổi thông tin liên hệ**: sửa `src/config/site.ts`. Chạy `npm run content:report`
   để xác nhận không còn mục nào trong "OUTSTANDING OWNER VALUES".
2. **Thêm tour thật**: thêm object vào file trong `src/content/tours/`, đặt
   `contentStatus: "verified"`. Sai khoá danh mục/điểm đến ⇒ `npm run build` đỏ
   ngay kèm thông báo cụ thể.
3. **Thêm ảnh**: bỏ file vào `public/images/…`, điền `image.src = "/images/…"`.
   Không cần sửa component.
4. **Nội dung demo không hiển thị nhãn nào** trên giao diện — `contentStatus` chỉ
   là metadata theo dõi nội bộ.

## Kiểm tra sau khi cập nhật

```bash
npm run typecheck   # kiểu dữ liệu nội dung đúng
npm test            # toàn vẹn dữ liệu, không còn giá 0, không slug trùng
npm run build       # tất cả trang tĩnh dựng thành công
npm run verify:ui   # mở Chrome thật: layout, bàn phím, form → SMTP
```

Nếu có lỗi, thông báo nêu tên bản ghi và khoá sai, ví dụ:

```
Lỗi toàn vẹn dữ liệu nội dung (1):
- Tour "abc" tham chiếu danh mục không tồn tại: cat_khong_co
```
