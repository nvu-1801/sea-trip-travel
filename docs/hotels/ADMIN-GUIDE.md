# Hướng dẫn quản trị module Khách sạn

Tài liệu này mô tả đúng những màn hình đang có trong SEA TRIP Studio sau khi triển khai local. Ảnh kiểm thử nằm trong `verify-screenshots/hotels/` (không commit).

## 1. Bật module

Vào **Studio → Khách sạn**.

- **Bật module Khách sạn**: mở menu, trang danh sách `/khach-san`, trang chi tiết, form nhận yêu cầu và API báo giá.
- **Hiện section khách sạn trên trang chủ**: chỉ ảnh hưởng khối trên trang chủ; danh mục vẫn mở nếu module đang bật.
- **Khách sạn nổi bật**: tick tối đa 6 khách sạn, thứ tự theo lần tick. Không tick gì thì trang chủ dùng thứ tự đề xuất trong danh sách.
- Hai công tắc chỉ có hiệu lực sau khi lưu & xuất bản (nút lưu nằm ngay dưới). Tắt module **không xoá** nội dung, hạng phòng, giá hay yêu cầu cũ; public trả 404, API báo giá đóng, form mới bị từ chối, lead tour vẫn chạy bình thường.

## 2. Tạo và xuất bản khách sạn

1. Bấm **+ Thêm khách sạn**. Hệ thống tạo bản nháp với tên tạm.
2. Tab **1 · Thông tin**: tên, slug (tự sinh từ tên khi còn trống; sau khi đã lưu thì giữ cố định để không phá liên kết), tỉnh/thành, điểm đến liên kết, địa chỉ, link bản đồ `https`, loại lưu trú, hạng sao + **căn cứ hạng sao** (bắt buộc nếu chọn sao), giờ nhận/trả phòng, thứ tự đề xuất, giới thiệu, điểm nổi bật, tiện ích, chính sách, SEO và bản tiếng Anh.
3. Tab **2 · Ảnh & tiện ích**: ảnh bìa là ảnh đầu tiên; mỗi ảnh có alt bắt buộc; nút ↑/↓ đổi thứ tự; ảnh có thể chọn từ thư viện hoặc tải lên (JPEG/PNG/WebP, tối đa 10 MB, tự chuyển WebP).
4. Tab **3 · Hạng phòng**: xem/sửa từng hạng phòng, hoặc **+ Thêm hạng phòng**. Mỗi phòng lưu/xuất bản riêng, có ảnh, sức chứa, chính sách trẻ em/giường phụ.
5. Tab **4 · Giá & tình trạng**: nhập giá và số phòng tham khảo (mục 3–4 bên dưới).
6. Tab **5 · Tour & xuất bản**: gắn tour, xem tóm tắt công khai, **Lưu nháp**, **Lưu & xuất bản**, **Ẩn khỏi website** hoặc **Lưu trữ**.
7. **Xem trước** mở bản đã lưu ở chế độ chỉ quản trị thấy. Bản nháp không xuất hiện trên website, sitemap hay tìm kiếm.

Lưu ý: lưu nháp một khách sạn đã xuất bản **không** đổi nội dung công khai; bản đã xuất bản vẫn chạy cho tới khi bấm Lưu & xuất bản.

## 3. Giá theo ngày

Trong tab 4, chọn hạng phòng ở hàng tab phía trên.

- **Giá cơ bản**: một mức cho mọi đêm. Mỗi hạng phòng chỉ có một giá cơ bản.
- **Theo thứ**: chọn các thứ áp dụng (T2…CN) và một mức giá.
- **Khoảng ngày**: từ ngày – đến ngày (gồm cả đêm cuối), dùng cho cao điểm/lễ.
- Thứ tự ưu tiên khi tính tiền: **khoảng ngày > theo thứ > giá cơ bản**.
- Hai quy tắc cùng mức ưu tiên chồng lấn sẽ bị chặn và **không lưu gì cả**.
- Mỗi dòng có cờ **Bao gồm ăn sáng**, **Đã gồm thuế/phí** và ô **Phụ thu chưa xác định**. Có phụ thu chưa rõ số tiền thì website hiện “Cần báo giá”, không cộng bừa.
- Giá luôn là **VND cho một phòng một đêm**; để trống nghĩa là chưa có giá (không phải 0).
- Nút **Lưu giá & tình trạng** lưu mọi hạng phòng trong một lần; nếu một hạng phòng bị người khác sửa trước, hệ thống báo “Giá đã được cập nhật ở nơi khác” và không ghi đè.

## 4. Số phòng tham khảo theo ngày

Cùng tab 4, phần lịch tháng:

- Bấm từng ngày để chọn (chọn được nhiều ngày), hoặc **Chọn cả tháng**.
- Nhập **Số phòng** rồi **Áp dụng cho N ngày**.
- **Ngừng nhận khách**: đánh dấu ngày đối tác tạm dừng nhận khách (khác với 0 phòng).
- **Xoá số phòng các ngày đã chọn** đưa các ngày đó về “chưa kiểm tra”.
- Ô trống = chưa kiểm tra; `0` = hết phòng; “Ngừng” = không nhận.

Cách website đọc số này cho một kỳ lưu trú: lấy **giá trị nhỏ nhất của các đêm**, bỏ qua đêm trả phòng. Ví dụ 5 / 2 / 4 → kỳ đó tối đa 2 phòng tham khảo. Thiếu dữ liệu một đêm → “Cần xác nhận tình trạng”, không giả định còn phòng.

Đây là số **nhập tay sau khi kiểm tra đối tác**, không phải tồn kho realtime và không tự trừ khi khách gửi yêu cầu.

## 5. Gắn tour

Tab 5 → **+ Thêm tour liên kết**:

- **Đã bao gồm trong tour**: tour đã trả tiền phòng; website không cộng giá phòng lần nữa.
- **Nâng hạng — báo chênh lệch**: website không tự tính chênh lệch; sale báo giá.
- **Cộng thêm, báo giá riêng**: hiển thị chi phí lưu trú tham khảo riêng.

Có thể gắn cho cả khách sạn hoặc một hạng phòng. Chỉ gắn khi đã có thoả thuận với đối tác.

## 6. Xử lý yêu cầu khách sạn

Trong **Studio → Yêu cầu tư vấn**:

- Hàng chip **Mọi loại / Tour / Khách sạn** lọc theo loại yêu cầu; chip trạng thái giữ nguyên cho lead tour.
- Thẻ yêu cầu khách sạn hiện khách sạn, ngày lưu trú, khách, hạng phòng, tình trạng tham khảo và giá tham khảo.
- Bấm **Chi tiết lưu trú & báo giá** để:
  - xem tình trạng từng hạng phòng lúc khách gửi;
  - nhập **Báo giá cuối cùng (VND)**, nội dung báo giá/điều kiện và phương án khách đã đồng ý;
  - xem booking tour đã liên kết (tạo booking trong **Tài chính tour** với đúng yêu cầu này).
- Trạng thái mở rộng: **Đã báo giá**, **Đã xác nhận** (song song các trạng thái cũ).
- Lưu báo giá **không** trừ phòng, **không** tạo doanh thu và **không** gửi email cho khách.

## 7. Ước tính giá tour + phòng trên form khách

Form tư vấn ở trang chi tiết khách sạn hiện **Tổng ước tính** ngay khi khách chọn phòng, ngày và tour.

- Bấm vào ô tổng để mở **dropdown chi tiết**: dòng tour (số người lớn/trẻ em × đơn giá, gói tour đang dùng), dòng lưu trú (từng hạng phòng × số lượng, số đêm), rồi tổng cộng.
- Giá tour lấy từ **gói rẻ nhất đang xuất bản** của tour đó; tên gói hiện ngay trong dropdown. Nếu tour chưa có giá, hoặc có trẻ em mà chưa có giá trẻ em, ô tổng hiện “Cần báo giá”.
- Tour “đã bao gồm” phòng thì dòng lưu trú ghi đã bao gồm và không cộng lần hai.
- Ngày chưa chốt: chỉ ước tính phần tour; phần lưu trú để trống cho tới khi có ngày.
- Đây là giá tham khảo, không phải xác nhận đặt phòng; sale vẫn kiểm tra và báo giá cuối.

Muốn ước tính đúng, tour phải có `pricingOptions` (hoặc `priceFrom`) trong **Tour du lịch**, và khách sạn phải có giá theo hạng phòng ở tab 4.

## 8. Nhập dữ liệu khách sạn hàng loạt

Dùng `npm run hotels:import` với file JSON bạn có quyền sử dụng (xem [IMPORT.md](IMPORT.md)). Công cụ chỉ tạo **bản nháp** và từ chối ảnh `http(s)://` bên ngoài; không cào ảnh/giá từ website khác. File mẫu `scripts/hotels/quynhon-demo.json` tạo 3 khách sạn demo để xem giao diện.

## 9. Giới hạn đã biết

- Không thanh toán online, không giữ chỗ tự động, không đồng bộ tồn phòng đối tác.
- Một yêu cầu chỉ có một khách sạn; nhiều khách sạn trong cùng hành trình thì sale ghi chú.
- Chưa có CRM nhiều nhân viên/phân quyền sale; dùng tài khoản admin hiện có.
- Slug đã phát hành không đổi được từ giao diện (giữ liên kết và SEO); muốn đổi phải xử lý riêng.
