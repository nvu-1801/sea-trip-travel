# Kế hoạch: dịch nội dung quản trị VI → EN

Phạm vi tài liệu: đề xuất triển khai tính năng dịch chủ động trong các form nội dung của SEA TRIP Studio. Tài liệu được lập sau khi đọc repo hiện tại; chưa có thay đổi source hay package.

## 1. Hiện trạng đã xác minh

- Repo chính: `sea-trip-travel`, nhánh `main`; stack Next.js `16.4.2`, React `19.3.0`, TypeScript strict, Zod 4, SQLite CMS; hiện không có SDK dịch thuật trong `package.json`.
- `src/features/admin/dashboard.tsx` điều phối các khu vực Studio và gọi API quản trị. Các form nội dung hiện nằm trong `src/features/admin/tour-editor.tsx`, `destination-editor.tsx`, `hero-editor.tsx`, `customer-stories-editor.tsx`, `editor.tsx`; preview form tour/bài viết ở `draft-preview.tsx`.
- `src/domain/tour-cms.ts` có `_en` và `_enReviewed` cho tour. `src/server/cms/store.ts` mở rộng dữ liệu article/category/destination bằng `_en` và `_enReviewed`. Schema bài viết (`src/domain/article.ts`) lưu nội dung theo block phân biệt kiểu, gồm văn bản, heading, list, quote, callout và image; block ảnh có `src` riêng.
- Dữ liệu trang chủ đã có trường EN tương ứng: `src/domain/home-hero.ts` dùng cặp `vi`/`en` và `captionEn`/`titleEn`/`descriptionEn`; `src/domain/landing.ts` định nghĩa nhiều cặp `*`/`*En` cho story, FAQ, trust, region, explore, values, featured, customer stories. `src/server/cms/settings.ts` có `workingHoursEn`, `labelEn`, `homeTitleEn`, `homeDescriptionEn`.
- CMS lưu data và published snapshot dưới dạng JSON trong bảng SQLite `records` (`src/server/cms/db.ts`). API lưu nội dung hiện hành là `src/app/api/admin/content/[collection]/route.ts`; POST yêu cầu `requireSession`, cùng origin và CSRF. Body parser `jsonBody` mặc định giới hạn 600.000 bytes (`src/server/cms/http.ts`).
- Xác thực admin dùng cookie `HttpOnly`, `SameSite=Strict`, session DB và kiểm tra CSRF cho mutation trong `src/server/cms/auth.ts`. API content dùng Zod schema trước khi ghi qua `save()`.
- `src/features/admin/draft-preview.tsx` preview tour/bài viết từ data local chưa lưu, nhưng hiện chỉ render bản rút gọn bằng tiếng Việt. `/admin/preview/[kind]/[id]` dùng dữ liệu nháp đã lưu để xem trang đầy đủ.
- Bài viết không dùng HTML/MDX tùy ý: cấu trúc block được render theo kiểu. `src/lib/sanitize.ts` hiện có helper escape URL/text nhưng không phải HTML sanitizer. Vì vậy không đưa chuỗi HTML từ dịch vụ vào `dangerouslySetInnerHTML`; dịch từng node text và giữ nguyên cấu trúc.
- Lệnh repo đã xác minh trong `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run verify:tour-editor`, `npm run test:cms`, `npm run verify:cms`, `npm run verify:ui`, `npm run verify:preflight -- --full`.
- Hướng dẫn repo yêu cầu đọc tài liệu Next.js đang cài tại `node_modules/next/dist/docs/` trước khi sửa code. Việc triển khai sau này phải làm theo `AGENTS.md`, kể cả gate trước push/PR.

## 2. Phạm vi phiên bản đầu

Áp dụng nút “Dịch sang tiếng Anh” cho các trường người quản trị nhập có counterpart English trong các form quản trị nội dung:

1. Tour: title, summary, overview, highlights, itinerary text, included/excluded, notes, policies, tags, badge/price note/departure points, alt ảnh và SEO title/description.
2. Bài viết: title, excerpt, tags, SEO, và text trong body blocks (paragraph, heading, list items, quote/cite, callout title/text, image alt/caption). Giữ `type`, level, tone, thứ tự block và `src`.
3. Danh mục và điểm đến: name/title, description/tagline, summary/province, SEO và alt ảnh nếu có bản EN trong model.
4. Trang chủ/hero/landing: chỉ các trường VI có counterpart EN trong `home-hero.ts`, `landing.ts` và `settings.ts`, gồm CTA label, FAQ, giới thiệu, story, trust/value, customer story, SEO title/description, nhãn footer và giờ làm việc.
5. Nội dung do admin nhập trong các form quản trị khác: trước khi đưa nút vào phải lập inventory form và đối chiếu schema; chỉ đưa vào khi xác định được trường nguồn VI và đích EN rõ ràng.

Không dịch slug/path, id, URL/link, mã tour, giá, số lượng, ngày, trạng thái, danh mục/tham chiếu, tên thương hiệu `SEA TRIP`, ảnh hoặc `image.src`. `image.alt` có thể dịch vì là văn bản mô tả; ảnh và URL của ảnh giữ nguyên. Không dịch nhãn UI tĩnh trong `/admin`, lead riêng tư, audit log hay dữ liệu không phải nội dung xuất bản.

Chưa làm ở V1: tự lưu/publish; dịch tự động nền; dịch ngược EN→VI; tự đánh dấu `_enReviewed`; glossary/tone tùy chỉnh; dịch tài liệu; batch/background jobs; sửa URL/slug; hỗ trợ locale khác; thay editor/schema đa ngôn ngữ; dịch các khóa giao diện `src/messages/*.json`.

## 3. Nhà cung cấp đề xuất

Đề xuất **Google Cloud Translation Basic v2 với NMT**, gọi REST từ server bằng `fetch` tích hợp Node/Next, không thêm SDK ở V1. Tài liệu Google hiện liệt kê `vi`↔`en`; Basic NMT hỗ trợ dịch text, còn endpoint dịch cho phép gửi tối đa 128 strings trong một request. Advanced hỗ trợ HTML và glossary nhưng có thêm project/parent/location và cấu hình credentials phức tạp hơn; phần editor hiện dùng text field và block có kiểu, nên giữ cấu trúc ở ứng dụng và chỉ gửi leaf text là đủ.

Pricing công khai hiện ghi mức cơ bản 20 USD/1 triệu ký tự, áp dụng credit 10 USD/tháng cho 500.000 ký tự đầu theo điều kiện trang giá. Chi phí thực tế phụ thuộc thay đổi giá, billing và lượng dùng; cấu hình quota/budget alert trong Google Cloud. Trước triển khai cần chốt tài khoản/project và bật API, không ghi API key vào source. Đặt key trong secret env phía server, giới hạn key theo API/IP nếu phù hợp triển khai VPS, không log URL request vì key Basic nằm ở query string.

Tài liệu chính thức đã kiểm tra ngày 28/10/2026:

- [Translate text / Basic và Advanced](https://docs.cloud.google.com/translate/docs/translate-text)
- [Supported languages](https://docs.cloud.google.com/translate/docs/languages)
- [Cloud Translation pricing](https://cloud.google.com/translate/pricing)
- [Quotas and limits](https://docs.cloud.google.com/translate/quotas)
- [Data usage FAQ](https://docs.cloud.google.com/translate/data-usage)
- [Supported formats](https://docs.cloud.google.com/translate/docs/supported-formats)

Tài liệu xác nhận Google chỉ dùng payload để cung cấp API, giữ dữ liệu tạm thời trong bộ nhớ để dịch, không dùng payload để huấn luyện/cải thiện Translation. Đây vẫn là dịch vụ bên ngoài: chỉ gửi nội dung được yêu cầu dịch, không đưa dữ liệu lead/secret/nhật ký vào payload.

## 4. Luồng UI

1. Admin đăng nhập và mở form nội dung. Bản Việt và các field EN hiện có vẫn theo cấu trúc editor hiện tại.
2. Nút “Dịch sang tiếng Anh” chỉ gọi khi admin bấm. Nếu các trường đích EN có dữ liệu, hỏi xác nhận trước khi thay. Khi chờ, disable nút và hiển thị tiến trình.
3. Client gửi đối tượng dữ liệu có kiểu và snapshot nguồn VI (không gửi URLs/IDs/ảnh). Server xác thực, validate allowlist theo `kind`, giới hạn body/tổng ký tự và gọi Google.
4. Server trả map giá trị EN theo stable field path/index, không lưu database. Client áp kết quả vào các trường EN chưa bị người dùng sửa kể từ lúc gửi.
5. Khi trường VI thay đổi sau dịch, hiện cảnh báo “Bản tiếng Anh có thể cần cập nhật”. Nếu người dùng thay nội dung đích trong lúc chờ, kết quả trả muộn không được ghi đè những trường đó; bỏ các path đã chỉnh và thông báo có nội dung được giữ lại.
6. Admin chuyển ngôn ngữ preview VI/EN; preview đọc trực tiếp state hiện tại trong form, chưa lưu. Tour/bài viết mở rộng `DraftPreview`; landing/hero/customer story tái dùng preview sẵn có hoặc component hiển thị thật phù hợp.
7. Bấm Lưu bản nháp hoặc Xuất bản theo luồng hiện có. Chỉ thao tác lưu hiện hành ghi cả VI và EN vào JSON `records`; dịch không tự lưu, không tự đổi trạng thái review.
8. Tải lại/mở form phải cho thấy đúng nội dung EN đã sửa và lưu.

## 5. API và dữ liệu

### API đề xuất

`POST /api/admin/translate`

Request khái niệm:

```json
{
  "kind": "tour | article | category | destination | hero | landing | settings",
  "sourceLocale": "vi",
  "targetLocale": "en",
  "fields": [{ "path": "title", "value": "..." }]
}
```

`path` chỉ nhận allowlist cụ thể do schema/domain định nghĩa; không nhận path tùy ý để tránh dịch/mutate trường bị cấm. Với arrays/blocks, client/server flatten text nodes giữ mapping path-index, dịch string values theo batch ≤128 items, rồi reconstruct cùng cấu trúc. Bỏ item rỗng. Server kiểm tra tổng ký tự và UTF-8 bytes, số node, độ dài tối đa từng field, loại dữ liệu và giá trị `kind`; cố định `vi`→`en` ở endpoint thay vì tin locale do client gửi.

Response khái niệm:

```json
{ "translations": [{ "path": "title", "value": "..." }] }
```

Trả 400 cho dữ liệu sai/không hỗ trợ; 401/403 theo auth/CSRF/origin; 413 khi quá cỡ; 429 khi quá quota ứng dụng; 502/504 khi nhà cung cấp lỗi/timeout. Abort upstream khi client ngắt kết nối nếu hỗ trợ. Timeout đề xuất 15–20 giây; giới hạn tốc độ theo session admin, ví dụ 10 lượt/phút và giới hạn ký tự/tổng request cấu hình được. Response `no-store`.

### Xử lý kết quả không ghi đè

- Mỗi thao tác có request id và snapshot hash/version của field nguồn.
- Lúc gửi, giữ snapshot các field đích. Khi nhận response, chỉ áp từng field nếu giá trị đích hiện tại vẫn bằng giá trị lúc gửi và nguồn tương ứng vẫn bằng snapshot gửi đi.
- Nếu field đích/nguồn đã đổi, giữ nguyên dữ liệu mới nhất trong form, bỏ kết quả tương ứng và báo rõ số trường cần xử lý lại.
- Nếu request tổng thể lỗi hoặc response thiếu path/không hợp lệ, không mutate form; lần dịch sau chỉ chạy khi admin bấm lại.

### Lưu và migration

Không cần schema migration dự kiến: CMS lưu JSON linh hoạt và model đã có trường English cho các form nêu trên. Nối translated fields hiện có vào mutation `save()` và kiểm tra `published` snapshot lưu đúng cả hai ngôn ngữ. Nếu inventory phát hiện một collection hiện thiếu trường EN thì bổ sung field optional vào schema Zod và form; dùng fallback dữ liệu hiện tại, không ghi đè record cũ. Chỉ tạo migration nếu cần thay đổi quan hệ/table; khi đó phải thêm migration additive có ledger `cms_migrations`, backfill nullable an toàn, giữ backup, và cung cấp rollback bằng restore backup hoặc code tương thích cả schema trước/sau. V1 dự kiến không cần việc này.

## 6. Preview, HTML và cấu trúc

- Không chuyển HTML trả về từ dịch vụ thành HTML thực thi. Hiện bài viết là structured blocks và được render React; dịch từng text node, giữ loại block, thứ tự, URL và `src`.
- Form hiện có text, textarea và danh sách có cấu trúc; nếu inventory có rich-text/HTML editor, parse theo schema hiện hữu và sanitize allowlist trước khi preview/render. Không dùng `dangerouslySetInnerHTML` cho nội dung dịch chưa được làm sạch.
- Preview EN phải chọn overlay EN và fallback theo quy tắc public hiện có khi EN trống. Preview VI/EN phải dùng state form hiện tại, không request dữ liệu nháp đã lưu.
- Tái sử dụng component public cho bản xem trước đầy đủ khi có thể mà không làm preview kích hoạt publish/cache công khai. Nếu không thể dùng trực tiếp vì dependency route/server, tiếp tục preview rút gọn nhưng hiển thị đầy đủ các trường cần duyệt và ghi rõ giới hạn.

## 7. File dự kiến khi triển khai

Danh sách là dự kiến, agent cần đối chiếu source tại thời điểm triển khai:

- `src/app/api/admin/translate/route.ts` — endpoint xác thực, giới hạn tốc độ/request, gọi provider.
- `src/server/translation/google-cloud.ts` — adapter REST Google, timeout, response validation, redaction lỗi.
- `src/domain/translation.ts` (hoặc module tương đương) — allowlist và schema request/response theo loại nội dung.
- `src/features/admin/translation-button.tsx` và helper hook/utility — trạng thái busy/success/error, xác nhận ghi đè, snapshot race handling, dirty-field tracking.
- `src/features/admin/tour-editor.tsx`, `editor.tsx`, `destination-editor.tsx`, `hero-editor.tsx`, `customer-stories-editor.tsx`, `dashboard.tsx` — nối dịch vào các form đã kiểm kê, giữ UI style đang có.
- `src/features/admin/draft-preview.tsx` cùng preview/component liên quan — chuyển VI/EN, phản ánh form state.
- `src/messages/vi.json`, `src/messages/en.json` — nhãn/nội dung trạng thái nếu các chuỗi admin hiện dùng catalog; giữ parity key.
- `.env.example` — tên cấu hình server như `GOOGLE_TRANSLATE_API_KEY`, timeout/quota nếu dùng; chỉ placeholder, không secret thật.
- Tests hiện có trong `tests/` và script kiểm chứng admin liên quan — kiểm thử mapping/allowlist, request validation, bảo toàn block, timeout/lỗi, dirty-field race và save/reload.

## 8. Trình tự triển khai

1. Lập inventory tất cả form quản trị và field schema; xác nhận nguồn/đích song ngữ, preview tương ứng. Đọc hướng dẫn Next 16.4 cài tại `node_modules/next/dist/docs/` theo `AGENTS.md`.
2. Chốt provider project, API key/env, billing/quota và giới hạn nội dung; không triển khai nút nếu thiếu cấu hình server-side và cần có thông báo provider chưa cấu hình.
3. Thiết kế allowlist mapping có type cho từng collection; loại bỏ ID/slug/href/src/giá/cấu hình. Xác thực Zod cho request và response.
4. Viết adapter server REST, timeout, giới hạn input, xử lý HTTP lỗi và log tối thiểu (loại collection, kết quả, số ký tự; không nội dung/key).
5. Thêm route `POST /api/admin/translate` với `requireSession(request)`, same-origin/CSRF, `jsonBody` có max nhỏ hơn endpoint save, rate limit và response no-store.
6. Thêm UI dịch chung, confirm khi EN đã có; apply theo field path chỉ khi snapshots còn khớp; cảnh báo VI stale; không tự gọi hay tự lưu.
7. Móc các form content; giữ collection-specific schemas and serialization. Kiểm tra save draft/publish, reload và fallback locale.
8. Mở rộng preview local cho VI/EN, structured body, links/media; đảm bảo safe rendering.
9. Chạy lệnh xác nhận trong §9 và browser verification trên login/admin/form/preview; sửa lỗi theo root cause.
10. Khi được yêu cầu release mới áp dụng quy trình `AGENTS.md`: full preflight, branch/PR/CI/deploy/health. Kế hoạch này tự nó không cấp phép release.

## 9. Tiêu chí nghiệm thu và kiểm tra

- Nút dịch chỉ tồn tại trong admin đã xác thực; khách public không thấy endpoint/UI dịch.
- Chỉ dịch sau click; spinner/busy; click lặp bị chặn; hiển thị thành công, lỗi, timeout, rate limit, chưa cấu hình API và lỗi provider.
- Có nội dung EN → xác nhận; từ chối xác nhận thì giữ nguyên tất cả. Khi nhận kết quả lỗi/JSON lỗi/response thiếu field thì dữ liệu hiện tại không đổi.
- Mọi path ngoài allowlist bị từ chối. URL, ID, slug, brand, image src, giá, liên kết, block type/thứ tự và placeholder giữ nguyên; text nodes tương ứng được dịch.
- Bản EN chưa có → điền field EN; bản đã có → chỉ ghi form sau confirm; không lưu tự động và không set reviewed.
- Sửa field EN trong khi request đang chờ thì kết quả muộn không ghi đè field vừa sửa. Sửa VI trong khi chờ thì kết quả phụ thuộc VI đã thay đổi bị bỏ; form giữ nguyên và hiện cảnh báo.
- Sửa VI sau khi dịch báo bản EN có thể cũ. Nội dung người dùng sửa trực tiếp trong EN giữ nguyên qua preview/lưu/tải lại.
- Preview VI/EN dùng dữ liệu chưa lưu đang có trong form; không thực thi HTML chưa sanitize; cấu trúc bài viết, URL và ảnh nguyên vẹn.
- API cần admin session + CSRF/origin; thiếu auth trả 401, thiếu CSRF/origin hợp lệ trả 403, vượt size trả 413, vượt rate trả 429; upstream lỗi có mã lỗi an toàn.
- Log không chứa key, toàn bộ body, draft content hoặc HTML; log chỉ có metadata tối thiểu.
- Kiểm tra lưu nháp và publish cả hai locale, mở lại record; nội dung EN đúng từng field. Dữ liệu cũ không có `_en` vẫn mở/sửa/lưu bình thường.

Lệnh kiểm tra lấy từ cấu hình repo:

```bash
npm run typecheck
npm run lint
npm test
npm run verify:tour-editor
npm run test:cms
npm run verify:cms
npm run verify:ui
npm run build
npm run verify:preflight -- --full
```

Không nhất thiết chạy từng lệnh trùng lặp nếu `verify:preflight -- --full` đã gọi chúng; xem `scripts/preflight.mjs` trước khi chọn tổ hợp tối thiểu. Không tự chạy vì yêu cầu hiện tại chỉ lập kế hoạch.

## 10. Thông tin còn thiếu ảnh hưởng triển khai

1. Google Cloud project, bật Cloud Translation API, API key/credential server-side và thiết lập billing/quota chưa được xác minh. Không có cấu hình này thì UI có thể phát triển nhưng dịch thật chưa nghiệm thu end-to-end.
2. Chưa xác minh mọi form admin có trong menu còn đối chiếu English counterpart không; agent triển khai phải hoàn tất inventory (đặc biệt các trường nội dung settings, messages, customer stories, homepage sections).
3. Chưa chốt giới hạn ký tự theo một lần dịch và chính sách vận hành chi phí. Mặc định đề xuất tổng input tối đa 20.000 codepoints/lần, tần suất 10 lần/phút/session, điều chỉnh theo form bài viết và quota Google.
4. Preview component thật cho từng loại record chưa hoàn toàn chung; tour/bài viết đã có preview rút gọn hiện tại. Cần chọn mức preview full hay rút gọn theo ràng buộc component hiện thực trước khi code.

