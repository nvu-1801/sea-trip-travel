# Kế hoạch triển khai tài chính tour — SEA TRIP TRAVEL

Ngày lập: 27/10/2026. Repo: nvu-1801/sea-trip-travel. Tài liệu bàn giao cho agent tiếp tục; đây là kế hoạch, chưa phải tính năng đã hoàn thành.

## 1. Trạng thái và quy trình tiếp tục
- Đọc AGENTS.md ở main hiện tại trước khi làm, kiểm tra main, PR #18 và thay đổi mới; không dựa cố định vào SHA cũ. Tại lúc lập, main là 54818ce3fd4772efbc0dd699882e23bced2bb609; PR #18 còn mở. Không trộn công việc của PR đó vào tính năng.
- Tạo nhánh `feat/admin-tour-finance` từ origin/main mới nhất, hoặc tên khác nếu trùng. Triển khai từng bước, giữ nguyên dữ liệu hiện có. Chạy `npm run verify:preflight -- --full` trước bất kỳ push nào. Tạo PR, chờ CI đúng SHA; chỉ merge nếu đủ các kiểm tra bắt buộc. Theo dõi CI/deploy main và health theo AGENTS.md. Không bypass gate. Nếu không thực hiện được, ghi rõ blocker, commit/nhánh, lệnh còn thiếu.
- Kế hoạch chưa được push: preflight dừng ở verify:ui do thiếu Google Chrome; lệnh cài Chrome thất bại vì quyền hệ thống. Nhánh local `feat/admin-tour-finance` có file này, chưa commit; cần khôi phục file từ bản bàn giao nếu workspace không còn.

## 2. Mục tiêu sử dụng
Admin xử lý yêu cầu khách, tạo hồ sơ chuyến/tour từ yêu cầu, nhập số tiền bán và các khoản thu/chi; theo dõi doanh thu, chi phí, lợi nhuận theo tháng/năm; bấm vào lợi nhuận để xem tour và khoản mục cấu thành. Thêm tab riêng “Tài chính tour” và tóm tắt phù hợp trên “Tổng quan”, đồng bộ UI admin, mobile và accessibility.

## 3. Hiện trạng đã kiểm tra trên main
- `src/server/cms/db.ts`: SQLite, WAL, foreign keys, schema/migration khởi tạo; session và audit trong cùng DB. `src/server/cms/leads.ts` mã hóa nội dung lead/note; danh sách lead tối đa 500; có thùng rác và tự xóa hết hạn.
- `docs/lead-flow.md` ghi `tourSlug`, `travelDate`, `partySize` đều có thể thiếu. Một yêu cầu tư vấn không chứng minh đã bán hay đã nhận tiền.
- `docs/admin-analytics-agent-train.md` mô tả overview, API stats và pipeline ước lượng dựa trên giá khởi điểm tour cho lead qualified/won; tài liệu cần đối chiếu mã hiện tại. Giá khởi điểm không phải tiền thực thu. Không dùng pipeline hiện tại làm doanh thu hoặc cộng thêm nó vào số tài chính.
- Chưa khảo sát toàn bộ source/PR: xác minh lại status, quyền, đường API, hình thức tour, cấu trúc backup và migration trước khi code.

## 4. Quy tắc nghiệp vụ mặc định đề xuất
1. Không tự tạo thu nhập chỉ vì lead chuyển sang đã xử lý/đã chốt. Từ yêu cầu, admin bấm “Tạo hồ sơ tour”, chọn tour, ngày, số khách, giá bán thực tế và xác nhận. Lead thiếu tour thì admin chọn bổ sung; chống tạo trùng vô tình với transaction/ràng buộc phù hợp. Cho phép nhiều booking từ một lead nếu thực tế phát sinh, nhưng cảnh báo trùng và kiểm soát rõ.
2. Giá trị hợp đồng là doanh thu dự kiến, ghi nhận riêng; không tính là tiền đã thu. Admin nhập từng khoản thu tiền thực tế (cọc, thanh toán tiếp, hoàn tiền) với ngày, số tiền, phương thức, ghi chú; tiền hoàn làm giảm tổng thu. Có thể nhập một khoản thu toàn bộ ngay sau khi chốt nếu đã thu.
3. Khoản chi gắn booking: xe, khách sạn, ăn uống, vé, hướng dẫn, khác; ngày chi, số tiền, diễn giải, trạng thái thực chi. Dự kiến tách riêng. Có thể nhập chi chung không thuộc tour; trình bày riêng, không tự phân bổ để tránh lợi nhuận theo tour sai.
4. Mặc định báo cáo dòng tiền theo ngày thực thu/thực chi, timezone Asia/Ho_Chi_Minh: thu ròng = thu − hoàn; chi thực tế = tổng chi thực tế; lợi nhuận dòng tiền = thu ròng − chi thực tế. Lợi nhuận có thể âm. Hiển thị cảnh báo chi/thu khác kỳ; số này không mặc định là báo cáo kế toán hay lãi cuối cùng của chuyến. Kèm bộ lọc theo tour và drilldown khớp với số tổng. Nếu muốn lợi nhuận trọn chuyến, hiển thị thêm riêng theo booking với toàn bộ khoản thực tế, ghi rõ booking chưa hoàn tất.
5. Tính tiền bằng số nguyên VND, không float; validate số nguyên, giới hạn hợp lý và số dương; loại giao dịch xác định dấu, không cho nhập âm tùy tiện. Dùng cách parse tránh mất precision; định dạng vi-VN. Ghi rõ không bao gồm thuế nếu chưa có dữ liệu thuế.
6. Không xóa/hủy lead làm mất báo cáo: lưu khóa tham chiếu có thể null cùng snapshot tối thiểu của tour/booking, không sao chép thông tin khách nhạy cảm dư thừa; kiểm thử purge lead. Hủy booking giữ lịch sử giao dịch; hoàn tiền được nhập riêng. Quy định xóa/sửa giao dịch: soft delete hoặc bút toán điều chỉnh, audit, xác nhận và tính tổng đúng; không xóa thầm lặng.
7. Chỉ admin đã xác thực mới xem/sửa tài chính; mọi mutation dùng CSRF hiện có, validate server, cache private/no-store, không lộ tài chính ra public API, log/audit không chứa PII hoặc số bí mật không cần thiết.

## 5. Màn hình
- Tổng quan: card doanh thu thực thu, chi thực chi, lợi nhuận dòng tiền kỳ chọn; đường dẫn xem tất cả. Giữ thống kê traffic và pipeline, dán nhãn pipeline là ước tính.
- Tab Tài chính tour: lọc tháng, năm, khoảng ngày, tour/trạng thái; KPI; chart theo tháng/ngày có chú thích; bảng booking với tour, ngày, khách/số khách khi được phép, doanh thu dự kiến, đã thu, chi, lợi nhuận, tình trạng. Bấm một KPI hoặc điểm chart để xem giao dịch/tour cấu thành cùng bộ lọc; phân trang server, trạng thái rỗng/loading/lỗi.
- Chi tiết booking: thông tin tour + nguồn lead, sửa giá bán, trạng thái, thu/chi, hoàn tiền; hiển thị lịch sử chỉnh sửa. Có cảnh báo thay đổi chưa lưu, thao tác mobile, bàn phím và nội dung chữ tương phản, biểu đồ có bảng dữ liệu tương đương.
- Không thêm phụ thuộc biểu đồ nếu chart SVG của dự án đáp ứng; đo thiết kế theo studio.css hiện tại.

## 6. Phương án kỹ thuật cần kiểm tra và triển khai
- Khảo sát `src/features/admin/dashboard.tsx`, `overview.tsx`, `src/server/analytics/store.ts`, `src/server/cms/leads.ts`, `db.ts`, API admin, backup/restore, tests. Thiết kế thêm bảng booking, financial entries và lịch sử phù hợp SQLite; index theo thời gian và tour, FK phù hợp quy tắc retention. Migration additive, idempotent, transactional; không backfill tiền từ giá tour hoặc lead cũ. Backup/restore bao gồm bảng mới và được thử nghiệm trên DB cũ và DB restore.
- Tách domain validation/tính toán, database queries và routes admin; tránh tổng hợp từ danh sách lead bị giới hạn 500. Truy vấn tổng hợp DB có phân trang và giới hạn an toàn, đúng khoảng ngày [đầu kỳ, đầu kỳ kế tiếp) quy đổi múi giờ. Ngăn double submit; kiểm tra cập nhật đồng thời, transaction và version nếu cần.
- Kiểm tra quy tắc lưu trữ snapshot/tour khi tour sửa/xóa. Không làm lộ PII của lead trong audit hay chart; liên kết lead chỉ hiển thị khi còn hợp lệ.

## 7. Kiểm thử nghiệm thu
- Lead mới/contacted/qualified/won/lost không tự tạo doanh thu; tạo booking từ lead thiếu tour; chống ghi trùng; lead bị xóa/purge không làm sai báo cáo.
- Ví dụ: thu 10.000.000, hoàn 1.000.000, chi 6.000.000 → thu ròng 9.000.000, lãi dòng tiền 3.000.000. Trường hợp nhiều kỳ, chi chưa trả, lỗ, zero, trùng yêu cầu, sửa/xóa và đối chiếu drilldown.
- Boundary tháng/năm Việt Nam, timezone UTC của host, năm nhuận, phạm vi rỗng, nhiều hơn 500 lead/booking, VND lớn, validate server; query không cộng trùng khi join nhiều khoản.
- Auth/CSRF, IDOR, input độc hại, không leak public, backup/restore, migration nhiều lần, dữ liệu cũ, thao tác đồng thời, UI trên mobile, bàn phím, biểu đồ và số khớp. Chạy preflight đầy đủ và CI, theo AGENTS.md.

## 8. Quyết định cần xác nhận khi nghiệp vụ thực tế khác
- Có muốn ghi nhận theo tiền thực thu/thực chi như mặc định hay theo giá trị hợp đồng/ngày tour? Có cần thuế, nợ, chi chung/phân bổ? Không tự khẳng định con số quản trị tương đương báo cáo kế toán. Thiết kế giữ dữ liệu gốc để mở rộng.
- Lịch sử tour cũ thiếu số tiền cần admin tự bổ sung; không đoán từ giá niêm yết.
