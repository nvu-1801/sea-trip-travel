# Kế hoạch áp dụng tài liệu tour vào SEA TRIP TRAVEL

## Cập nhật xác nhận công khai ảnh

Ngày 16/10/2026, người dùng đã yêu cầu công khai 28 ảnh khách cung cấp. Nhánh `feat/tour-admin-preparation` khôi phục toàn bộ ảnh và tham chiếu từ nhánh nhập đầy đủ. Xác nhận này thay thế trạng thái trước đó chỉ phát hành code dùng placeholder. Chưa push/merge/deploy thành công vì quyền ghi GitHub trả 403. Kế hoạch admin mới ở `docs/admin-roadmap.md`; phạm vi MVP bên dưới ghi lại đợt nhập nội dung trước đó.

Rà soát bổ sung đã sửa nội dung lịch trình bị ẩn khi in accordion và đường dẫn breadcrumb SEO tiếng Anh bị lặp /en. Kết quả kiểm tra cuối được cập nhật sau khi chạy lại trên clean build.

Ngày lập: 16/10/2026. Repo: nvu-1801/sea-trip-travel. Baseline: 9996a37.
Nhánh thực hiện: feat/import-tour-documents.

## Mục tiêu và phạm vi

Đưa nội dung do khách cung cấp vào catalogue hiện có; bảo toàn slug đang được liên kết, bổ sung tour mới, bảng giá theo lưu trú và ảnh từ Word. Cải thiện trang chi tiết để nội dung dài vẫn dễ đọc trên điện thoại. Không bổ sung CMS, thanh toán hoặc đặt chỗ trực tuyến; form hiện tại là yêu cầu tư vấn.

## Kiểm kê đầu vào

Người dùng dự kiến 14 file. Hiện nhận 13 file vật lý, có 2 cặp trùng toàn bộ nội dung văn bản, còn 11 chương trình phân biệt. Chưa biết tên file thứ 14; không tự suy đoán ST07/ST08/ST09.

| Chương trình | Thời lượng | Xử lý |
| --- | --- | --- |
| ST01 Kỳ Co – Eo Gió đường bộ | 1 ngày | Cập nhật slug Kỳ Co – Eo Gió hiện có; thay thông tin cano demo |
| ST02 Quy Nhơn – Phú Yên – Ghềnh Đá Đĩa | 1 ngày | Thêm mới |
| ST03 Kỳ Co – Eo Gió – Hòn Khô | 1 ngày | Thêm mới; khác tour Hòn Khô độc lập |
| ST04 Cù Lao Xanh | 1 ngày | Cập nhật slug hiện có |
| ST05 Phú Yên – Mũi Điện | 1 ngày | Thêm mới |
| ST06 Tây Sơn – Hầm Hô | 1 ngày | Thêm mới |
| ST10 Săn cá Bãi Dứa | 1 ngày | Hai file giống nội dung; chỉ tạo một tour |
| Quy Nhơn – Phú Yên | 3 ngày 2 đêm | Cập nhật slug hiện có |
| Quy Nhơn – Phú Yên đón tiễn Quy Nhơn | 4 ngày 3 đêm | Hai file giống nội dung; cập nhật một tour |
| Quy Nhơn – Phú Yên đón QN tiễn PY | 4 ngày 3 đêm | Thêm tour riêng; không gộp với đón tiễn QN |
| Quy Nhơn | 4 ngày 3 đêm | Thêm mới; có Cù Lao Xanh |

Tour Hòn Khô độc lập, tour 5 ngày và các vùng khác chưa có tài liệu đối ứng: giữ dữ liệu và đường dẫn hiện hữu, theo dõi bổ sung sau.

## Tổng hợp giá có trong tài liệu

Đơn vị VNĐ/người. Mỗi ô là người lớn / trẻ em 5–9 tuổi. Giá chưa bao gồm VAT, chưa có thời hạn áp dụng; khách cần xác nhận khi tư vấn. Giá thấp nhất là gói không khách sạn.

| Chương trình | Không khách sạn | Khách sạn 3 sao | Khách sạn 4 sao | Khách sạn 5 sao |
| --- | --- | --- | --- | --- |
| QN–PY 3N2Đ | 2.290.000 / 1.374.000 | 2.940.000 / 1.764.000 | 3.240.000 / 1.944.000 | 3.340.000 / 2.004.000 |
| QN–PY 4N3Đ đón tiễn QN | 2.440.000 / 1.464.000 | 3.090.000 / 1.854.000 | 3.390.000 / 2.034.000 | 3.490.000 / 2.094.000 |
| QN–PY 4N3Đ tiễn PY | 2.440.000 / 1.464.000 | 3.090.000 / 1.854.000 | 3.390.000 / 2.034.000 | 3.490.000 / 2.094.000 |
| Quy Nhơn 4N3Đ | 2.440.000 / 1.464.000 | 3.410.000 / 2.046.000 | 3.860.000 / 2.316.000 | 4.010.000 / 2.406.000 |

Tour một ngày chưa có giá. Trẻ em ST02/ST04/ST05/ST06 áp dụng 50%; ST01/ST03/ST10 áp dụng 60%. Không áp dụng một chính sách chung cho toàn web. Điều kiện số trẻ đi kèm và chiều cao giữ theo từng tài liệu.

## Thứ tự triển khai

1. Kiểm tra trạng thái git và AGENTS.md, tạo nhánh từ main, ghi baseline. Không ghi đè WIP.
2. Đọc Word theo cấu trúc đoạn và từng ô bảng. Không flatten bảng bao gồm/không bao gồm thành một danh sách; loại mục lục và số trang.
3. Lưu sourceDocuments, mã tour và thời gian cập nhật trong dữ liệu; kiểm tra trùng slug/id, số ngày, giá và liên kết danh mục.
4. Mở rộng schema hiện hữu bằng pricingOptions, transport, returnPoints, gifts. Giá VND lưu số nguyên; thiếu giá giữ null.
5. Thay nội dung demo của tour có tài liệu đối ứng; thêm tour mới. Không lấy lịch trình, bữa ăn, bảo hiểm hay giá của tour khác làm mặc định.
6. Trích ảnh gốc trong Word, loại icon 16 px và logo Gia Lai du lịch; deduplicate theo hash. Ảnh Word phần lớn chỉ khoảng 400–600 px, dùng tạm và chờ ảnh gốc lớn hơn. Giữ nguyên byte, không nâng kích thước giả.
7. Vô hiệu bản dịch cũ khi không khớp phiên bản nguồn; tạo overlay tiêu đề EN draft cho nguồn mới. Phần chưa dịch fallback VI có thông báo hiện có, noindex, không sitemap EN.
8. Hoàn thiện UI, regression tests, typecheck/lint/unit/build/browser. Sửa nguyên nhân lỗi, không bỏ kiểm tra để merge.
9. Commit, push nhánh, kiểm tra diff; chỉ đưa lên main nếu các kiểm tra đạt. Theo dõi deploy theo SHA và kiểm tra URL production khi xác định được.

## Thiết kế giao diện

Giữ nhận diện SEA TRIP, Fraunces cho heading và Be Vietnam Pro cho nội dung. Dùng khoảng trắng, bo góc vừa phải, viền nhẹ và phân cấp chữ; không đổi toàn bộ thương hiệu.

- Card tour: ảnh 3:2, tên rõ ràng, thời lượng, điểm đón và giá hoặc liên hệ; chiều cao và CTA nhất quán.
- Trang chi tiết: ảnh lớn có thumbnails, không cắt mất nhân vật ảnh dọc; bảng thông tin nhanh; sidebar tư vấn trên desktop, CTA dưới cùng trên mobile.
- Giá: bảng so sánh hạng lưu trú, giá người lớn và trẻ em 5–9 tuổi. Ghi rõ giá thấp nhất có thể là gói không khách sạn, chưa bao gồm VAT và cần xác nhận thời điểm.
- Lịch trình: accordion từng ngày có thể dùng bàn phím, mở ngày đầu; ngày đơn mở sẵn, mốc giờ rõ; bữa ăn và nơi nghỉ lấy từ tài liệu.
- Dịch vụ: bao gồm/không bao gồm hai cột desktop, một cột mobile; quà tặng tách riêng; chính sách trẻ em giữ theo từng tour.
- Ẩn phần thực sự không có nội dung, không để anchor trỏ tới phần không tồn tại; không hiển thị TODO, dữ liệu kỹ thuật hoặc thông tin bịa lên UI.

## Dữ liệu còn thiếu hoặc mâu thuẫn

Các mục sau không cản nhập nội dung đã rõ, nhưng không được tự biến thành cam kết thương mại:

- File thứ 14 và danh mục đầy đủ khách dự kiến: chưa có.
- Bảy tour một ngày: chưa có giá bán; giữ Liên hệ tư vấn.
- Thời gian áp dụng giá, phụ thu lễ Tết, phòng đơn, VAT và điều kiện tối thiểu: lưu những gì đã có, phần chưa có hỏi khi tư vấn.
- ST10: header ghi ô tô, lịch trình tự đến Nhơn Lý, dịch vụ chỉ có cano. Không quảng bá có xe đưa đón Quy Nhơn.
- ST01 đường bộ: ghi chú biển động đi đường bộ/không lặn có vẻ từ bản cano; không dùng làm mô tả chính tour đường bộ.
- Các tour 4 ngày: câu mở ngày 1 ghi nhầm tour 3 ngày 2 đêm. Chuẩn hóa tên theo tiêu đề và số ngày thực tế; ghi lại chỉnh sửa này.
- Tour QN 4 ngày: câu mở còn ghi Quy Nhơn – Phú Yên; sửa theo tiêu đề Quy Nhơn và lịch trình.
- Tour đón QN tiễn PY: ngày 2 nói trả phòng nhưng tối vẫn nghỉ QN; ngày 3 lại trả phòng. Bỏ câu trả phòng ngày 2, giữ tham quan và nghỉ QN, chờ xác nhận.
- Tour đón tiễn QN 4 ngày: tổng quan ghi UIH/TBB nhưng ngày cuối về UIH; điểm trả theo lịch trình và tên file, không quảng bá trả TBB.
- Gói không khách sạn nhưng dịch vụ chung có khách sạn/buffet: cần ghi rõ các quyền lợi này phụ thuộc gói và xác nhận tư vấn, không tự tính tổng tiền.
- Hủy tour 10/50/75/100% chưa mô tả kín mọi ranh giới thời gian; chỉ trình bày nguyên văn cho tư vấn, không tự viết bộ tính phí.
- Ảnh thực tế trong Word: độ phân giải thấp; cần ảnh gốc sau. Không dùng logo địa phương làm ảnh tour hoặc thay logo SEA TRIP.
- Tiếng Anh: bản dịch cũ khác lịch trình mới; không cho overlay cũ làm sai dịch vụ/bảo hiểm/phương tiện.

## Tiêu chí kiểm tra

- [x] 11 chương trình từ 13 file, không tạo bản ghi do hậu tố (1).
- [x] Tour có lịch trình đúng số ngày, chỉ số ngày liên tục; id/slug không trùng.
- [x] ST01 đi đường bộ, ST03 có Hòn Khô; QN 4 ngày có Cù Lao Xanh; hai tuyến QN–PY 4 ngày khác điểm trả.
- [x] Trẻ em ST02/ST04/ST05/ST06 là 50%; ST01/ST03/ST10 và tour dài ngày là 60%, giữ điều kiện đi kèm.
- [x] Giá bảng đúng từng gói, không gán giá 0 cho giá thiếu hoặc suy giá người lớn từ bảo hiểm.
- [x] Bản code không công khai ảnh khách hàng; placeholder và gallery bàn phím hoạt động. Ảnh gốc chờ xác nhận riêng.
- [x] Giao diện VI/EN không xuất hiện lịch trình dịch cũ; EN draft không index.
- [x] 360/390/768/1440 px không tràn ngang; sticky CTA không che form/footer; accordions dùng bàn phím.
- [x] Form tư vấn giữ đúng tour, thành công/thất bại rõ, không báo gửi thành công khi mail lỗi.
- [x] Cài sạch npm ci, typecheck, lint, test, production build và browser suite đạt.
- [ ] Phát hành: diff đã kiểm, commit và kết quả deploy sẽ báo theo SHA sau khi kiểm tra trên main.

## Trạng thái thực tế

Đã hoàn tất áp dụng dữ liệu, UI và kiểm tra local. Kết quả và giới hạn được ghi tại docs/TOUR-IMPORT-VERIFICATION.md; phát hành theo SHA được báo sau khi merge.
