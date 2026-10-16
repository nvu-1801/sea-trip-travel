# Kế hoạch chuyển động landing page tour

Ngày 16/10/2026 — nhánh `feat/travel-soft-motion`. Admin để lượt sau.

## Phương án chọn: sóng biển nhẹ

Giữ màu thương hiệu, Fraunces cho tiêu đề và Be Vietnam Pro cho nội dung. Dùng ảnh tour thật làm trọng tâm; chuyển động hỗ trợ khám phá và CTA tư vấn.

| Khu vực | Chuyển động | Giới hạn |
| --- | --- | --- |
| Nền hero | Mảng màu và ba đường sóng mảnh trôi về vị trí | Một lần, tối đa 4.8 giây, không chặn click |
| Nội dung hero | Hiện lần lượt với độ trễ ngắn | Dùng entrance hiện có, không chờ tải JS |
| Collage | Giữ parallax theo cuộn; badge đi vào nhẹ | Không tự chạy ảnh liên tục; không thay đổi khung layout |
| Section và lưới tour | Dịch lên nhẹ theo cuộn | Không ẩn opacity; trình duyệt không hỗ trợ vẫn đọc đủ |
| Card tour | Nâng 4.8 px, ảnh zoom 3.5%, viền và mũi tên chuyển mềm | Chỉ hover chuột chính xác; touch không bị trạng thái hover dính |
| Bàn phím | Viền focus bao quanh card, đường màu và mũi tên phản hồi | Vùng click/link hiện hữu giữ nguyên |

Không thêm thư viện/client JS cho animation. Chỉ animate transform/opacity; không animate blur hoặc kích thước layout. Tôn trọng prefers-reduced-motion, nội dung vẫn hiện ngay, print không có transform. Hiệu ứng nền kết thúc trước 5 giây và không lặp vô hạn.

## Ảnh và phạm vi dữ liệu

Bao gồm đủ 28 ảnh khách đã đồng ý công khai trong lượt trước. Giữ nguyên byte và tham chiếu; không phóng lớn giả ảnh gốc thấp, gallery chi tiết dùng contain. Giá/chính sách thiếu để sau; không đổi logic thương mại trong lượt motion.

## Trình tự và tiêu chí nghiệm thu

1. Ghi baseline, tạo nhánh từ phần nội dung/ảnh đã chuẩn bị; xác minh remote main trước khi push.
2. Triển khai CSS và markup hero/card/grid. Giữ reveal dưới fold luôn nhìn thấy và không xung đột transform giữa wrapper và card.
3. Chạy lint, typecheck, unit và production build sạch.
4. Browser: trang chủ VI/EN, danh mục, tour; mobile 360/390 px, tablet 768 px, desktop 1440 px; menu/form/tư vấn, ảnh tải thật, console và tràn ngang.
5. Kiểm tra hover, focus bàn phím, reduced-motion, touch, print; chụp và xem ảnh desktop/mobile, sửa lỗi trước commit.
6. Push main chỉ sau khi đạt; không force push. Nếu remote thay đổi phải đối chiếu và kiểm tra lại. Báo rõ trạng thái push và deploy, không coi commit local là deploy.

## Kết quả

Đã triển khai hero/card/grid bằng CSS, không thêm dependency. Sửa card trong flex cell bị co theo nội dung bằng `w-full`; hủy transition đang chạy khi bật reduced-motion. Bổ sung browser checks cho hover, focus, touch, độ rộng card và trang chủ EN.

Lint và typecheck đạt; unit 132/132; production build sạch sinh 107 trang. Đã xác minh 28 URL ảnh trả image/200, không có page error ở lượt chụp hình. Đã xem ảnh hero mobile/desktop và card desktop sau sửa chiều rộng.

Lưu ý QA: cache runtime `.next/server/route-cache` cũ có thể trả HTML/CSS của build trước. Lượt kiểm tra cuối dùng build sạch và cache runtime sạch; runner chạy Next trực tiếp để đóng đúng tiến trình, hỗ trợ `VERIFY_PORT` nhằm dùng cổng riêng. Không tái sử dụng server cũ cho build mới.

Browser production cuối: **174/174 kiểm tra UI đạt**; tour import **88 tổ hợp route/viewport/locale đạt**, không có page error. Kiểm tra gồm desktop/mobile, bố cục VI/EN, menu bàn phím/mobile, date picker, gửi form qua SMTP sink, ảnh/gallery, anchor, print đủ mọi ngày và reduced-motion. Không gửi thư đến khách thật trong kiểm tra.

Remote main trước phát hành: `9996a372b0c3e9d32ccca671a9c86493a22d6a9e`, là tổ tiên của nhánh làm việc. Commit local không đồng nghĩa push/deploy; trạng thái GitHub được ghi riêng sau thao tác.

## Trạng thái phát hành

Push `HEAD:refs/heads/main` thất bại do Git CLI không có thông tin đăng nhập. Thử tạo nhánh qua GitHub connector Primary cũng trả 403 `Resource not accessible by integration`. Chưa cập nhật main và chưa deploy. Không force push. Giữ nhánh local đầy đủ cùng 28 ảnh đã được phép công khai; cần cấp quyền ghi cho repo `nvu-1801/sea-trip-travel` để tiếp tục phát hành.
