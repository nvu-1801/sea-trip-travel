# Dịch nội dung VI → EN trong SEA TRIP Studio

Tài liệu vận hành cho nút **“Dịch sang tiếng Anh”** trong các form biên tập. Kế
hoạch gốc: `docs/ADMIN-TRANSLATION-PLAN.md`. Quy tắc song ngữ công khai:
`docs/I18N_GUIDE.md`.

## 1. Nguyên tắc

- Chỉ admin đã đăng nhập thấy nút. Không có nút hay endpoint dịch trên website
  công khai.
- Không tự dịch khi mở form, nhập liệu hay lưu. Chỉ gọi khi bấm nút.
- Kết quả chỉ điền vào state của form. Không tự lưu, xuất bản hay đặt
  `_enReviewed`.
- Nếu trường EN đã có chữ, admin phải xác nhận trước khi ghi đè.
- Khi request đang chạy, nút bị khóa; form vẫn sửa được. Kết quả chỉ áp cho
  trường mà cả bản VI gửi đi và bản EN đích chưa bị đổi. Thay đổi cấu trúc
  (thêm/bớt ngày, block, ảnh, video) huỷ cả lô và giữ nguyên dữ liệu.
- Sửa VI sau lần dịch hiện cảnh báo “Bản tiếng Anh có thể cần cập nhật”.
- Lỗi mạng, timeout, response thiếu/sai định dạng: không thay đổi bất kỳ field
  nào.

## 2. Inventory form và cặp trường VI → EN

| Form Studio | Trường VI được gửi dịch | Đích EN |
| --- | --- | --- |
| Tour (`tours`) | `title`, `summary`, `badge`, `priceNote`, `overview[]`, `highlights[]`, `included[]`, `excluded[]`, `notes[]`, `policies[]`, `tags[]`, `departurePoints[]` | `_en.*` cùng tên |
| Tour – lịch trình | `itinerary[i].title/summary/accommodation`, `itinerary[i].activities[]/meals[]/places[]` | `_en.itinerary[i].*` (giữ `id`, `index`, thứ tự) |
| Tour – ảnh & SEO | `images[i].alt`, `seo.title`, `seo.description` | `_en.imageAlts[i]`, `_en.seo.*` |
| Bài viết (`articles`) | `title`, `excerpt`, `tags[]`, `seo.title`, `seo.description` | `_en.*` |
| Bài viết – block | `body[i].text` (paragraph/heading/quote/callout), `body[i].items[]` (list), `body[i].cite`, `body[i].title` (callout), `body[i].alt`, `body[i].caption` (image) | `_en.body[i].*` (giữ `type`, `level`, `ordered`, `tone`, `src`, thứ tự) |
| Danh mục (`categories`) | `name`, `description`, `tagline`, `seo.title`, `seo.description` | `_en.*` |
| Điểm đến (`destinations`) | `name`, `summary`, `province` | `_en.*` |
| Hero / ảnh đầu trang (`hero`) | `vi.badge/titleLine1/titleLine2/description/primaryLabel/secondaryLabel`, `slides[i].caption/title/description` | `en.*`, `slides[i].captionEn/titleEn/descriptionEn` |
| Trang chủ – Khám phá (`landing.explore`) | `eyebrow`, `titleA`, `titleB`, `body`, `footnote` | `*En` |
| Trang chủ – Vùng miền (`landing.regions`) | `eyebrow`, `titleA`, `titleB`, `intro`, `moods[]` | `*En`, `moodsEn[]` |
| Trang chủ – Lịch trình gợi ý (`landing.story`) | `trips[i].title`, `trips[i].body` | `titleEn`, `bodyEn` |
| Trang chủ – FAQ (`landing.planning`) | `questions[i].q/a/tag` | `qEn/aEn/tagEn` |
| Trang chủ – Cam kết (`landing.trust`) | `items[i].title/body` | `titleEn/bodyEn` |
| Trang chủ – Giá trị (`landing.values`) | `badge`, `photoAlt`, `principles[i].title/body` | `badgeEn`, `photoAltEn`, `titleEn/bodyEn` |
| Trang chủ – Khách hàng (`landing.customers`) | `eyebrow/title/body/ctaLabel/logosTitle/videosTitle`, `videos[i].title/body/customer` | `*En`, `videos[i].*En` |
| Trang chủ – Tour nổi bật (`landing.featured`) | `scopes[categoryId].title`, `scopes[categoryId].eyebrow` | `titleEn`, `eyebrowEn` |
| Website & footer (`settings`) | `contact.workingHours`, `footerLinks[i].label`, `seo.homeTitle`, `seo.homeDescription` | `workingHoursEn`, `labelEn`, `homeTitleEn`, `homeDescriptionEn` |

Không gửi/dịch: `id`, `slug`, `path`, URL/`href`, `src`, `ogImage`, mã tour,
giá/`priceFrom`/`pricingOptions`, số ngày/đêm, thời lượng, trạng thái, danh mục
và tham chiếu, tên thương hiệu `SEA TRIP`, số liệu. `finder.suggestions` và
`guides` chỉ chứa truy vấn/slug nên không có bản EN. Tên/thẻ vùng miền dùng
chung bản ghi Danh mục — sửa bản EN ở tab Danh mục.

## 3. API

`POST /api/admin/translate`

```json
{
  "kind": "tour | article | category | destination | hero | landing | settings",
  "section": "explore | regions | story | planning | trust | values | customers | featured",
  "fields": [{ "path": "title", "value": "…" }]
}
```

- `requireSession(request)` → cookie admin + same-origin + `x-csrf-token`.
- Body tối đa 200.000 byte; tối đa 300 field; 5.000 ký tự/field; 20.000
  codepoint/lần; 10 request/phút/session + 60 request/phút toàn hệ thống.
- Mỗi `path` phải khớp allowlist của `kind`/`section`; path trùng bị từ chối.
- Response `{ translations: [{ path, value }] }`, `cache-control: no-store`.
- 400 sai dữ liệu/path; 401 chưa đăng nhập; 403 sai origin/CSRF; 413 quá cỡ;
  429 quá tần suất; 502 provider/response lỗi; 503 chưa cấu hình key; 504
  timeout.

## 4. Google Cloud Translation Basic v2

1. Tạo/chọn Google Cloud project, bật **Cloud Translation API**.
2. Bật billing; đặt budget/quota alert. Giá và credit thay đổi theo thời điểm —
   kiểm tra trang giá hiện hành trước khi dùng nhiều.
3. Tạo **API key**, giới hạn theo API Cloud Translation (và IP VPS nếu có).
4. Đặt secret chỉ ở server:
   ```env
   GOOGLE_TRANSLATE_API_KEY=...
   GOOGLE_TRANSLATE_TIMEOUT_MS=15000
   ```
   Không dùng tiền tố `NEXT_PUBLIC_`; không commit key.
5. Khởi động lại app/Docker để container nhận biến môi trường.

Adapter gọi `https://translation.googleapis.com/language/translate/v2` bằng
`fetch`, `format=text`, tối đa 128 string/lô, timeout mặc định 15 giây. Brand,
URL, email, placeholder `{…}`, giá và số được thay bằng token trước khi gửi và
phục hồi sau khi nhận; nếu token mất, response bị coi là không hợp lệ.

Không log key, URL có key, body gửi đi, draft hay nội dung dịch. Log chỉ gồm
`kind`, số field, số ký tự và kết quả.

### 4.1. Hạn mức miễn phí (bắt buộc khi dùng gói free)

Cloud Translation Basic có 500.000 ký tự miễn phí/tháng (credit dùng chung với
Advanced, không cộng dồn). Budget alert chỉ gửi cảnh báo, **không** tự ngắt, nên
app giữ bộ đếm riêng và chặn trước khi gọi Google:

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `TRANSLATION_DAILY_CHAR_LIMIT` | `15000` | Ký tự gửi đi trong một ngày (giờ Việt Nam). `0` = tắt giới hạn ngày. |
| `TRANSLATION_MONTHLY_CHAR_LIMIT` | `450000` | Trần cứng của tháng, dưới 500.000 ký tự miễn phí. `0` = tắt. |

- Bộ đếm lưu trong SQLite (`translation_usage`) trên volume `/app/data`, nên
  restart/redeploy hay nhiều worker cũng không reset. Ghi trong
  `BEGIN IMMEDIATE` nên hai admin bấm cùng lúc không thể cùng tiêu những ký tự
  cuối cùng.
- Ký tự được **giữ chỗ trước** khi gửi; quá hạn mức → HTTP 429 kèm số đã dùng,
  số cần và tên biến cần tăng. Chưa cấu hình key → 503 và hoàn lại chỗ đã giữ
  (Google chưa nhận request nào nên chưa tính phí).
- Lỗi provider/timeout **không** hoàn lại: Google có thể đã tính ký tự, nên đếm
  dư an toàn hơn đếm thiếu.
- Ngày của app tính theo giờ Việt Nam; quota ngày của Google reset lúc 00:00
  giờ Thái Bình Dương. Vì vậy hãy đặt quota Google **cao hơn hoặc bằng** giá trị
  `TRANSLATION_DAILY_CHAR_LIMIT` (ví dụ quota 18.000/ngày, app chặn ở 15.000).
- Bật quota trong Google Cloud: **APIs & Services → Cloud Translation API →
  Quotas & System Limits → “Characters sent to general model per project per day
  (v2 and v3)”** → sửa thành 15.000–18.000. Đây là giới hạn phía Google, app vẫn
  tự chặn trước.

**Không phát sinh phí khi khách xem web.** Nút dịch chỉ chạy khi admin bấm, kết
quả điền vào form và chỉ được lưu khi admin bấm Lưu/Xuất bản; trang công khai đọc
bản `_en` đã lưu trong CMS, không gọi Google. Nội dung cố định đã có bản VI/EN
trong `src/messages` và content seed thì không cần dịch lại.

## 5. Preview

- Tour/bài viết: `DraftPreview` có nút **Tiếng Việt / English**, đọc state chưa
  lưu và fallback từng trường về VI khi EN trống.
- Điểm đến: thẻ xem trước có VI/EN.
- Khách hàng & dấu ấn: khối “Xem nhanh” có VI/EN cho video.
- Hero: tab ngôn ngữ và khối xem nhanh ngay trong form.
- Nội dung luôn render bằng component React hiện có; không dùng
  `dangerouslySetInnerHTML` cho text dịch.

## 6. Giới hạn còn lại

- API dịch từng lần; bài viết rất dài vượt 20.000 ký tự cần rút gọn hoặc chia
  nhỏ (UI báo trước khi gửi).
- Không có glossary/tone tùy chỉnh, không dịch EN → VI, không tự đánh dấu
  `_enReviewed`.
- Tên/thẻ vùng miền trong form Trang chủ vẫn sửa bản EN ở tab Danh mục.
- Chất lượng bản dịch máy cần người duyệt trước khi bật index EN; nút dịch
  không thay đổi trạng thái duyệt.

## 7. Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npm run test:cms
npm run build
npm run verify:preflight -- --full
```

`tests/translation.test.ts` phủ allowlist/mapping, cấu trúc block, masking
brand/URL/giá, snapshot race, preview, giới hạn request, auth/rate/error/timeout
với adapter giả (không gọi Google). `tests/cms.test.ts` phủ lưu và mở lại
`_en`/EN settings.
