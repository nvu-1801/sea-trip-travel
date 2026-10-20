# Checklist Tab Tổng quan & Thống kê (Admin SEA TRIP)

> Dùng cho team + agent mới verify nhanh. Chi tiết đầy đủ: `docs/admin-analytics-agent-train.md`.
> Repo: `sea-trip-travel` — Next.js + SQLite (`src/server/cms/db.ts`), 1 admin duy nhất, brand `#e0005a`.

## 1. Vị trí & quyền (3 checks)

* [ ] Sidebar có `Tổng quan (◉)` đầu tiên, click vào hiện 4 KPI + biểu đồ, không cần chọn bản ghi.
* [ ] Chưa login thì chỉ thấy form `SEA TRIP STUDIO`; API `/api/admin/stats` không session -> `401`.
* [ ] `POST /api/track` public không cần login nhưng bị giới hạn `120/phút/IP`; lỗi vẫn trả `202`.

## 2. Widget Tổng quan (5 checks)

* [ ] Hiện 4 số: lượt xem hôm nay / người vào web hôm nay / leads hôm nay / tỉ lệ chốt + pipeline ₫, loading là `—`.
* [ ] Period `7/14/30 ngày` chuyển là số + trend đổi theo; nút `Làm mới` quay lại tải.
* [ ] Trend SVG hiện đủ ngày (kể cả ngày 0), nhãn `DD/MM`.
* [ ] Top trang top 8 `path` + lượt xem; kênh đến có `direct/google/facebook/zalo/...`; thiết bị dịch `Điện thoại/Máy tính bảng/Máy tính`.
* [ ] Khối Kinh doanh liệt kê `Mới/Đã liên hệ/Tiềm năng/Đã chốt/Chưa phù hợp` + ghi chú pipeline ước tính.

## 3. Select dropdown đẹp (4 checks)

* [ ] `categoryIds/destinationIds/relatedTourSlugs` trong form Tour/Bài viết hiện chip + ô tìm, không còn `<select>` native hay input gõ tay.
* [ ] Thêm chip chỉ cho chọn trong danh sách; gỡ bằng nút `×`; mã lạ hiện cảnh báo `Có mã không tồn tại…`.
* [ ] `src/ogImage/photoSrc/parentId` là dropdown search có preview ảnh (media) hoặc label `Danh mục gốc`.
* [ ] Sửa `Hotline` ở `settings/site` thì `hotlineHref` tự thành `tel:+84...` sau khi lưu (không cần sửa tay).

## 4. Trang chủ sections (4 checks)

* [ ] Tab `Trang chủ sections` có 1 bản ghi `home-sections`; sửa + Xuất bản là web đổi ngay.
* [ ] QuickFinder: đổi `suggestions` thì pill trang chủ đổi theo.
* [ ] Story + FAQ: đổi `story.trips` / `planning.questions` (VI+EN) thì `JourneyStory/PlanningSection` đổi theo.
* [ ] Explore/Regions/Values: đổi tiêu đề/moods/ảnh `photoSrc` (chọn từ media) thì 3 sections đổi theo; ảnh sai định dạng bị từ chối.

## 5. Tracking (5 checks)

* [ ] Không track `/admin`, không track bot (bot/crawl/spider/curl...).
* [ ] Mỗi đổi trang gửi 1 lần (sendBeacon, fallback fetch keepalive).
* [ ] Payload đủ `path/referrer/device/sessionId/visitorId`; visitor cookie 1 năm.
* [ ] Device theo rộng màn hình: `<768 mobile, <1024 tablet`.
* [ ] Lỗi track không ảnh hưởng UX; DB chỉ thêm row `page_views`, không lưu IP thô.

## 6. SĐT & liên hệ (3 checks)

* [ ] Đổi SĐT ở `Website & footer → Hotline` + Xuất bản → header/footer/nút gọi/Zalo dùng số mới.
* [ ] `hotlineHref` luôn dạng `tel:+84...` (tự chuẩn hoá từ số `0...` nhập vào).
* [ ] Số `vi-VN`, tiền `₫`, ngày chart `DD/MM`, không số bịa.

## 7. Lỗi thường gặp

* Hiện IP/browser cho admin -> sai, schema hiện tại không có cột đó.
* Logout khi mất mạng -> sai, chỉ `401` mới đăng xuất.
* Hardcode số demo trong Overview -> vi phạm trust rule.
* Sửa `messages.home.explore` mà Explore không đổi -> đã fix: Explore đọc từ `landing.explore`, không đọc messages nữa.
* Xoá hết mảng landing (suggestions/trips/questions) -> schema từ chối; phải để ít nhất 1 mục.
