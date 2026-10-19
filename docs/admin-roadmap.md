# Kế hoạch landing page tour và admin

Cập nhật 18/10/2026: đã triển khai CMS SQLite, admin một chủ, nội dung runtime, media, footer và lead; nguồn chính `sea-trip-travel`, nhánh làm việc hiện tại `main`. Xem [kế hoạch đợt này](IMPLEMENTATION-2026-10.md) và [Docker/VPS/CI/CD](VPS-DEPLOY.md). Các phần dưới giữ làm tiêu chí và hướng dẫn dữ liệu. VPS thực tế và GitHub Secrets sẽ cấu hình sau khi chủ website cung cấp thông tin.

## Phạm vi đã chốt

- Landing page tour có chuyển động nhẹ, tìm nhanh hữu ích trên mobile.
- Một tài khoản chủ quản trị; không tài khoản nhân viên, phân vai, đăng ký công khai hoặc quy trình duyệt nhiều người.
- Admin quản lý tour, bài viết, thư viện ảnh, yêu cầu tư vấn và thông tin trang chủ. Bài viết có nháp, xem trước, xuất bản/ẩn, ảnh đại diện, SEO và ghim nổi bật.
- Người dùng đã cho phép công khai 28 ảnh trích từ tài liệu khách ngày 16/10/2026. Đã khôi phục ảnh và tham chiếu; việc push/deploy báo riêng.
- Thông tin thương mại còn thiếu để sau; giá thiếu không thành 0. Website nhận tư vấn, chưa thanh toán/đặt chỗ tự động.

## Lựa chọn database và hosting

Khuyến nghị SQLite nếu chạy Next.js/backend trên một VPS có ổ đĩa bền vững, ít người ghi dữ liệu. Lưu file DB trên volume local, bật foreign keys, migrations, WAL, busy timeout phù hợp và sao lưu có kiểm chứng phục hồi. Không đặt SQLite trên network filesystem hoặc dùng một file riêng cho mỗi instance.

Nếu giữ frontend Vercel, backend SQLite phải chạy trên VPS/service riêng. Không dùng file SQLite cục bộ trong Vercel Functions vì không có filesystem bền vững dùng chung. Nếu muốn toàn bộ backend serverless, chọn PostgreSQL managed hoặc dịch vụ SQLite từ xa và đánh giá adapter riêng.

Ảnh không lưu BLOB trong DB: dùng object storage hoặc thư mục uploads trên volume bền vững; DB lưu đường dẫn, kích thước, alt, hash. RAM/dung lượng phụ thuộc dữ liệu, index và cách truy vấn; không có tỷ lệ SQLite/PG cố định. PostgreSQL phù hợp hơn khi cần nhiều writer hoặc nhiều instance. Lập lịch backup DB và ảnh, đo latency và contention trước khi quyết định chuyển DB.

Nguồn: https://www.sqlite.org/whentouse.html ; https://sqlite.org/wal.html ; https://vercel.com/kb/guide/is-sqlite-supported-in-vercel

## Tiêu chuẩn ảnh cho khách và admin

| Vị trí                         | Kích thước khuyến nghị     | Mục tiêu dung lượng sau tối ưu |
| ------------------------------ | -------------------------- | ------------------------------ |
| Banner desktop                 | 1920 × 1080 px             | 700 KB–1 MB                    |
| Ảnh bìa tour/bài viết          | 1200 × 800 px (3:2)        | 300–500 KB                     |
| Gallery/nội dung               | Rộng 1600 px, cao theo ảnh | 500–800 KB                     |
| Banner mobile riêng (tùy chọn) | 1080 × 1440 px             | 500–800 KB                     |

Đầu vào JPG/JPEG, PNG, WebP; đề xuất tối đa 10 MB/ảnh. Server xác minh chữ ký/MIME, giới hạn số pixel, tạo tên an toàn và biến thể WebP; không chỉ kiểm tra đuôi. Các mức KB trong bảng là mục tiêu ảnh phục vụ web, khác giới hạn file gốc tải lên. Không phóng lớn giả 28 ảnh Word vốn chủ yếu 400–600 px. Tên file không dấu, có mã tour và thứ tự; alt mô tả địa điểm.

Upload 10 MB phải đi thẳng storage bằng URL ký hoặc qua backend VPS: Vercel Functions giới hạn body request/response 4.5 MB (https://vercel.com/docs/functions/limitations). Xóa ảnh phải kiểm tra còn được tham chiếu; không nhận SVG/HTML thực thi như ảnh nội dung.

## Giao diện và tìm kiếm

Giữ nhận diện SEA TRIP hiện có. Website đã có reveal/parallax và reduced-motion; bổ sung có chọn lọc hero chuyển động nhẹ, card hover, chuyển trạng thái accordion. Không để nội dung vô hình nếu animation lỗi; giữ dùng được bằng bàn phím và tôn trọng reduced-motion.

Tìm nhanh theo tên tour/địa điểm có hoặc không dấu, phối hợp điểm đến, số ngày và khoảng giá; URL lưu bộ lọc, có xóa lọc và trạng thái không kết quả. Giá liên hệ không được coi là tour miễn phí. Kết quả là tour thật, không chỉ chuyển sang trang danh mục. Có phân trang và index; không tải toàn bộ bài viết vào trình duyệt.

Admin có sidebar gọn, header, form rõ ràng, preview và báo lỗi cạnh trường. Có thể tham khảo bố cục admin SDT nhưng không sao chép tính năng nhân sự, phân quyền hoặc quy trình nhiều cấp vào tour.

## Thứ tự thực hiện và nghiệm thu

1. Chốt nơi chạy backend; thiết lập DB, media volume/storage, migrations và backup/restore. Giữ nội dung TS làm seed và đối chiếu sau import.
2. Xây đăng nhập cho một admin: hash mật khẩu, cookie HttpOnly/Secure/SameSite, bảo vệ mutation/CSRF, giới hạn đăng nhập, thu hồi phiên khi đổi mật khẩu. Bootstrap/reset bằng CLI; không mật khẩu mặc định hoặc đăng ký công khai.
3. Tạo bảng tours, pricing options, itinerary, articles, media, categories/destinations, leads, settings và sessions. Validate bằng domain schema hiện tại, không tin dữ liệu form/DB. Bảo toàn id/slug; đổi slug phải có redirect.
4. Chuyển repository sang DB. Các hàm đọc có thể thành async: phải cập nhật caller/routes/tests; không hứa giữ nguyên toàn bộ chữ ký hoặc app routes. Xác minh cache, nội dung riêng tư không cache công khai, invalidation sau publish và slug mới hoạt động mà không rebuild.
5. Xây màn hình tour/bài viết/media và import dữ liệu hiện có; nháp không xuất hiện trong tìm kiếm, sitemap, JSON-LD hoặc trang public. Theo dõi updatedAt thật, kiểm tra VI/EN và fallback bản dịch.
6. Hoàn thiện tìm nhanh và animation; lưu lead trước khi gửi email, có xử lý retry để lỗi mail không mất yêu cầu.
7. Kiểm tra đăng nhập/phân tách public-admin, upload sai định dạng/quá lớn, publish/ẩn/slug, lọc giá liên hệ, cache, backup restore, mobile, reduced-motion và các luồng tư vấn. Chạy typecheck/lint/unit/build và browser regression phù hợp.
8. Commit/push nhánh, chỉ merge main sau khi kiểm tra đạt; xác minh deploy theo commit SHA và smoke test production. Quyền đọc repo không đồng nghĩa quyền ghi; hiện connector trả 403 khi tạo nhánh repo tour.

## Dữ liệu để bổ sung sau

Còn thiếu file thứ 14, giá bảy tour một ngày, thời hạn giá/phụ thu, bản dịch EN đầy đủ và tài liệu cho một số tour demo. Không tự bịa nội dung để lấp mục trống.
