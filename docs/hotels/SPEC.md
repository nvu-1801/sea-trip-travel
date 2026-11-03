# Đặc tả nghiệp vụ khách sạn

## Phạm vi và giả định đã chọn

- Module tên “Khách sạn”, có công tắc mở ra public, section home và mục admin riêng tương tự cách truy cập mục Kinh tế.
- Khách gửi yêu cầu tư vấn kết hợp tour, không đặt/giữ phòng tự động và không thanh toán online. Cho phép chưa chọn tour, ghi nhận “Nhờ tư vấn tour phù hợp”.
- Chưa có xác nhận về quỹ phòng được đối tác cấp. Mặc định mọi khách sạn ở chế độ `on_request` (cần kiểm tra). Vẫn triển khai admin nhập số phòng theo ngày ở chế độ `manual_daily`, nhưng coi đây là thông tin tham khảo do admin cập nhật, không phải tồn phòng realtime hay cam kết giữ chỗ.
- Dùng tài khoản admin hiện có. Chưa mở rộng thành CRM nhiều nhân viên/phân quyền sale. Giá vốn/ghi chú đối tác nếu cần chỉ nằm nội bộ; không được xuất trong API public.
- Giữ stack, cấu trúc locale, brand và luồng tour hiện tại. Các tên dữ liệu dưới đây là khái niệm, agent phải đối chiếu schema thật trước khi đặt tên code.

## Nội dung và trạng thái

| Đối tượng | Dữ liệu cần quản lý |
| --- | --- |
| Khách sạn | ID ổn định, slug, tên, điểm đến, địa chỉ, tọa độ hoặc link bản đồ an toàn, loại lưu trú, hạng sao có căn cứ, giới thiệu, tiện ích, gallery/alt, giờ nhận/trả, chính sách, locale, SEO, trạng thái |
| Hạng phòng | ID, khách sạn, tên, mô tả, diện tích, loại/số giường, hướng nhìn, số người tiêu chuẩn/tối đa, chính sách trẻ em và giường phụ, tiện nghi, ảnh, trạng thái |
| Giá | Hạng phòng, VND nguyên/phòng/đêm, ngày hiệu lực, ngày trong tuần nếu cần, bao gồm ăn sáng/thuế/phí, mô tả phụ thu, phiên bản cập nhật |
| Tình trạng | Hạng phòng, ngày lưu trú, số phòng không âm hoặc chưa xác định, ngày ngừng nhận, nguồn/ghi chú nội bộ, cập nhật lúc nào |
| Liên kết tour | Khách sạn/hạng phòng, tour ID ổn định, quan hệ `included`, `upgrade`, `additional`, mô tả điều kiện |
| Yêu cầu | Lead hiện có + khách sạn, các hạng phòng/số lượng, ngày hoặc chưa chốt, người lớn, tuổi trẻ em nếu có, tour hoặc nhờ tư vấn, snapshot giá/điều kiện, trạng thái xử lý |

Tái sử dụng nháp/xuất bản/version của CMS. Bản nháp không lọt ra public, sitemap hoặc tìm kiếm. Lưu trữ nội dung đang được tham chiếu thay vì xóa dây chuyền; hồ sơ cũ giữ được tên, giá và điều kiện lúc gửi. Slug đổi phải theo cơ chế redirect hiện có.

Nội dung nháp và dữ liệu giá/tình trạng đang áp dụng có thao tác lưu riêng, diễn đạt rõ trên UI. Cập nhật giá không vô tình xuất bản bản nháp giới thiệu. Public chỉ đọc dữ liệu đã được cho phép công khai.

## Quy tắc giá

1. Lưu tiền dưới dạng số nguyên VND; từ chối âm, NaN, số vượt giới hạn an toàn. Giá chưa biết là null/trạng thái rõ ràng, không phải 0. Bản đầu không dùng giá 0 để biểu diễn miễn phí.
2. Giá ngày cụ thể/khoảng ngày đặc biệt ưu tiên hơn giá theo thứ, rồi giá cơ bản. Chặn rule cùng mức ưu tiên chồng lấn trên cùng hạng phòng; không tùy tiện chọn bản ghi mới nhất.
3. Chọn cuối tuần bằng ngày trong tuần cấu hình tại rule, không tự suy ra mỗi đối tác có cùng cuối tuần. Khoảng ngày giá gồm cả ngày đầu và cuối, kiểm tra chồng lấn theo quy tắc này.
4. Kỳ lưu trú là `[checkIn, checkOut)`, cộng từng đêm theo lịch địa phương của nơi lưu trú; dùng date-only cho ngày, không để chuyển UTC làm lệch ngày. Khách sạn Việt Nam dùng Asia/Ho_Chi_Minh. Timestamp audit lưu theo chuẩn hiện có.
5. Tổng tham khảo = tổng giá từng đêm × số phòng từng hạng, cộng chỉ phụ thu đã xác định được. Thiếu giá một đêm hoặc chưa rõ phụ thu/sức chứa thì không đưa ra tổng trông như báo giá hoàn chỉnh; chuyển “Cần báo giá”.
6. Giá “từ” chỉ lấy từ hạng phòng được xuất bản với rule còn hiệu lực, ghi thời gian/điều kiện áp dụng. Không có giá hợp lệ thì “Liên hệ báo giá”. Khi có ngày, lọc/sắp xếp theo giá cùng cơ sở cho kỳ đã chọn; ghi rõ giá/đêm hay tổng kỳ, không trộn hai đơn vị. Giá chưa biết xếp cuối.
7. Server tự đọc lại giá và quan hệ tour khi nhận yêu cầu; không tin tổng tiền hay trạng thái do browser gửi. Snapshot chỉ là tham khảo tại lúc gửi, không phải báo giá cam kết.

## Quy tắc tình trạng phòng

- `on_request`: public hiển thị “Liên hệ kiểm tra tình trạng phòng”.
- `manual_daily`: admin nhập số phòng Sea Trip có thể đề xuất từng ngày, không nhập tổng số phòng vật lý của khách sạn như thể đó là tồn bán.
- Với một hạng phòng và kỳ lưu trú, số tham khảo là giá trị nhỏ nhất của các đêm. Ví dụ 5, 2, 4 thì kỳ đó có tối đa 2 phòng tham khảo. Ngày trả phòng không nằm trong phép tính.
- Nếu một đêm bằng 0 hoặc đóng nhận: không cho chọn hạng phòng đó như đang còn; có thể gửi tư vấn phương án khác. Nếu thiếu dữ liệu bất kỳ đêm nào: tình trạng chưa xác định, không giả định còn phòng.
- Chưa chọn ngày thì không hiển thị số lượng. Có ngày thì kèm thời điểm cập nhật cũ nhất trong dữ liệu đang dùng và chú thích sale xác nhận. Ngày quá khứ không dùng làm bằng chứng cho hiện tại.
- Bản đầu không tự động quảng cáo “sắp hết”. Không giả vờ có đồng bộ realtime. Gửi lead, đổi trạng thái lead hoặc báo giá không tự trừ phòng.
- Admin cập nhật phòng thủ công sau khi kiểm tra đối tác; không xây hệ thống giữ chỗ/allotment trong phạm vi này.

## Gắn tour và xử lý yêu cầu

| Quan hệ | Hành vi |
| --- | --- |
| `included` | Ghi đã bao gồm theo điều kiện tour; không cộng toàn bộ giá phòng lần nữa |
| `upgrade` | Ghi cần báo phần chênh lệch; không suy ra chênh lệch từ hai giá không cùng điều kiện |
| `additional` | Hiển thị chi phí lưu trú tham khảo riêng; sale chốt tổng |

Từ tour sang khách sạn/form phải giữ tour context; từ khách sạn có danh sách tour admin gắn hoặc nhờ tư vấn. Không gắn mọi tour cùng địa điểm thành quan hệ đã bao gồm. Bản đầu chỉ một điểm lưu trú trong một yêu cầu; các hạng phòng có thể có số lượng khác nhau. Hành trình nhiều khách sạn để sale ghi chú và sắp xếp.

Form không yêu cầu đăng nhập. Họ tên, điện thoại và nhu cầu tối thiểu là bắt buộc; email tùy chọn. Chọn ngày hợp lệ hoặc “Chưa chốt ngày”; ngày trả phải sau ngày nhận. Số lượng nguyên dương; kiểm tra giới hạn khách/phòng và trẻ em ở server. Trường hợp vượt sức chứa hoặc chính sách chưa đủ thì tư vấn riêng, không tạo báo giá chắc chắn.

Mở rộng pipeline lead hiện có, gồm validation, rate limit, chống spam, mã hóa thông tin riêng tư, trạng thái email và chống gửi trùng. Lưu thành công và gửi email thành công là hai kết quả riêng. Khi email lỗi, không làm mất yêu cầu hoặc tạo bản trùng khi người dùng thử lại.

Thông báo thành công: “Sea Trip đã nhận yêu cầu của bạn. Nhân viên sẽ liên hệ để kiểm tra phòng và tư vấn tour phù hợp. Yêu cầu này chưa phải xác nhận đặt phòng.”

Trạng thái nghiệp vụ mong muốn: Mới → Đang tư vấn → Đã báo giá → Đã xác nhận; nhánh Đóng/Không tiếp tục. Đối chiếu trạng thái lead có sẵn để tái sử dụng/migrate an toàn, không làm hỏng lead tour cũ. Bản đầu không tự gửi báo giá cho khách; admin ghi nội dung và thời điểm tư vấn thủ công.

Lưu riêng lựa chọn ban đầu, khách sạn/phòng sale xác nhận, báo giá cuối cùng và ghi chú khách đồng ý khi thay đổi. Liên kết tới booking tour hiện có khi đã chốt, không tạo doanh thu từ lead; không xây sổ kế toán khách sạn song song. Nếu hiện chưa có điểm liên kết booking phù hợp, thêm quan hệ tối thiểu và kiểm thử finance không đổi hành vi cũ.

## Feature flag và dữ liệu public

- Mặc định module tắt khi migration. Admin vẫn có thể chuẩn bị dữ liệu và xem trước có xác thực.
- `hotelsEnabled`: tắt thì bỏ menu, trang/list/detail public, liên kết từ tour, sitemap, truy vấn API public và nhận yêu cầu khách sạn mới. Không chặn lead tour bình thường. Public route trả 404 theo convention, API từ chối với lỗi rõ ràng; không chỉ ẩn nút UI.
- `hotelsHomeVisible`: chỉ ảnh hưởng section home, không đóng danh mục nếu module đang bật.
- Danh sách nổi bật có thứ tự, tối đa 6 khách sạn đã xuất bản. Không có khách sạn hợp lệ thì ẩn section.
- Khi tắt hoặc sửa dữ liệu, invalidation/cache phải cập nhật mọi đường đọc liên quan. Yêu cầu cũ, nội dung và admin không bị xóa.
- Public payload dùng allowlist; không gửi giá nội bộ, ghi chú đối tác, điện thoại khách, lịch sử yêu cầu hay bản nháp xuống browser.
