# Pipeline triển khai

Chạy tuần tự P0 → P5. Không dừng sau bản kế hoạch hoặc UI mock khi đã nhận prompt triển khai. Mỗi chặng cập nhật STATUS.md bằng kết quả thật; không đánh dấu đạt dựa trên việc đã viết code. Đây không phải chỉ thị tạo subagent hoặc chat mới.

## P0. Kiểm tra checkout, phạm vi và môi trường

Đọc AGENTS.md của workspace/repo và skill landing-admin, humanizer, i-have-adhd; áp dụng Ponytail. Đọc hướng dẫn Next.js cài trong `node_modules/next/dist/docs/` trước khi viết code framework. Nếu thiếu dependency, dùng lockfile và npm ci tại worktree này, không đổi dependency chỉ để khởi động.

Xác nhận bằng `git status --short --branch`, `git branch --show-current`, `git rev-parse HEAD`, `git worktree list`. Phải làm ở `sea-trip-travel-hotels`, branch `feat/hotel-catalog`. Kiểm tra quota thật. Không copy .env, database, credentials, uploads riêng tư hoặc node_modules từ checkout khác một cách mặc định. Chuẩn bị database/upload directory test độc lập theo các biến cấu hình hiện có; đọc verify scripts để chắc rằng chúng không trỏ production. Chọn port không xung đột khi chạy dev; không kill process không thuộc task.

Đọc triển khai thực tế tại các vùng sau; tên/path có thể thay đổi, tìm bằng rg:

| Vùng | Điểm bắt đầu đã quan sát |
| --- | --- |
| CMS, storage, auth | src/server/cms/db.ts, store.ts, settings.ts, auth.ts; các API admin và version/cache |
| Public và admin navigation | src/config/navigation.ts, src/lib/admin-routes.ts, src/features/admin/ |
| Home, tour, dữ liệu | src/app/[locale]/page.tsx, src/domain/landing.ts, src/domain/tour.ts, src/lib/data/ |
| Lead và finance | src/domain/lead.ts, src/server/leads/, src/server/cms/leads.ts, finance.ts; docs/lead-flow.md |
| UI và kiểm chứng | src/app/globals.css, src/config/themes.ts, src/messages/, package.json, tests/, scripts/preflight.mjs |

Đầu ra: ghi trong STATUS.md bản đồ file bị ảnh hưởng, các convention tái sử dụng, baseline đã chạy và giới hạn môi trường. Không cần đợi duyệt lại các lựa chọn thông thường. Giả định nghiệp vụ mặc định đã có trong SPEC.md; chỉ hỏi khi phát hiện mâu thuẫn thực sự không thể giải quyết an toàn.

## P1. Dữ liệu, dịch vụ và quy tắc giá/phòng

- Thêm schema/validation, storage và migration an toàn cho hotel, room, rate, availability, tour relation và flags. Tái sử dụng records/CMS nếu phù hợp; dữ liệu ngày có ràng buộc uniqueness/version rõ. Không thêm ORM hay framework mới.
- Migration phải chạy lại an toàn, giữ records/leads/bookings cũ, mặc định module off. Không seed khách sạn demo vào production. Khai báo bảng mới trong backup/restore và mọi allowlist có liên quan; kiểm tra import/export nếu repo có.
- Viết resolver giá và tình trạng dùng chung server, date-only, tiền VND nguyên, ưu tiên/chồng rule theo SPEC. Viết tests các trường hợp biên trước khi nối UI.
- API admin giữ auth/session/CSRF và audit; public dùng projection riêng. API cập nhật hàng loạt có giới hạn payload, transaction và kiểm tra version. Chỉ invalidation sau ghi thành công.

Gate: unit tests tiền/ngày/phòng và persistence/auth test có ý nghĩa pass; reload dữ liệu giữ nguyên; schema/migration không phá dữ liệu cũ. Cập nhật STATUS.

## P2. Admin từ nhập liệu đến xuất bản

- Danh sách/editor/hạng phòng, reuse media picker và preview. Draft/live phân biệt rõ. Archive không làm hỏng yêu cầu cũ.
- Giá và số phòng theo lịch; bulk update khoảng ngày/thứ có preview. Không có con số còn phòng chung bất biến cho toàn khách sạn.
- Cấu hình module/home/nổi bật và gắn tour với quan hệ rõ ràng. UI cấu hình dễ hiểu, không lộ tên flag kỹ thuật cho khách public.
- Luồng lưu có pending/success/error/conflict; reload/back giữ trạng thái cần thiết. Nội dung đang sửa không mất khi server từ chối.

Gate: tạo một khách sạn demo local + hai hạng phòng, lưu nháp/preview/xuất bản/sửa giá/ẩn/lưu trữ; xác minh qua server read và reload. Xác minh request không có quyền bị từ chối.

## P3. Website từ home đến chọn phòng

- Thêm route theo locale, navigation desktop/mobile/footer, section home có thứ tự admin, danh sách/filter/URL/pagination và detail/gallery/room picker.
- Liên kết tour và preserve context; chỉ render dữ liệu được xuất bản. Giá thiếu, phòng 0 và chưa có ngày có UI riêng đúng SPEC.
- Feature flag phải bao phủ cả server reads, public API, route, liên kết, sitemap, SEO và cache. Tắt module vẫn giữ admin và lead tour hoạt động.
- Metadata/canonical/breadcrumb/structured data nếu phù hợp với convention. Không tạo sao đánh giá giả hoặc Offer cho giá không xác định. Không index các tổ hợp filter tùy tiện; theo SEO pattern repo.

Gate: kiểm chứng desktop/mobile và VI/EN, nháp/off không rò public; filter/back/forward hoạt động; UI đúng UI.md. Lưu ảnh chụp thật vào output local và ghi đường dẫn bằng chứng.

## P4. Yêu cầu khách sạn + tour và sale

- Mở rộng schema/form/service/store/email/admin lead end-to-end, giữ tương thích lead tour cũ. Tour context, room quantities, dates, children ages và snapshot lưu được.
- Giá phải tính/đọc lại ở server. included không cộng trùng, upgrade chuyển sale báo chênh lệch. Validation chống giả hotel/room/tour ID và phòng thuộc khách sạn khác.
- Lưu yêu cầu trước/độc lập với kết quả notification theo convention thực tế; chống duplicate bằng cơ chế hiện có hoặc bổ sung tối thiểu. Dùng transport test, không gửi email/Zalo thật.
- Admin cập nhật trạng thái, báo giá và phương án đã xác nhận, liên kết booking tour sau khi khách chốt; không tự tạo doanh thu, không tự trừ kho.

Gate: thao tác khách gửi → admin thấy → tư vấn → báo giá → xác nhận → liên kết booking; kiểm tra email lỗi/retry không mất hoặc nhân đôi lead, tour lead cũ vẫn hoạt động.

## P5. Nghiệm thu và bàn giao local

Chạy tất cả case trong ACCEPTANCE.md. Thêm test nontrivial mới vào test command/verification phù hợp để không chỉ chạy thủ công rồi bị CI bỏ qua. Không viết test chỉ mirror markup.

Đọc script thực tế rồi chạy từ đúng worktree:

```powershell
npm run verify:preflight -- --full
npm run security:check
```

Không PREFLIGHT_SKIP, skip assertion, continue-on-error, tắt test hoặc dùng run của checkout khác làm bằng chứng. Nếu hạ tầng bắt buộc thiếu, ghi chính xác command, exit code, lỗi và điều gì chưa kiểm chứng. Không gọi chặng P5 hoàn tất khi còn gate bắt buộc chưa pass.

Nếu chạm hạ tầng, chạy thêm Docker build + smoke read-only/persistent-volume theo repo; mặc định module này không cần sửa hạ tầng. Trước publish history sau này còn phải chạy security:history theo AGENTS.md.

Hoàn thiện hướng dẫn admin ngắn trong `docs/hotels/ADMIN-GUIDE.md` khi UI thật đã tồn tại (không viết như tính năng đã chạy khi mới có kế hoạch). Cập nhật STATUS.md với file thay đổi, command/results, ảnh kiểm thử, blockers và quy trình chạy local. Có thể thêm test fixtures vào code nhưng không publish dữ liệu demo.

Kết thúc bằng báo cáo local: chức năng thực sự hoàn tất, command pass/fail, giới hạn, branch/path. Không push/PR/merge/deploy trong phạm vi prompt này; không tự commit nếu chưa có chỉ thị. Nếu quota dưới ngưỡng, checkpoint CONTINUE.md và báo phần chưa xong, không hứa giám sát sau khi turn kết thúc.
