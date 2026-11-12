# Vận hành chiến dịch Quà khuyến mãi

Mở **Quà khuyến mãi** trong Studio. Tạo chiến dịch hoặc dùng mẫu lịch để bàn, chọn ảnh và mô tả ảnh, nội dung, lịch Việt Nam, tour áp dụng, cách chọn và số phần quà. Xem trước desktop/mobile rồi xuất bản. Với bốc thăm, có thể cấu hình số suất dự phòng. Chế độ thủ công dùng tiêu chí ghi trong thể lệ.

Popup lưu đăng ký theo chiến dịch. Lỗi xuất hiện dưới trường liên quan và khách có thể sửa ngay. Số điện thoại được chuẩn hóa để một số chỉ tính một lượt cho cùng chiến dịch. Studio hiển thị thông tin liên hệ trong danh sách người tham gia, có bộ đếm, tìm kiếm và loại lượt kèm lý do.

Nếu có đăng ký cũ trong **Yêu cầu tư vấn**, mở **Xem đăng ký → Đối soát đăng ký cũ** trước khi đóng chiến dịch. Xem tổng có thể chuyển, lượt trùng và các mục bị giữ lại. Chỉ xác nhận chuyển sau khi kiểm tra báo cáo. Hệ thống giữ bản ghi gốc, ẩn các lượt đã đối soát khỏi hộp thư và bỏ qua bản ghi có hóa đơn, hồ sơ tour, đang ở thùng rác hoặc không hợp lệ.

Đóng đăng ký để chốt cách chọn. Bốc thăm ghi một kết quả và danh sách dự phòng có thứ tự. Chọn thủ công yêu cầu đúng số phần quà và lý do. Sau khi chốt, admin theo dõi liên hệ, xác nhận và trao quà. Có thể chuyển suất cho người dự phòng kế tiếp kèm lý do nếu quà chưa được trao. Nhật ký lưu thao tác để đối chiếu.

Chạy `npm run verify:preflight -- --full` trước khi phát hành. Các ca trọng tâm gồm popup 390/1440 px, lỗi dưới từng ô, đăng ký trùng, tách khỏi Leads, quyền đọc thông tin, lịch đóng, đối soát có thể chạy lại và hai admin chốt đồng thời.
