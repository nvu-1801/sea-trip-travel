# Kiểm chứng đợt nhập chương trình tour ngày 16 tháng 10 năm 2026

## Kết quả

Đã áp dụng 11 chương trình phân biệt từ 13 file Word nhận được. Người dùng dự kiến tổng 14 file; còn thiếu một file chưa biết tên. Hai cặp bản sao ST10 và QN–PY 4N3Đ đón tiễn QN chỉ được nhập một lần. Bản kê nguồn, hash văn bản và slug đích nằm ở tour-source-manifest.json.

Catalogue sau thay đổi có 22 tour: 11 chương trình từ tài liệu khách và 11 tour demo chưa có tài liệu đối ứng. Giữ URL các tour cũ, không xóa nội dung các khu vực đang chờ bổ sung.

## Dữ liệu và giao diện

- Nhập lịch trình đầy đủ theo ngày và mốc giờ, bữa ăn, nơi nghỉ, bao gồm/không bao gồm, quà tặng, trẻ em, thanh toán/hủy theo từng tour.
- Bốn chương trình dài ngày có bảng giá bốn gói lưu trú, giá người lớn và trẻ em; giá từ được kiểm tra khớp gói thấp nhất. Ghi rõ gói thấp nhất không khách sạn, chưa VAT, cần xác nhận thời điểm.
- Bảy tour một ngày chưa có giá giữ null, hiển thị Liên hệ tư vấn.
- Trích 28 ảnh gốc khác nhau, loại icon và logo du lịch Gia Lai. Dùng lại ảnh phù hợp cho hero, danh mục và điểm đến; không nâng kích thước ảnh gốc giả.
- Thêm bảng so sánh giá responsive; gallery giữ nguyên hình dọc, thao tác bàn phím; accordion từng ngày mở sẵn ngày đầu; hiển thị điểm trả, phương tiện, mã tour; chia rõ quà tặng và chính sách.
- Trang chủ hiển thị cả tour ngày và tour nghỉ đêm, giữ font và màu thương hiệu hiện có.

## Các lỗi đã sửa

1. Production rewrite / → /vi rồi redirect /vi → / gây vòng lặp chuyển hướng tiếng Việt. Proxy nay cho /vi đi qua, canonical vẫn không prefix. Chạy browser production xác nhận các route VI/EN trả 200.
2. Bản dịch tiếng Anh demo có thể ghi đè lịch trình, phương tiện, bữa ăn và bảo hiểm của nguồn mới. Overlay của tour nhập có phiên bản nguồn; không khớp thì fallback VI. Bản mới chỉ dịch tiêu đề, phần chưa dịch có thông báo hiện hữu và noindex; không quảng bá EN chưa duyệt qua hreflang của tour.
3. npm ci thất bại do lockfile picomatch không nhất quán. Đã sửa lockfile và cài sạch thành công.
4. Typecheck trên checkout sạch thiếu PageProps/LayoutProps vì chưa sinh route types. Script typecheck nay chạy next typegen trước tsc.
5. Anchor nội trang vẫn xuất hiện khi mục đích bị ẩn. Danh sách anchor nay chỉ chứa mục thực sự có nội dung.
6. Chính sách chiếm nửa trang trống khi không có ghi chú; nay dùng chiều rộng phù hợp.
7. Các nhầm lẫn tên tour 3N2Đ trong file 4N3Đ được chuẩn hóa theo tiêu đề và lịch trình. Bỏ câu trả phòng ngày 2 mâu thuẫn với nghỉ đêm QN của tuyến tiễn PY. Không quảng bá xe Quy Nhơn cho ST10 tự đến Nhơn Lý.
8. Không giữ lời hứa lặn san hô trong highlight tour dài ngày khi lịch trình và dịch vụ không xác nhận trải nghiệm này; giữ điểm đến Kỳ Co.

## Kiểm tra đã thực hiện

| Kiểm tra | Kết quả |
| --- | --- |
| npm ci --no-audit --no-fund | Đạt sau sửa lockfile |
| npm run typecheck | Đạt |
| npm run lint | Đạt |
| npm test | 132/132, gồm 8 kiểm tra mới cho nguồn tour |
| npm run build | Đạt, production prerender 107 trang |
| npm run verify:ui | 161/161 kiểm tra production browser, gồm form gửi vào SMTP sink cục bộ |
| npm run verify:tour-import | 88 tổ hợp: 11 chương trình × VI/EN × 360/390/768/1440 px |
| Kiểm tra bổ sung trong verify:tour-import | Ảnh tải được, anchor tồn tại, bảng giá, accordion và gallery bàn phím, payload form đúng tour, không pageerror |
| git diff --check | Đạt |
| Visual QA | Đã xem ảnh trang chủ, chi tiết desktop/mobile, bảng giá và lịch trình/dịch vụ |

Browser chạy Chromium 153 trong môi trường kiểm tra, trên production build. Thêm tùy chọn CHROMIUM_EXECUTABLE_PATH cho nơi không có Chrome hệ thống; mặc định vẫn dùng channel chrome. Script verify:ui bind 127.0.0.1 để không phụ thuộc quyền đọc networkInterfaces. Kiểm tra hotline cập nhật theo breakpoint 2xl thực tế: ẩn 1280 px để giữ menu thoáng, hiện 1536 px; không bỏ assertion.

## Phần chờ bổ sung và giới hạn

Chưa có ảnh độ phân giải cao, thời hạn áp dụng giá, phụ thu đầy đủ, file thứ 14, bản dịch EN hoàn chỉnh, hoặc tài liệu cho các tour demo còn lại. Các mục này không được tự điền. Gói không khách sạn có mô tả dịch vụ chung cần được tư vấn xác nhận quyền lợi. Ranh giới phí hủy chưa đủ để tự động tính phí; website chỉ nhận yêu cầu tư vấn.

Email đã được kiểm tra end to end bằng SMTP sink của môi trường thử nghiệm, không gửi tới người thật. Không có quyền truy cập cấu hình SMTP production để xác nhận hộp thư thật. Trạng thái Vercel sau merge được kiểm tra theo SHA GitHub; không suy thành công từ việc push.

## Thực hiện phát hành

Nhánh thực hiện: feat/import-tour-documents. Baseline main: 9996a372b0c3e9d32ccca671a9c86493a22d6a9e. Chỉ merge sau khi các kiểm tra trên đạt. Không force push. SHA phát hành và kết quả Vercel được báo riêng sau khi merge, tránh lưu một trạng thái deploy suy đoán vào tài liệu này.
