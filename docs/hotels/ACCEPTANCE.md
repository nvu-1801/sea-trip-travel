# Checklist nghiệm thu

Trạng thái bằng chứng: xem `STATUS.md`. Ô chỉ được tick khi có kết quả thật; ghi chú ngắn nằm ngay sau ô.

## CMS và dữ liệu

- [x] Tạo/sửa/preview/xuất bản/lưu trữ khách sạn và phòng; reload vẫn đúng. Nháp không xuất hiện public. — `tests/hotel-store.test.ts`, `verify:hotels` (preview, publish, archive, draft 404).
- [ ] Upload/chọn/sắp xếp ảnh và alt hoạt động qua media flow hiện có; file sai bị từ chối server-side. — Editor dùng lại `ImageField` + `/api/admin/media` (validate JPEG/PNG/WebP, ≤10 MB, alt bắt buộc) và có ↑/↓; chưa chạy upload end-to-end trong browser suite.
- [x] Sửa giá không xuất bản nhầm bản nháp nội dung. Sửa đồng thời báo conflict; bulk update atomic. — Giá ở bảng riêng; `expectedUpdatedAt` + transaction; test chồng lấn không ghi một phần.
- [x] Migration chạy lại an toàn trên fixture dữ liệu cũ; lead/tour/finance cũ không mất. Backup/restore có dữ liệu module mới. — `hotel-store` mở DB legacy rồi chạy lại; backup/restore copy nguyên file SQLite (script đọc, `verify:backup` chạy trong CI).
- [x] Lưu trữ/đổi slug không phá snapshot yêu cầu cũ; liên kết public/redirect theo convention. — Slug đã lưu bất biến (theo convention repo) nên không cần redirect mới; lead giữ tên/giá snapshot.

## Giá và thời gian

- [x] Giá cơ bản, ngày trong tuần và ngày đặc biệt áp dụng đúng thứ tự; rule cùng ưu tiên chồng lấn bị chặn. — `hotel-pricing`, `hotel-store`.
- [x] Kỳ qua cuối tuần/ngày lễ/cuối tháng/cuối năm tính theo từng đêm. Ngày trả phòng không tính tiền; ngày trả <= ngày nhận bị từ chối.
- [x] Giá âm, thiếu giá, 0 biểu diễn chưa biết, payload quá lớn và tiền vượt safe integer bị xử lý đúng; không xuất NaN hoặc tổng 0 giả.
- [x] Nhiều hạng phòng/số lượng tính đúng; thiếu phụ thu không hiện tổng như báo giá cuối. Thuế/ăn sáng/đơn vị giá rõ.
- [x] Giá từ không lấy giá hết hiệu lực/nháp; giá chưa biết xếp cuối; ngân sách/sort cùng đơn vị. Server bỏ qua giá giả mạo client. — `lowestEffectiveRate`, `hotel-filters`, `/api/hotels/quote` + `buildHotelLead`.

## Ước tính tour + phòng

- [x] Form hiện tổng ước tính gồm tour đang chọn + phòng đã chọn; bấm vào tổng mở dropdown chi tiết (gói tour, người lớn/trẻ em, từng hạng phòng, tổng). — `/api/hotels/quote` + `verify:hotels` (`estimate-1440.png`).
- [x] Thiếu giá tour/giá trẻ em hoặc phụ thu chưa rõ → “Cần báo giá”, không bịa tổng. — `tests/tour-estimate.test.ts`.
- [x] `included` không cộng phòng lần hai; ngày chưa chốt chỉ ước tính phần tour.
- [x] Công cụ nhập dữ liệu chỉ tạo bản nháp demo, chặn ảnh ngoài và chặn publish; chạy lại không nhân đôi. — `scripts/hotels/import.ts`, `data/import-test.sqlite` (3/5/7 bản ghi sau 2 lần chạy).

## Tình trạng phòng

- [x] on_request không hiện số phòng khẳng định; chưa chọn ngày không hiện “còn N phòng”.
- [x] Kỳ có số phòng 5/2/4 trả tối đa 2 phòng tham khảo, không lấy tổng hoặc trung bình; phòng 0 ở ngày trả không ảnh hưởng kỳ trước.
- [x] Thiếu một đêm → cần xác nhận; có đêm 0/đóng nhận → không thể chọn như đang còn; số âm/số lẻ bị chặn.
- [x] Timestamp và mô tả xác nhận của sale hiển thị đúng, không tuyên bố realtime; cập nhật admin làm mới public cache. — `updatedAt` trong kết quả; trigger `cms_versions(public)`.
- [x] Gửi lead/retry/thay trạng thái không trừ phòng, không tạo giữ chỗ, không tự tăng/giảm tồn.

## Public UI và feature flag

- [x] Home/menu/list/detail/tour links hoạt động ở desktop và mobile; tối đa 6 khách sạn nổi bật, section rỗng tự ẩn. — `verify:hotels` + giới hạn `MAX_HOTEL_FEATURED`.
- [x] Filter/search/pagination/Back/Forward giữ URL state; không kết quả khác lỗi tải; giá/phòng chưa biết có lời hướng dẫn.
- [ ] Gallery, phòng, form và dialog dùng được bàn phím; focus quay lại đúng, label/contrast/alt/reduced-motion đạt; 390/768/1440px và 200% text không tràn/che nút. — Đã có dialog `<dialog>` + phím mũi tên/Escape/trả focus và đã đo 390/1440; chưa tự động hoá 768px, 200% zoom và contrast.
- [x] VI/EN, metadata/canonical/sitemap đúng convention, không có nội dung demo hay rating giả trong production output. — EN page + sitemap check; JSON-LD không rating; demo chỉ ở DB local.
- [x] Tắt flag: direct URL/API public bị chặn, sitemap/menu/tour links/cache không giữ dữ liệu cũ; submit form đã mở bị từ chối có hướng dẫn. Admin và lead tour vẫn hoạt động.

## Lead và sale

- [x] Từ tour sang khách sạn/form giữ context; từ khách sạn chọn tour hoặc nhờ tư vấn được. Ngày chưa chốt hỗ trợ rõ.
- [x] Input sai, room không thuộc hotel, hotel nháp/ẩn, ID không tồn tại và sức chứa không hợp lệ bị server xử lý; thông tin client không được tin mặc định.
- [x] Một yêu cầu lưu đủ phòng/số lượng/ngày/khách/tour/snapshot; admin tìm/lọc/đổi trạng thái, lưu báo giá và phương án xác nhận được.
- [x] included không cộng trùng, upgrade không tự tính chênh lệch tùy tiện; liên kết booking không tự ghi doanh thu; lead tour cũ pass regression.
- [x] Double-click/retry không tạo trùng; mail test lỗi vẫn thấy hồ sơ đã lưu và trạng thái delivery thật; không gửi thật tới khách trong test; success không nói đã đặt phòng.

## Bảo mật và gate cuối

- [x] API admin kiểm tra auth/CSRF server-side; public payload không có giá vốn, ghi chú riêng, PII, bản nháp hay audit nội bộ. — `requireSession` + projection test.
- [x] Rich text/link/upload được xử lý theo sanitizer/allowlist hiện có; rate limit/chống spam và mã hóa PII không bị bỏ qua.
- [x] Các test giá/phòng/security/persistence/lead regression mới được nối vào test suite thực tế. — `package.json` `npm test`.
- [x] `npm run verify:preflight -- --full` pass tại đúng worktree; ghi exit code và bằng chứng thực tế. — exit 0, 13/13 bước, 335.4s (log `%TEMP%\hotel-preflight4.log`).
- [x] `npm run security:check` pass; Docker smoke chỉ bắt buộc thêm nếu chạm hạ tầng. — exit 0, semgrep 0 findings, gitleaks no leaks; Docker build + read-only/volume smoke PASS (`SMOKE-PASS`) vì có sửa CI workflow.
