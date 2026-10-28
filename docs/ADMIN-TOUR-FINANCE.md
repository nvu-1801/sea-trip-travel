# Tài chính tour — hướng dẫn vận hành

Trạng thái: MVP đã triển khai trên nhánh `feat/admin-tour-finance` ngày 28/10/2026. Chưa merge, chưa deploy.

## 1. Nguyên tắc số liệu

- **Giá bán trên hồ sơ** là giá trị hợp đồng dự kiến. Không phải tiền đã thu.
- **Doanh thu thực thu** chỉ đến từ khoản Thu tiền đã đánh dấu thực tế, trừ khoản Hoàn tiền.
- **Chi thực tế** chỉ cộng khoản Chi phí đã đánh dấu “Đã thực chi”. Khoản dự kiến vẫn lưu để theo dõi nhưng không vào dòng tiền.
- **Lợi nhuận dòng tiền** = thu ròng − chi thực tế. Có thể âm.
- Trạng thái lead (Mới, Đã liên hệ, Tiềm năng, Đã chốt) **không tự tạo doanh thu**. Phải tạo hồ sơ và nhập khoản thu thực tế.
- Số liệu là dòng tiền quản trị, **không phải báo cáo kế toán**, chưa gồm thuế hoặc phân bổ chi chung.
- Mọi thao tác tạo/sửa/hủy đều ghi audit. Hủy giao dịch là soft void, không xóa lịch sử.

## 2. Cách sử dụng

1. Vào **Studio → Bán hàng → Tài chính tour**.
2. Chọn kỳ (Tháng này / Tháng trước / Năm nay hoặc từ–đến), tour và trạng thái.
3. Bấm **Tạo hồ sơ tour**:
   - Có thể chọn một **Yêu cầu tư vấn** để điền trước tour/ngày/số khách.
   - Chọn tour, ngày đi, số khách, giá bán thực tế và trạng thái.
   - Nếu hệ thống phát hiện hồ sơ cùng lead + tour + ngày, sẽ cảnh báo và cho xác nhận tạo thêm.
4. Mở hồ sơ bằng nút **Xem**:
   - Sửa trạng thái, ngày đi, số khách, giá bán, ghi chú.
   - Thêm **Thu tiền**, **Hoàn tiền**, **Chi phí**. Chi phí có nhóm, phương thức và lựa chọn thực chi/dự kiến.
   - Sửa giao dịch bằng nút **Sửa**; hủy bằng nút **Hủy** (có xác nhận).
   - Xem lịch sử chỉnh sửa và tổng thu/chi/lợi nhuận của hồ sơ.
5. Từ **Yêu cầu tư vấn**, bấm **Tạo hồ sơ tour** để mở thẳng form với yêu cầu đã chọn.
6. **Tổng quan** có card dòng tiền tháng hiện tại và liên kết sang tab Tài chính tour.

## 3. Dữ liệu và API

Bảng SQLite mới (additive, tự tạo khi khởi động):

- `tour_bookings`: hồ sơ tour, snapshot `tour_title`, `travel_date`, `party_size`, `sale_amount`, `status`, `revision`; `lead_id` chỉ là tham chiếu có thể null, không chứa PII.
- `tour_finance_entries`: khoản thu/hoàn/chi, `actual`, `revision`, soft void `deleted_at`, `deleted_reason`.
- Audit dùng bảng `audit` hiện có; target `finance/booking/<id>` hoặc `finance/expense/<id>`.

API admin:

- `GET /api/admin/finance?from=&to=&tour=&status=&page=&pageSize=` — báo cáo + phân trang hồ sơ + trend.
- `GET /api/admin/finance?booking=<id>` — chi tiết hồ sơ, giao dịch, lịch sử.
- `POST /api/admin/finance` — `create-booking`, `update-booking`, `create-entry`, `update-entry`, `void-entry`.

Tất cả route dùng session + CSRF hiện có, trả `cache-control: no-store`, không lộ ra public API.

## 4. Kiểm thử

- `tests/tour-finance.test.ts`: ngày, VND, kỳ báo cáo, schema.
- `tests/tour-finance-store.test.ts`: idempotency, snapshot, chống trùng, tổng hợp nhiều khoản, loại chi dự kiến, soft void, revision conflict, lịch sử.
- `scripts/verify-cms.mjs`: mở tab, tạo hồ sơ, thêm và sửa giao dịch trên trình duyệt thật.
- Chạy `npm run verify:preflight -- --full` trước khi push/PR.

## 5. Giới hạn hiện tại

- **Chi phí chung** nhập bằng nút cùng tên trên tab Tài chính tour; khoản này vào dòng tiền chung nhưng không phân bổ vào một hồ sơ.
- Chưa có export Excel/CSV, thuế, công nợ, phân bổ chi chung hoặc nhiều loại tiền tệ.
- Chưa có biểu đồ SVG chi tiết theo ngày; tab dùng thanh bar theo kỳ kèm bảng số liệu tương đương.
- Không tự lấy thumbnail/giá tour làm doanh thu; owner phải nhập số thực tế.
- Backup/restore dùng nguyên file SQLite nên các bảng mới đi theo backup; chưa thêm thống kê riêng vào manifest.
