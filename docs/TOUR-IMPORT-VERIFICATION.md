# Kiểm chứng code và dữ liệu tour ngày 16 tháng 10 năm 2026

## Phạm vi bản phát hành

Áp dụng 11 chương trình phân biệt từ 13 file Word; có hai cặp trùng nội dung. Người dùng dự kiến 14 file, còn thiếu một file chưa xác định. Catalogue có 22 tour: 11 chương trình từ tài liệu khách và 11 chương trình demo chưa có tài liệu đối ứng. Giữ các slug cũ.

Người dùng đã xác nhận công khai 28 ảnh ngày 16/10/2026. Nhánh `feat/tour-admin-preparation` đã khôi phục đủ ảnh cùng tham chiếu; các kết quả browser bên dưới thuộc lượt kiểm tra trước khi khôi phục và được ghi rõ để không nhầm với xác minh production. GitHub vẫn trả 403 khi tạo nhánh; chưa push/merge/deploy.

## Kết quả rà soát logic

- Bốn tour dài ngày có bốn gói lưu trú; giá người lớn/trẻ em đúng bảng Word. Giá từ là gói không khách sạn, chưa VAT, có ghi chú cần xác nhận thời điểm.
- Bảy tour một ngày chưa có giá, tiếp tục hiển thị Liên hệ tư vấn.
- Chính sách trẻ em 50% và 60% giữ theo từng tour; đọc bảng bao gồm/không bao gồm theo từng ô, không trộn hai cột.
- Hai tuyến QN–PY 4N3Đ có điểm trả khác nhau và được lưu thành hai tour; ST10 không cam kết xe đón Quy Nhơn.
- Bản dịch demo cũ không được ghi đè lịch trình, bữa ăn và bảo hiểm của nguồn mới. EN chưa duyệt vẫn noindex; dữ liệu thiếu được fallback VI với thông báo.
- Form gửi đúng tourSlug, không báo thành công khi gửi mail thất bại; không bổ sung đặt chỗ hay thanh toán trực tuyến.

## Lỗi đã sửa trong lượt rà soát bổ sung

1. Các ngày lịch trình đóng accordion bị ẩn khi in/PDF. CSS print nay mở nội dung details-content để bản in có đủ mọi ngày; không thay trạng thái accordion trên màn hình.
2. Breadcrumb JSON-LD tiếng Anh bị thêm /en hai lần ở tour và danh mục. Chỉ thêm locale vào đường dẫn chưa được bản địa hóa; kiểm tra browser bao gồm cả hai loại trang.

Các bản sửa trước đó vẫn được giữ: vòng lặp rewrite tiếng Việt, lockfile làm npm ci thất bại, typecheck chưa sinh route types, anchor trỏ tới phần ẩn và khoảng trống chính sách.

## Kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Production build sạch | Đạt, 107 trang; kiểm tra CSS print mới thực sự nằm trong bundle |
| Typecheck và lint | Đạt |
| Unit tests | 132/132 |
| Browser tour import | Đạt 88 tổ hợp tour/ngôn ngữ/viewport; thêm kiểm tra breadcrumb tour và danh mục EN |
| Browser UI toàn site | Đạt 162/162, gồm kiểm tra mọi ngày lịch trình khi in |
| Print trực tiếp trên production build | Tất cả 4 ngày hiển thị, gồm 3 accordion đang đóng |
| Giá và form | Đạt; kiểm tra gửi email dùng SMTP sink cục bộ, không gửi tới người thật |

Browser chạy Chromium 153 ở 360/390/768/1440 px, thêm breakpoint hotline 1536 px. Ảnh chưa công khai được kiểm tra bằng placeholder; kiểm tra file ảnh chỉ áp dụng khi src đã được cung cấp.

## Phần chưa xác minh hoặc chờ bổ sung

Ảnh gốc độ phân giải cao, file thứ 14, hạn áp dụng giá, phụ thu, bản dịch EN đầy đủ và tài liệu cho các tour demo còn lại được bổ sung sau. Không suy dữ liệu thiếu thành giá 0 hoặc cam kết thương mại. Ranh giới phí hủy chưa đủ kín để tự động tính phí; web chỉ nhận tư vấn. SMTP production và hộp thư thật chưa được kiểm chứng trong môi trường này.

Trạng thái phát hành được kiểm tra theo SHA trên GitHub/Vercel và báo riêng; không coi việc tạo commit là deploy thành công.

## Kiểm tra sau khi khôi phục ảnh được phép công khai

Nhánh chuẩn bị admin: typecheck đạt, unit tests 132/132. Đủ 28 file ảnh, hash khớp bản nhập gốc; đường dẫn ảnh được khôi phục trong tour/danh mục/điểm đến đều tồn tại. Chưa chạy lại browser trên build mới có ảnh; kết quả browser phía trên thuộc bản trước đó. Admin, database và tìm kiếm mới là kế hoạch, chưa triển khai.

## Đợt hoàn thiện motion và ảnh

Nhánh `feat/travel-soft-motion`: production build sạch 107 trang, lint/typecheck đạt, unit 132/132, UI 174/174, tour import 88 tổ hợp đạt. 28 ảnh đã được người dùng cho phép công khai và URL tĩnh trả 200. Đã sửa card bị co chiều rộng trong lưới, bổ sung nền sóng nhẹ/hover/reveal và dừng transition ngay khi reduced-motion. Xem `docs/TRAVEL-MOTION-PLAN.md`. Kết quả này thay thế giới hạn browser dùng placeholder của đợt trước; chưa coi là deploy thành công.
