# Module Khách sạn: bộ tài liệu triển khai

Ngày chuẩn bị: 2026-11-02. Trạng thái: đã triển khai local trên `feat/hotel-catalog` (module mặc định tắt), chưa release.

## Checkout dành cho agent

- Workspace: `C:/Users/Nguyen Vu/Downloads/Landingpage Tourist`.
- Worktree: `C:/Users/Nguyen Vu/Downloads/Landingpage Tourist/sea-trip-travel-hotels`.
- Branch: `feat/hotel-catalog`.
- Base: `origin/main`, đã fetch thành công ngày 2026-11-02.
- Base SHA: `676ccc5922f9a8e42ef29ed0bc6574e69add0e70`.
- Worktree gốc `sea-trip-travel` ở branch `fix/customer-carousel-entry` có thay đổi chưa commit. Không sửa, stash, reset, clean hoặc lấy những thay đổi đó vào module này.

## Thứ tự đọc

1. Quy tắc workspace và `AGENTS.md` trong checkout; các skill dự án được chỉ định ở đó.
2. [SPEC.md](SPEC.md): phạm vi và quyết định nghiệp vụ.
3. [UI.md](UI.md): bố cục public/admin và trạng thái giao diện.
4. [PIPELINE.md](PIPELINE.md): trình tự triển khai và điều kiện hoàn tất mỗi chặng.
5. [ACCEPTANCE.md](ACCEPTANCE.md), [STATUS.md](STATUS.md): nghiệm thu và ghi nhận bằng chứng.
6. [ADMIN-GUIDE.md](ADMIN-GUIDE.md): hướng dẫn thao tác trên Studio đã triển khai.
7. [IMPORT.md](IMPORT.md): nhập dữ liệu khách sạn từ file bạn có quyền sử dụng.

[AGENT-PROMPT.md](AGENT-PROMPT.md) chứa prompt có thể sao chép sang agent triển khai.

## Mục tiêu

Khách xem khách sạn, hạng phòng, giá và tình trạng tham khảo; gửi nhu cầu lưu trú kèm tour. Sale/admin kiểm tra thực tế, báo giá và xác nhận thủ công. Admin quản lý nội dung, giá theo ngày, số phòng và yêu cầu trong nền CMS hiện có.

Bản đầu phải có home → danh sách → chi tiết → gửi yêu cầu → xử lý admin. Không có thanh toán online, tự động giữ phòng hoặc đồng bộ kho phòng đối tác.

## Quyền thực hiện

Bộ tài liệu là kế hoạch để agent triển khai local khi người dùng giao prompt. Không tự cấp quyền push, tạo PR, merge, deploy hay gửi thông báo thật tới khách. Khi được yêu cầu release sau này, tuân thủ đầy đủ AGENTS.md và CI/CD; không tự push trực tiếp main.

Quota: kiểm tra công cụ usage thật ở đầu việc lớn và khoảng mỗi 15 phút. Dưới 5% ở bất kỳ cửa sổ áp dụng nào thì checkpoint vào `CONTINUE.md` tại worktree này theo quy tắc workspace. Không suy ra quota từ context/token.

## Nguồn tham khảo

Đã đọc nội dung public ngày 2026-11-02; không có quyền truy cập admin của các nguồn này.

- https://vnexpresstour.com/khach-san : lọc và luồng yêu cầu báo giá.
- https://vnexpresstour.com/khach-san/dusit-princess-phu-quoc : hạng phòng, ảnh, tiện ích, giá và yêu cầu.
- https://www.bestprice.vn/khach-san : điểm đến, ngày lưu trú, số khách và tư vấn.
- https://www.ivivu.com/ : nhóm điểm đến, phong cách nghỉ dưỡng và kênh tư vấn.

Chỉ tham khảo cấu trúc UX. Không sao chép ảnh, mô tả, đánh giá hay giá của đối tác thành dữ liệu Sea Trip. Dữ liệu thử phải được ghi rõ là demo và không tự xuất bản production.
