# Chính sách bảo mật

## Phạm vi hỗ trợ

Các bản sửa bảo mật được áp dụng trên nhánh `main` và đi qua quy trình PR/CI của dự án. Không cam kết bảo trì các bản triển khai cũ hoặc nhánh tùy biến. Người vận hành cần cập nhật bản đã kiểm chứng và giữ bản sao dữ liệu có thể phục hồi.

## Báo cáo vấn đề riêng tư

Dùng [GitHub Private Vulnerability Reporting](https://github.com/nvu-1801/sea-trip-travel/security/advisories/new) nếu repository đã bật tính năng này. Nếu không khả dụng, liên hệ trực tiếp người quản lý repository qua kênh riêng đã thống nhất. Không mở issue công khai chứa chi tiết khai thác hoặc dữ liệu khách hàng.

Báo cáo nên gồm commit bị ảnh hưởng, endpoint hoặc thành phần, điều kiện tái hiện, tác động và ví dụ đã khử dữ liệu nhạy cảm. Không gửi mật khẩu, cookie phiên, khóa mã hóa, file `.env`, database hoặc backup thật. Chỉ thử nghiệm trên môi trường có quyền kiểm tra; tránh tác động đến khách hàng và production.

## Quản lý cấu hình và khóa

- Các file `.env*.example` là tài liệu mẫu. Giá trị thật chỉ đặt trong file môi trường riêng; production đặt quyền `600`.
- Không đưa secret vào biến `NEXT_PUBLIC_*`: các giá trị đó có thể xuất hiện ở trình duyệt. Việc không có tiền tố này không tự bảo đảm dữ liệu sẽ không bị code hoặc log làm lộ.
- Không dùng cùng secret giữa development và production. Không gửi secret qua issue, PR, ảnh chụp hoặc log CI.
- `LEAD_ENCRYPTION_KEY` phải được lưu an toàn cùng kế hoạch backup. Mất khóa khiến payload lead không thể giải mã. Đổi khóa cần quy trình di chuyển dữ liệu, không chỉ sửa env.
- Khi phát hiện credential bị lộ, thu hồi/đổi credential và kiểm tra phạm vi truy cập. Xóa khỏi commit mới không xóa các bản sao trong lịch sử Git.

## Điều kiện vận hành

Production cần HTTPS, `ADMIN_COOKIE_SECURE=true`, origin đúng và reverse proxy đáng tin cậy ghi đè header IP. Không mở trực tiếp cổng ứng dụng ra Internet. Sao lưu phải được mã hóa, có bản ngoài VPS và được kiểm tra phục hồi.

Xem [rà soát bảo mật](docs/SECURITY-REVIEW.md), [CI/CD](docs/CI-CD.md) và [backup](docs/BACKUP-RESTORE.md). Các kiểm soát trong source không thay thế việc kiểm tra cấu hình đang chạy hoặc đánh giá độc lập.
