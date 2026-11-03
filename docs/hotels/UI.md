# UI public và admin

## Nguyên tắc

Giữ tokens/theme hiện có trong `src/app/globals.css` và cấu hình theme. Không hardcode bộ màu mới bỏ qua theme của admin. Mặc định kế thừa nền sáng ấm, điểm nhấn hồng, Lora cho tiêu đề và Be Vietnam Pro cho nội dung. Ảnh khách sạn là trọng tâm; không thêm animation toàn trang, nhãn giảm giá hay số liệu đánh giá không có nguồn.

Tất cả ví dụ giá/tên/phòng trong fixture phải đánh dấu demo. Dùng ảnh sẵn có được phép hoặc placeholder trong môi trường test; không tự tải ảnh đối thủ làm nội dung thật.

## Trang chủ

Thêm menu Khách sạn sau nhóm tour và trước Cẩm nang, đồng bộ desktop/mobile/footer. Đặt section sau tour nổi bật, trước các khối kể chuyện tiếp theo nếu bố cục thực tế phù hợp; không thay đổi hero hoặc carousel đang được sửa ở worktree khác.

```text
Nơi nghỉ cho chuyến đi của bạn                  Xem tất cả
[Quy Nhơn] [Phú Yên] [Các điểm đến có nội dung]
[Ảnh 16:10]             [Ảnh 16:10]             [Ảnh 16:10]
Tên khách sạn           Tên khách sạn           Tên khách sạn
Vị trí / sao            Vị trí / sao            Vị trí / sao
Tiện ích nổi bật        Tiện ích nổi bật        Tiện ích nổi bật
Giá tham khảo từ...     Giá tham khảo từ...     Liên hệ báo giá
[Xem khách sạn]         [Xem khách sạn]         [Xem khách sạn]
```

Desktop 3 cột, tối đa 6 thẻ. Mobile 1 cột, ảnh không quá cao, link xem tất cả rõ ràng. Chỉ có tab địa điểm thực sự có dữ liệu; chưa có ngày không có badge số phòng.

## Danh sách theo locale: /khach-san

```text
Tiêu đề + ảnh ngang thấp
[Điểm đến/tên] [Ngày nhận] [Ngày trả] [Phòng/khách] [Tìm]

Bộ lọc 260px       Số kết quả                     Sắp xếp
Ngân sách          [Ảnh] [Tên, vị trí, tiện ích] [Giá, CTA]
Hạng sao           [Ảnh] [Tên, vị trí, tiện ích] [Giá, CTA]
Loại lưu trú       Phân trang
Tiện ích
```

- Lọc và phân trang lưu trong URL, Back/Forward khôi phục trạng thái. Cho phép tìm không có ngày; có ngày phải nhập đủ cặp hoặc chọn chưa chốt.
- Sắp xếp: Sea Trip đề xuất, giá tăng, giá giảm. Giá chưa biết cuối danh sách; không trộn giá theo đêm và tổng kỳ.
- Mobile bộ lọc mở dạng sheet/dialog có focus trap, nút Áp dụng và Xóa bộ lọc; thẻ dọc, không tràn ngang.
- Không kết quả: hiển thị tiêu chí hiện tại, xóa bộ lọc, tư vấn phương án khác. Lỗi tải phải khác “không có kết quả”.

## Chi tiết theo locale: /khach-san/[slug]

```text
Breadcrumb
Tên khách sạn / sao có căn cứ
Địa chỉ                                      Xem bản đồ
[           Ảnh chính          ][Ảnh 2][Ảnh 3]
[                              ][Ảnh 4][Xem ảnh]
[Tổng quan] [Hạng phòng] [Tiện ích] [Chính sách] [Vị trí]

Nội dung khoảng 2/3                         Tư vấn khoảng 1/3
Giới thiệu + điểm nổi bật                   Ngày / số khách
Các hạng phòng                             Các phòng đã chọn
Tiện ích / chính sách                      Tour quan tâm
Bản đồ và tour liên quan                   Giá tham khảo/điều kiện
                                           [Nhận tư vấn kèm tour]
```

Hạng phòng gồm ảnh, tên, diện tích, giường, hướng nhìn, sức chứa, dịch vụ bao gồm, giá/đơn vị, tình trạng có ngày, số lượng và “Chọn phòng này để tư vấn”. Mở thêm tiện nghi/chính sách trong accordion hoặc dialog. Chưa cần route SEO riêng cho phòng.

Gallery mở bằng thao tác người dùng, có nhãn, điều khiển bàn phím và trả focus. Mobile gallery một ảnh chính và bộ đếm, nội dung một cột, thanh CTA dưới có safe-area và không che Zalo/điện thoại hay form. Nút Xem phòng cuộn đến hạng phòng; không gây mất lựa chọn.

Khung tư vấn giữ ngữ cảnh tour, phòng, ngày khi chỉnh form. Cho phép “Chưa chốt ngày”, “Nhờ tư vấn tour phù hợp”. Thông báo lỗi ngay tại trường và giữ input sau lỗi. Chống nhấn gửi lặp, không dùng chữ “Đặt thành công”.

## Admin

Sidebar thêm “Khách sạn”; dùng lại table, editor, media picker, preview và notifications hiện có.

```text
Khách sạn                                 [+ Thêm khách sạn]
[Tìm tên] [Điểm đến] [Trạng thái] [Chế độ phòng]
Ảnh | Tên | Điểm đến | Xuất bản | Cập nhật | Thao tác
```

Editor có 5 tab:

1. Thông tin: tên/slug/địa điểm/giới thiệu/chính sách cơ bản.
2. Ảnh & tiện ích: ảnh bìa, gallery, alt, sắp xếp, tiện ích.
3. Hạng phòng: tạo/nhân bản/sửa/lưu trữ, sức chứa và ảnh riêng.
4. Giá & tình trạng: lịch ngày, chọn khoảng/thứ, cập nhật hàng loạt, xem trước số ô bị ảnh hưởng, cảnh báo chồng rule.
5. Tour liên quan & xuất bản: quan hệ included/upgrade/additional, SEO/locale, preview, lưu nháp/xuất bản.

Ở tab 4, phân biệt “chưa nhập”, “0 phòng”, “cần xác nhận”. Thao tác ghi đè phải hiện giá trị cũ/mới và số ngày bị ảnh hưởng; lưu atomic, lỗi không áp dụng một nửa. Sửa đồng thời phải cảnh báo conflict theo version thay vì ghi đè im lặng.

Yêu cầu khách sạn dùng mục lead hiện có với bộ lọc loại yêu cầu, thông tin lựa chọn, ghi chú sale, trạng thái và liên kết booking tour. Không tạo inbox trùng. Ghi chú nội bộ có nhãn rõ.

Trong cấu hình có Bật module, Hiện section home, danh sách nổi bật và thứ tự. Tắt module không mất nội dung, có giải thích ngắn về việc ngừng nhận yêu cầu mới.

## Trạng thái và accessibility

Mỗi đường chính phải có loading, empty, error, success. Ảnh có kích thước dự trữ và alt; text dài không phá layout. Kiểm tra 390px, 768px, 1440px và phóng chữ 200%; focus nhìn thấy, label đúng, thao tác bàn phím, tương phản và reduced-motion. Public content/menu theo VI/EN hiện có; không xuất bản bản tiếng Anh thiếu nội dung theo cách trái với quy tắc locale của repo.
