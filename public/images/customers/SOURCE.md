# Nguồn ảnh — Khách hàng & dấu ấn hành trình

Dữ liệu demo được đọc từ section công khai **“KHÁCH HÀNG CỦA CHÚNG TÔI — Những khách hàng đã sử dụng dịch vụ của chúng tôi.”** trên <https://seatriptravel.com/> vào **2026-10-29**.

## Logo (`logos/`)

| Tệp | Đơn vị | Ảnh gốc trên website nguồn |
| --- | --- | --- |
| `smile-go-travel.webp` | Smile Go Travel | <https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T081012.752.jpg> |
| `fpt-telecom.webp` | FPT Telecom | <https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T081005.402.jpg> |
| `hay.webp` | hay | <https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T080947.456.jpg> |
| `bi-pecom.webp` | BI - PECOM | <https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T080918.888.jpg> |
| `vien-phuong.webp` | Viên Phướng | <https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T080900.492.jpg> |
| `vlife.webp` | VLIFE | <https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T081339.825.jpg> |
| `line-technology-vietnam.webp` | LINE Technology Vietnam | <https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T085317.230.jpg> |
| `an-thinh-pharma.webp` | An Thịnh Pharma | <https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T085128.652.jpg> |
| `duoc-pham-xanh.webp` | Dược Phẩm Xanh | <https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T085104.528.jpg> |
| `rise-realty.webp` | Rise Realty | <https://seatriptravel.com/wp-content/uploads/2026/01/rise-realty-header-logo-1536x346-1.webp> |

Gallery nguồn không có chú thích, `alt` hay liên kết cho từng logo. Tên đơn vị trong bảng đọc trực tiếp từ artwork của logo; `href` trong dữ liệu demo để trống thay vì đoán website của đơn vị.

Chuyển đổi khi lưu: cắt viền trắng thừa, thu về tối đa 560 × 280 px, xuất WebP chất lượng 92. Không cắt xén, đổi màu hay vẽ lại nội dung logo.

## Video (`videos/`)

Ảnh bìa là khung hình thật, trích trực tiếp từ bản video 1080p gốc của đúng video YouTube được nhúng trong section nguồn (không dùng thumbnail, không tải lại video). Mỗi ảnh được cắt bỏ viền đen (nếu có), cắt giữa về tỉ lệ 16:9 đúng bằng khung card và xuất JPEG chất lượng 90, không phóng to.

| Tệp | Video | Mốc thời gian | Kích thước |
| --- | --- | --- | --- |
| `cKpNJv2x-3I.jpg` | <https://www.youtube.com/watch?v=cKpNJv2x-3I> | 201,6 s | 1579 × 888 |
| `8ybMTyzbfxo.jpg` | <https://www.youtube.com/watch?v=8ybMTyzbfxo> | 86,0 s | 1920 × 1080 |
| `uRNs9VkZSx4.jpg` | <https://www.youtube.com/watch?v=uRNs9VkZSx4> | 77,52 s | 1920 × 1080 |
| `PebkD6IFJD8.jpg` | <https://www.youtube.com/watch?v=PebkD6IFJD8> | 56,0 s | 1920 × 1080 |
| `tFTWDt5K8pY.jpg` | <https://www.youtube.com/watch?v=tFTWDt5K8pY> | 57,6 s | 1580 × 889 |
| `CcO59qGJLGk.jpg` | <https://www.youtube.com/watch?v=CcO59qGJLGk> | 79,36 s | 1538 × 865 |

Các file có chiều cao nhỏ hơn 1080 đến từ video gốc có viền đen trên/dưới; phần viền đã được cắt, giữ nguyên độ nét gốc thay vì phóng to. Ảnh bìa tùy chỉnh do chủ site tải lên không bị thay đổi. Với sáu ảnh mặc định, URL hiển thị có thêm `?v=2026-11-01` để trình duyệt và bộ tối ưu ảnh của Next.js lấy đúng file mới thay vì bản cache cũ.

Tiêu đề video lấy từ thuộc tính `title` của iframe nguồn và đã đối chiếu qua YouTube oEmbed. Section nguồn không có mô tả riêng cho từng video, nên `body` để trống.

## Ghi chú sử dụng

- Đây là bộ **demo** nạp vào bản nháp trong Studio; không tự xuất bản.
- Logo và khung hình video thuộc quyền của từng đơn vị/SEA TRIP. Chỉ dùng lại khi có quyền sử dụng nội dung từ chủ website.
- Nếu thay bằng ảnh tải lên thư viện, giữ nguyên `alt` mô tả đúng đơn vị/video.
