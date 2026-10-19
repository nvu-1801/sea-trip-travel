# SEA TRIP — kế hoạch triển khai 18/10/2026

Nguồn chính: `sea-trip-travel`, nhánh hiện tại `main`. Phục hồi các file thiếu từ GitHub main `95c9512`, chỉ bổ sung file chưa tồn tại. Thư mục QA không có file nguồn để đối chiếu; bản main đã chứa toàn bộ motion và 28 ảnh của lượt trước.

## Phạm vi

Một chủ quản trị; CMS tour, bài viết, danh mục, điểm đến, nội dung VI/EN, footer, media và yêu cầu tư vấn. SQLite trên volume VPS; giữ seed TypeScript để khởi tạo. Mật khẩu hash scrypt, session ngẫu nhiên chỉ lưu hash, cookie HttpOnly/SameSite/Secure, kiểm tra Origin, giới hạn đăng nhập và audit. Không mã hóa/obfuscate JavaScript công khai như biện pháp bảo mật; bí mật chỉ ở server.

## Công việc

- [x] Đọc chat SDT, khảo sát roadmap và phục hồi nguồn.
- [x] Tạo SQLite, seed, revision, nháp/xuất bản/thùng rác và kiểm tra tham chiếu.
- [x] Xây đăng nhập một admin, bootstrap/reset CLI, đổi mật khẩu và thu hồi phiên.
- [x] Tạo dashboard CMS responsive, form chỉnh sửa cấu trúc, media và lead.
- [x] Kết nối public với nội dung runtime, tìm tour và footer chỉnh sửa được.
- [x] Nâng motion nền/scroll có nút tạm dừng, reduced-motion và bàn phím.
- [x] Thêm Docker/Caddy, backup/restore, CI và script deploy main có health check/rollback.
- [x] Chạy lint/typecheck/unit/build, browser CMS/public và bảo mật.

## Nghiệm thu local

- Lint và typecheck đạt; production build thành công với `output: standalone`.
- Unit cũ 132/132, CMS 13/13; UI public 174/174; tour 88 tổ hợp; CMS browser 31/31.
- CMS browser dùng DB/uploads/tài khoản/khóa tạm riêng: đăng nhập, CSRF/Origin, footer/tên thương hiệu/liên hệ, nháp/xuất bản/tour mới, danh mục mới, EN, stale writes, thùng rác/sitemap, upload giả, đủ 28 ảnh gốc, chống xóa ảnh đang tham chiếu, lead/email lỗi, ghi chú sale mã hóa, tìm kiếm không dấu, pause motion, form bài viết có khối, responsive 360/390/768 và thu hồi session.
- Đã xem ảnh chụp landing desktop và admin desktop/mobile. 28 file ảnh gốc không thay đổi trong Git diff.
- `npm audit --omit=dev` báo 0 advisory tại lần kiểm tra. Đây là kết quả tại thời điểm chạy, không thay cho cập nhật định kỳ.
- Compose config hợp lệ; YAML workflow parse được; `bash -n scripts/deploy/deploy.sh` đạt.
- **Chưa xác minh build/run container:** Docker CLI trên máy không lấy được thông tin Server/Engine, kể cả khi thử ngoài sandbox. Không coi kiểm tra Compose là đã build image. CI đã có bước build image và smoke test container read-only/persistent volume trên Linux.

## Những lỗi đã sửa trong lượt này

Nút pause nhỏ hơn 44px; fallback Zalo biến mất khi chuyển settings; partial EN tự sinh mảng rỗng làm mất lịch trình; bản dịch seed cũ sau khi sửa nguồn; thay tab nhanh có thể giữ form/dữ liệu tab trước. Đã thêm regression phù hợp và dùng dropdown tham chiếu/biên tập khối để tránh yêu cầu chủ quản trị nhập JSON hoặc mã danh mục.

## Trạng thái bàn giao

Code nằm trong working tree nhánh `main` của `sea-trip-travel`; chưa commit/push bản CMS này, chưa cấu hình GitHub Secrets hoặc deploy VPS. Cấu hình VPS được để sau theo yêu cầu người dùng. Không ghi đè file local trong bước phục hồi; không sử dụng secrets hoặc hạ tầng SDT.

## Triển khai thực tế

Cần domain/IP, SSH user/port và đường dẫn VPS SEA TRIP. Không dùng thông tin bí mật hoặc hạ tầng SDT mặc định. Workflow deploy chỉ chạy sau CI thành công, pin host key, kiểm tra SHA main, volume bền vững, xác minh `/api/health` theo SHA. Không coi chuẩn bị file Docker là đã deploy.
