# Trang chủ: sửa vùng miền trong một form

## Phạm vi

- Trang chủ → Tour theo vùng miền: sửa tiêu đề, giới thiệu, dòng cảm xúc và các thẻ vùng miền.
- Mỗi thẻ có tên, mô tả địa điểm, tải/chọn ảnh, mô tả ảnh và xem trước.
- Dùng chung bản ghi Danh mục, không tạo bản sao dữ liệu. Tên/ảnh/mô tả cũng cập nhật ở các vị trí dùng danh mục đó.
- Chỉ đưa các vùng đang có bản xuất bản vào form; vùng đã ẩn/xóa không tự xuất hiện trở lại.
- Số hành trình được tính từ tour, đường dẫn và cấu trúc danh mục không sửa tại đây.

## Lưu và xuất bản

1. Tải bản nháp cùng revision của landing và các danh mục vùng miền.
2. Gửi một yêu cầu có xác thực phiên và CSRF đến `/api/admin/home-regions`.
3. Lưu cả phần giới thiệu và các thẻ trong một giao dịch SQLite. Lỗi hoặc revision cũ ở bất kỳ bản ghi nào sẽ rollback toàn bộ, gồm audit và phiên bản nội dung.
4. Lưu nháp giữ nguyên nội dung công khai. Xuất bản chỉ cập nhật `regions` và tên/tagline/ảnh của các thẻ; bản nháp ở các trường/phần khác được giữ riêng.

## Hướng dẫn ảnh trong mọi form

Ô ảnh dùng chung luôn hiện kích thước đề xuất, kể cả khi chưa có ảnh. Banner: 1920 × 1080; tour vuông: 1200 × 1200; ảnh chia sẻ: 1200 × 630; vùng miền dọc: 1200 × 1600; ảnh nội dung/điểm đến: từ 1600 × 1200 px. Thư viện ảnh có tóm tắt các kích thước. Đây là gợi ý chất lượng, không ép cắt hoặc đổi ảnh đã tải.

## Kiểm tra phát hành

- Lint, typecheck, unit/CMS tests và production build.
- CMS test: nháp không rò rỉ; publish đúng trường; conflict và ID sai/trùng rollback toàn bộ.
- Browser CI: mở form từ Trang chủ, sửa thẻ, kiểm tra hướng dẫn ảnh, lưu nháp rồi xuất bản; kiểm tra chiều rộng modal trên điện thoại.
- Theo dõi GitHub Actions và xác nhận health endpoint trên domain chính trả đúng SHA sau deploy.
