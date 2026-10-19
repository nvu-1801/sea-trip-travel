# Đồng bộ nội dung đang mở

## Hành vi

- Khi `CMS_ENABLED=1`, landing/public và admin kiểm tra phiên bản dữ liệu mỗi 5–5,5 giây khi tab đang hiển thị và có mạng.
- Thay đổi xuất bản, ẩn hoặc xoá mềm bản public khiến trang đang mở lấy lại Server Components bằng `router.refresh()`. Không tải lại toàn bộ document; các Client Components giữ state không bị thay thế.
- Lưu nháp, lead và thư viện ảnh không phát thay đổi public. Khôi phục thành nháp không làm nội dung trở lại website.
- Danh sách admin tự tải dữ liệu mới, giữ bộ lọc/từ tìm kiếm. Nếu đang mở editor hoặc có trường chăm sóc khách/mô tả ảnh chưa lưu, hiển thị thông báo cập nhật thay vì ghi đè. Nút Tải cập nhật yêu cầu xác nhận nếu có dữ liệu chưa lưu. Kiểm tra revision lúc lưu vẫn chống ghi đè phiên cũ.
- Tab ẩn dừng polling. Khi có focus, trở lại tab hoặc có mạng, kiểm tra ngay. Lỗi mạng dùng backoff tối đa 60 giây và không xoá nội dung đang hiển thị.
- Đây là đồng bộ gần realtime, không phải push tức thì hoặc trình biên tập cộng tác. Độ trễ còn phụ thuộc mạng/server và trạng thái form. Sau lỗi mạng, lần kiểm tra tự động có thể trễ theo backoff.

## Cơ chế

`cms_versions` lưu hai counter `public` và `admin`. SQLite triggers cập nhật counter trong cùng giao dịch với thay đổi `records`, `media`, `leads`. Counter không nằm trong bộ nhớ Node và chỉ có hiệu lực khi giao dịch commit; nhiều tiến trình cùng đọc một DB quan sát cùng phiên bản.

`GET /api/content-version` chỉ trả counter public. `GET /api/admin/changes` yêu cầu session và chỉ trả counter admin. Hai endpoint hỗ trợ ETag/304; không đưa nội dung, tên bản ghi, thông tin nháp hay dữ liệu khách vào response phiên bản. API dữ liệu admin giữ kiểm tra quyền như trước.

Client kiểm tra counter nhỏ và chỉ tải snapshot khi counter thay đổi; có jitter để giảm các lượt polling cùng thời điểm. Không cần WebSocket, SSE, Redis, kết nối dài hoặc sticky session cho quy mô hiện tại.

## Giới hạn mở rộng

SQLite vẫn dành cho một VPS với ổ đĩa bền vững, không đặt file trên NFS và không tạo các replica với DB riêng. Counter không biến SQLite thành DB phân tán. Khi mở rộng nhiều máy, cần chuyển DB và counter giao dịch sang nguồn dữ liệu dùng chung (ví dụ PostgreSQL), đồng thời chuyển uploads sang object storage. Có thể giữ API kiểm tra phiên bản và client hiện tại.

Khi lưu lượng kiểm tra phiên bản trở thành đáng kể, đo tải thực tế rồi cân nhắc cache counter dùng chung hoặc SSE/pub-sub có xác thực. Không bật cache CDN cho endpoint admin. Chưa có kiểm thử tải để cam kết số người dùng đồng thời.

## Kiểm chứng

- `npm run test:cms`: nháp/public/xoá/khôi phục, giao dịch rollback, tiến trình khác ghi cùng DB, ETag/304 và response không có nội dung riêng tư.
- `npm run verify:cms`: các browser đang mở nhận cập nhật footer/danh sách/Thùng rác, giữ input khách và editor chưa lưu, bắt kịp khi trở lại tab hoặc có mạng; dùng DB/uploads/tài khoản tạm.
- `npm run verify:ui` và `npm run verify:tour-import`: regression giao diện và trang tour.

VPS đang được chuẩn bị riêng; thay đổi này không đồng nghĩa đã commit, push hoặc deploy production.
