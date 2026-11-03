# Prompt cho agent triển khai

Sao chép toàn bộ đoạn dưới vào agent làm việc trong workspace này:

```text
Triển khai hoàn chỉnh module Khách sạn & nghỉ dưỡng cho Sea Trip Travel theo bộ tài liệu đã chuẩn bị. Hãy thực hiện code và kiểm thử local, không chỉ lập lại kế hoạch.

Làm việc tại:
C:\Users\Nguyen Vu\Downloads\Landingpage Tourist\sea-trip-travel-hotels
Branch bắt buộc: feat/hotel-catalog
Base lúc tạo: 676ccc5922f9a8e42ef29ed0bc6574e69add0e70

Đầu tiên đọc AGENTS.md tại workspace cha và repo, quota-handoff-rule.md ở workspace cha, cùng các skill dự án được chỉ định. Kiểm tra usage limits thật, git status/branch/HEAD/worktree. Repo gốc sea-trip-travel có công việc chưa commit thuộc carousel/menu: giữ nguyên, không stash/reset/clean/copy hoặc đưa vào task này. Nếu branch/path không đúng, dừng thao tác ghi ở đó và xác định lại worktree đã có; không tạo đè branch mới.

Đọc docs/hotels/README.md, SPEC.md, UI.md, PIPELINE.md, ACCEPTANCE.md và STATUS.md. Triển khai tuần tự P0 đến P5, cập nhật STATUS.md sau từng chặng bằng command và kết quả thật. Tự xử lý các quyết định kỹ thuật thông thường dựa trên code hiện có, không hỏi lại từng bước. Không tự spawn agent hoặc tạo chat khác.

Phạm vi bắt buộc: section home và navigation; danh sách có tìm/lọc; chi tiết khách sạn/gallery/hạng phòng; admin nội dung, phòng, giá theo ngày, tình trạng phòng, nháp/xuất bản và feature flag; yêu cầu khách sạn kèm tour vào luồng lead/admin hiện có, liên kết booking khi đã chốt. Giữ brand/theme, VI/EN, security và stack hiện tại.

Khách chỉ xem và gửi nhu cầu; không thanh toán online, không giữ chỗ tự động. Mặc định tình trạng phòng là cần xác nhận; số lượng nhập tay theo ngày là tham khảo, không phải kho realtime. Không trừ phòng khi gửi lead. Tour đã bao gồm khách sạn không được cộng tiền lưu trú lần nữa. Thiếu giá/điều kiện thì cần báo giá, không coi là 0. Tắt module phải chặn cả public routes/API và yêu cầu mới, vẫn giữ dữ liệu/admin và lead tour bình thường.

Thiết lập database/uploads/transport email test riêng; không dùng dữ liệu production hay gửi email/Zalo thật. Không tự xuất bản nội dung demo. Đọc Next.js docs cài tại node_modules trước khi code framework; cài dependency theo lockfile nếu thiếu, không thay stack.

Kiểm thử các rule tiền/ngày/phòng, auth/CSRF/public projection, persistence, lead retry/mail failure và hồi quy tour/finance. Kiểm tra giao diện thật trên desktop/mobile, bàn phím và VI/EN. Chạy npm run verify:preflight -- --full và npm run security:check tại worktree này; không bỏ qua hoặc nới checks. Nếu sửa hạ tầng, chạy thêm Docker build/smoke theo AGENTS.md. Ghi rõ mọi check chưa chạy hoặc bị blocker; không báo hoàn tất nếu gate bắt buộc chưa pass.

Tiếp tục đến khi hoàn tất local hoặc có blocker thực sự cần người dùng. Kiểm tra quota theo quy tắc workspace; nếu dưới 5% ở cửa sổ áp dụng, làm checkpoint CONTINUE.md đầy đủ và cho prompt tiếp tục. Không hứa giám sát sau khi kết thúc turn.

Chưa commit, push, tạo PR, merge hoặc deploy. Khi xong, báo branch/path, chức năng đã làm, kết quả kiểm thử thực tế, cách chạy/xem local và phần còn thiếu. Viết hướng dẫn admin dựa trên UI thật vào docs/hotels/ADMIN-GUIDE.md. Không yêu cầu tôi làm thay các bước đã giao cho agent.
```
