# Prompt giao agent triển khai dịch VI → EN trong toàn bộ form Admin

Sao chép nội dung sau cho agent khi bắt đầu phiên triển khai:

```text
Triển khai tính năng dịch thủ công nội dung tiếng Việt sang tiếng Anh trong toàn bộ form biên tập nội dung của Sea Trip Studio.

Đọc trước AGENTS.md ở repo, README.md, docs/ADMIN-TRANSLATION-PLAN.md, docs/I18N_GUIDE.md, docs/architecture.md và các schema/form/API liên quan. Theo AGENTS.md, đọc hướng dẫn Next.js 16.4 đang cài trong node_modules/next/dist/docs/ trước khi sửa code. Không giả định plan luôn đúng với source mới: kiểm tra git status, source, package.json, test và xác minh lại từng form, schema, API, preview, auth, lưu trữ.

Mục tiêu UI:
1. Admin nhập/chỉnh nội dung VI và bấm “Dịch sang tiếng Anh”. Không gọi dịch tự động khi mount, gõ hoặc lưu.
2. Kết quả điền vào field English tương ứng; người dùng tiếp tục sửa trực tiếp.
3. Preview cho phép chọn VI/EN và hiển thị state hiện tại trong form dù chưa lưu; tái dùng component thật khi phù hợp.
4. Lưu qua cơ chế CMS hiện tại; reload phải giữ đúng EN đã chỉnh. Dịch không tự lưu, publish hay đánh dấu reviewed.

Phạm vi phải bao phủ mọi form quản trị có nội dung biên tập và counterpart English, gồm kiểm kê các form tour, bài viết, danh mục, điểm đến, hero, home/landing sections, customer stories, site/footer/SEO/settings và form nội dung khác phát hiện trong menu Admin. Không thêm nút vào trang public. Với form không có cặp field VI/EN, báo rõ trong phần tổng kết và chỉ bổ sung nếu model có thể mở rộng phù hợp kiến trúc hiện tại.

Dịch những text field thuộc nội dung: heading/title, summary, mô tả, CTA label, dịch vụ, FAQ, story, tags, alt text, SEO title/meta description và nội dung bài viết. Với bài viết structured blocks, chỉ dịch leaf strings của paragraph/heading/list/quote/callout/alt/caption; bảo toàn type, level, tone, thứ tự, id, links và image src. Không dịch URL, slug, ID, tên thương hiệu SEA TRIP, mã tour, số/giá/ngày, trạng thái, đường dẫn ảnh hay dữ liệu không phải copy. Không dịch UI labels/messages mặc định trừ khi đây thật sự là nội dung CMS.

Nhà cung cấp theo plan: Google Cloud Translation Basic v2, NMT, server-side REST qua fetch của runtime; không thêm SDK trừ khi tài liệu chính thức hiện hành và kiến trúc chứng minh cần thiết. `vi`→`en`, batch text node tối đa 128 item/request. Dùng secret server-only `GOOGLE_TRANSLATE_API_KEY`; không trả secret xuống client, không log URL chứa key. Giới hạn body/character/array depth theo provider và schema (mặc định plan tổng 20.000 codepoints/lượt), timeout 15–20 giây, rate limit per admin session, lỗi có mã/status phù hợp. API chỉ xác thực admin qua cơ chế hiện tại `requireSession(request)` bao gồm origin + CSRF. Validate strict bằng Zod và allowlist path theo collection; không nhận paths tùy ý. Response no-store. Không log nội dung draft, credentials hoặc toàn bộ provider response.

Yêu cầu trạng thái và an toàn dữ liệu:
- trạng thái translating/success/error; disable nút khi chạy;
- nếu English target có nội dung, hỏi xác nhận trước khi ghi đè; huỷ thì không đổi form;
- lỗi provider/timeout/malformed/partial response không làm mất hoặc thay đổi dữ liệu;
- chống stale response: chụp snapshot giá trị VI + EN lúc gửi; khi response về chỉ áp từng field nếu giá trị nguồn và target vẫn bằng snapshot. Nếu target đã được user sửa, giữ user value. Nếu source VI đổi, bỏ kết quả tương ứng, giữ dữ liệu mới và hiển thị cảnh báo;
- khi VI đổi sau lần dịch thành công, hiển thị EN có thể cần cập nhật;
- preview đọc state chưa lưu và locale đang chọn; không render HTML chưa sanitize, không dùng dangerouslySetInnerHTML cho text dịch. Giữ cấu trúc editor và các component/flow hiện có;
- giữ schema/model song ngữ hiện có; tránh migration. Chỉ tạo migration khi source chứng minh thật sự cần và mô tả backfill/rollback.

Giữ stack, design system, wording và cấu trúc repo. Chia logic tái dùng thành adapter server, schema/mapping có type và UI control/hook nhỏ; không copy-paste logic dịch riêng từng form. Bảo vệ tính tương thích record cũ thiếu `_en`/field EN. Không thay đổi nội dung dịch EN hiện có khi người dùng huỷ overwrite.

Thêm tests theo pattern repo cho mapping allowlist, cấu trúc bài viết, auth/CSRF, validation/size/rate limit, provider timeout/error/malformed response, overwrite confirmation behavior, stale/dirty field race, preview VI/EN và save/reload. Không mock ở cách khiến tests cần gọi dịch vụ ngoài; dùng adapter fake.

Chạy kiểm tra phù hợp bằng script có thật trong package.json: typecheck, lint, npm test, verify:tour-editor, test:cms, verify:cms, verify:ui, build và `npm run verify:preflight -- --full` theo AGENTS.md trước push/PR. Không bỏ qua/giảm gate. Trước khi sửa, nêu ngắn inventory form và files dự định chạm; sau khi code, tổng kết files, behavior, tests/lệnh và kết quả, cấu hình secret/quota còn cần chủ project cung cấp, và hạn chế còn lại.

Không thêm package/secret vào repo. Không deploy, push, mở PR hay merge trừ khi người dùng yêu cầu rõ trong phiên đó; nếu có yêu cầu release thì làm đầy đủ đúng quy trình AGENTS.md.
```

