# Hóa đơn thương mại / đề nghị thanh toán

Tài liệu này mô tả tính năng **Tạo hóa đơn** trong mục *Yêu cầu tư vấn* của SEA TRIP Studio.

## Phạm vi

Đây là **hóa đơn thương mại / đề nghị thanh toán nội bộ**, không phải hóa đơn GTGT hay hóa đơn điện tử đã được cơ quan thuế chấp nhận. Mọi tệp PDF đều ghi rõ điều này ở đầu và chân trang.

Website **không** tự gửi thư cho khách, không tự đính kèm PDF vào Gmail và không đánh dấu đã thanh toán khi tải PDF. Nhân viên tải PDF, mở Gmail, đính kèm tệp và tự bấm Gửi.

## Luồng thao tác

1. Trong thẻ yêu cầu tư vấn, bấm **Tạo hóa đơn**.
2. Form tự điền họ tên, điện thoại, email, tour, ngày đi và số khách từ yêu cầu gốc.
3. Nhân viên nhập đơn giá thực tế, số lượng, giảm giá, thuế/phí, đặt cọc và ghi chú.
4. **Lưu nháp** → **Xem trước** hoặc **Tải PDF**.
5. **Phát hành** khóa nội dung và lưu bản chụp.
6. Quay lại thẻ yêu cầu, bấm **Trả lời bằng Gmail**, đính kèm PDF vừa tải.

Không có giá tour, thuế suất, mã số thuế, số tài khoản hoặc thông tin ngân hàng nào được tự sinh. Nhân viên phải nhập và xác nhận.

## Tính tiền

- Tiền tệ: VND, số nguyên.
- Thành tiền từng dòng = số lượng × đơn giá.
- Tạm tính = tổng các dòng.
- Giảm giá ≤ tạm tính.
- Thuế = `round((tạm tính − giảm giá) × thuế suất / 100)`, làm tròn đến đồng.
- Tổng cộng = tạm tính − giảm giá + thuế + phí khác.
- Đã thanh toán ≤ tổng cộng; còn lại = tổng cộng − đã thanh toán.
- Trạng thái thanh toán suy ra từ số tiền: chưa thanh toán / một phần / đã thanh toán.
- Server luôn tính lại từ dữ liệu đầu vào; tổng do trình duyệt gửi lên không được tin dùng.

## Lưu trữ và bảo mật

Bảng `invoices` trong SQLite:

| Cột | Ý nghĩa |
| --- | --- |
| `seq` | Số thứ tự nội bộ dùng để sinh số hóa đơn |
| `id` | UUID ngẫu nhiên, dùng trong URL |
| `number` | `STT-YYYY-NNNNNN`, duy nhất |
| `lead_id` | Liên kết yêu cầu gốc; `ON DELETE SET NULL` |
| `status` | `draft` hoặc `issued` |
| `payment_status` | `unpaid`, `partial`, `paid` (được tính lại khi đọc) |
| `data` | Toàn bộ hóa đơn, mã hóa AES-256-GCM |
| `snapshot` | Bản chụp mã hóa khi phát hành; PDF đã phát hành đọc từ đây |
| `request_token` | Mã chống tạo trùng khi bấm nhiều lần |
| `revision` | Khóa lạc quan cho bản nháp |
| `issued_at`, `created_at`, `updated_at` | Mốc thời gian |

- Họ tên, email, điện thoại, mã số thuế, ghi chú và số tiền nằm trong payload mã hóa; không ghi ra cột công khai.
- Bản nháp có thể sửa. Hóa đơn đã phát hành bị khóa; muốn điều chỉnh phải lập hóa đơn mới.
- `data` và `snapshot` dùng chung khóa `LEAD_ENCRYPTION_KEY`. Khi khôi phục backup phải dùng đúng khóa cũ.
- Bảng mới được tạo bằng `CREATE TABLE IF NOT EXISTS`, không sửa bảng cũ; backup SQLite hiện có bao gồm bảng này.

## API và quyền

Tất cả endpoint yêu cầu phiên quản trị hợp lệ:

| Endpoint | Việc làm |
| --- | --- |
| `GET /api/admin/invoices?leadId=…` | Danh sách tóm tắt |
| `POST /api/admin/invoices` | Tạo bản nháp (có `createToken`) |
| `GET /api/admin/invoices/:id` | Đọc hóa đơn |
| `PATCH /api/admin/invoices/:id` | Sửa bản nháp (có `revision`) |
| `POST /api/admin/invoices/:id` | `{ action: "issue", revision }` |
| `GET /api/admin/invoices/:id/pdf` | Tải PDF; `?disposition=inline` để xem trước |

POST/PATCH yêu cầu CSRF như các API admin khác. ID là UUID ngẫu nhiên; người chưa đăng nhập nhận `401`, không thể đoán ID để đọc hóa đơn.

## PDF

- Sinh bằng `pdfmake` + font Roboto (hỗ trợ tiếng Việt), khổ A4.
- Logo lấy từ `public/brand/logo-lockup.png` và nhúng dưới dạng data URI.
- Bảng dịch vụ lặp tiêu đề khi sang trang, không tách một dòng giữa hai trang.
- Tên dài, địa chỉ dài và nhiều dòng dịch vụ được xuống dòng, không cắt chữ.
- Bản nháp có watermark **BẢN NHÁP**; bản phát hành không có.
- Tên tệp: `Hoa-don-STT-2026-000123.pdf`.
- PDF được stream trực tiếp từ server; không ghi vào `public/` và không có URL công khai.

## Kiểm thử

```sh
npm test                              # gồm tests/invoice.test.ts và tests/invoice-store.test.ts
npm run test:cms                      # migration, backup, khóa dữ liệu
npm run verify:preflight -- --full    # lint, typecheck, unit, CMS, build, UI
```

`tests/invoice-store.test.ts` kiểm tra mã hóa, chống tạo trùng, khóa lạc quan, snapshot, quyền đọc ở mức store, PDF tiếng Việt và PDF nhiều trang.
