# I18N_GUIDE — Vận hành song ngữ (vi / en)

Tài liệu ngắn cho người vận hành nội dung. Kiến trúc chi tiết nằm trong
`docs/architecture.md`; danh sách bản dịch cần duyệt nằm trong
`docs/I18N_CONTENT_REVIEW.md`.

## 1. Mô hình

- **Không dùng thư viện i18n ngoài.** Dự án đang bật **Cache Components**
  (`next.config.ts`), và `next-intl` hiện **chưa hỗ trợ** `cacheComponents`
  (upstream `amannn/next-intl#1493`). Vì vậy i18n được dựng trực tiếp trên
  `next/root-params` (Next 16.3+) và `proxy.ts` (Next 16 đổi tên `middleware`).
- `vi` là ngôn ngữ **nguồn/mặc định**; `en` là bản dịch.

### URL

| Ngôn ngữ | Trang chủ | Liên hệ | Chi tiết tour |
| --- | --- | --- | --- |
| Tiếng Việt (không prefix) | `/` | `/lien-he` | `/tour/quy-nhon-...` |
| English (`/en`) | `/en` | `/en/lien-he` | `/en/tour/quy-nhon-...` |

- URL tiếng Việt **giữ nguyên** như trước. `/vi/...` được chấp nhận để tránh vòng lặp rewrite; metadata canonical luôn trỏ về URL không prefix (`src/proxy.ts`).
- Slug nội dung **không dịch** (ví dụ `/en/tour/quy-nhon-ky-co-eo-gio-1-ngay`).
- Ngôn ngữ **không** tự đổi theo IP hay `Accept-Language`; chỉ đổi khi bấm VI/EN.

### Cây nguồn

```
src/
├── app/[locale]/…      Route theo ngôn ngữ (root layout đọc locale)
├── proxy.ts            Viết lại /… → /vi/…, chấp nhận /vi/… để tránh vòng lặp
├── i18n/               config, routing, messages, server (getLocale), params
├── messages/vi.json    Nguồn sự thật của chuỗi giao diện
├── messages/en.json    Bản dịch (được TS kiểm tra khớp key với vi.json)
└── content/locales/en/ Bản dịch nội dung, khoá theo id bản ghi
```

## 2. Thêm một chuỗi giao diện mới

1. Mở `src/messages/vi.json`, thêm key có ngữ nghĩa theo tính năng, ví dụ
   `tour.requestConsultation`. Không dùng câu tiếng Việt làm key. Dùng biến nội
   suy `{name}`; số ít/số nhiều dùng object `{ "one": …, "other": … }`.
2. Thêm **đúng key đó** vào `src/messages/en.json`. Nếu thiếu, `npm run typecheck`
   sẽ báo lỗi (`en` được kiểm tra khớp cấu trúc với `vi`).
3. Ở Server Component: `const { locale, m } = await getTranslations();` rồi dùng
   `m.<namespace>.<key>`. Nội suy bằng `format(template, vars)` hoặc
   `plural(value, count)` từ `@/i18n/messages`.
4. Ở Client Component: **không import catalog**. Truyền chuỗi cần dùng qua props
   từ server (xem `LeadForm`, `DatePicker`, `LocaleSwitcher` là ví dụ).

> Vì sao: catalog chỉ nằm trên server để không đẩy cả từ điển xuống bundle trình
> duyệt.

## 3. Thêm tour / bài viết / danh mục mới

1. Thêm bản ghi tiếng Việt vào `src/content/…` như bình thường (id, slug, dữ
   liệu chung).
2. Thêm bản dịch Anh vào `src/content/locales/en/tours.ts` (hoặc `articles.ts`,
   `categories.ts`, `destinations.ts`), **khoá theo `id`** của bản ghi, chỉ gồm
   các trường ngôn ngữ (title, summary, highlights, overview, itinerary,
   included/excluded, notes, tags, imageAlts, seo…).
3. Đặt `translationStatus`:
   - `"draft"` — bản nháp (mặc định; do agent/người viết, chưa duyệt).
   - `"reviewed"` — đã được chủ website duyệt.
4. Chạy `npm run typecheck` và `npm test`. Thiếu id bản dịch không làm build đỏ,
   nhưng bản ghi đó sẽ hiển thị theo fallback và bị `noindex`.

**Dữ liệu dùng chung (slug, id, danh mục, điểm đến, giá, tiền tệ, số ngày/đêm,
`src` ảnh) không bao giờ nằm trong file dịch** — chúng tồn tại duy nhất một chỗ.

## 3.1. Xem nhanh VI / EN ngay trong form (Studio)

Các form có bản dịch đều có nút chuyển **Tiếng Việt / English** để xem trước mà
không cần xuất bản:

- **Tour / Cẩm nang**: khối *Xem trước bản nháp* có nút VI/EN; trường nào chưa
  có bản EN sẽ tự rơi về tiếng Việt, và có ghi chú nhắc trường đang thiếu.
- **Điểm đến**: thẻ xem trước (Khám phá + thẻ tour) đổi ngôn ngữ theo nút
  VI/EN ngay trong mục ảnh.
- **Khách hàng & dấu ấn**: khối *Xem nhanh* đổi tiêu đề/khách hàng của video
  sang bản EN nếu đã nhập.
- **Hero**: mỗi tab ngôn ngữ có khối *Xem nhanh* hiển thị đúng badge, tiêu đề,
  mô tả, nhãn nút và chú thích slide của ngôn ngữ đó.

Bản xem nhanh chỉ đọc dữ liệu đang sửa trong form (kể cả phần chưa lưu) và không
gọi dịch vụ dịch bên ngoài. Bản EN vẫn phải nhập/sửa tay và bấm Lưu như bình
thường; chỉ đánh dấu `_enReviewed` khi bạn đã kiểm tra nội dung.

## 3.2. Theo dõi bản dịch trong Studio

Mục **Bản dịch tiếng Anh** (`/admin/translations`) gom tour, cẩm nang, danh mục và
điểm đến đang thiếu hoặc chưa đủ bản EN.

- Mỗi dòng hiển thị loại nội dung, tên tiếng Việt, trạng thái và nút mở đúng form
  để bổ sung bản dịch.
- Trạng thái được tính trực tiếp từ `data._en` của bản ghi, không lưu thêm cột:
  - **Chưa dịch**: chưa có trường EN nào.
  - **Dịch chưa đầy đủ**: đã có một phần, phần còn lại vẫn dùng tiếng Việt.
  - **Đã dịch**: mọi trường nội dung có trong bản VI đều có bản EN tương ứng.
- Ô trống, chuỗi chỉ có khoảng trắng và câu tiếng Việt còn sót lại trong `_en`
  đều tính là chưa dịch.
- Lọc theo loại/trạng thái và tìm theo tên tiếng Việt hoặc slug. Danh sách tự tải
  lại khi quay về tab, nên trạng thái đổi ngay sau khi lưu.
- Trang EN chỉ hết banner “Translation in progress” sau khi nội dung EN đủ **và**
  bản ghi đã được xuất bản. Quyền index vẫn theo `_enReviewed` như mục 4.

## 4. Bật index cho bản tiếng Anh

Một trang tiếng Anh **chỉ được index** khi bản dịch của bản ghi gốc có
`translationStatus: "reviewed"`.

- Draft/missing → trang vẫn xem được nhưng có **banner “Bản dịch chưa hoàn tất”**,
  `noindex`, và **không** xuất hiện trong `sitemap.xml`/`hreflang`.
- Sau khi đổi `"draft"` → `"reviewed"`, chạy lại build. Trang sẽ tự động:
  bỏ banner, bật hreflang `vi`/`en`/`x-default`, và được thêm vào sitemap.
- Trang chỉ có giao diện (Liên hệ) sẵn sàng index ở cả hai ngôn ngữ.
- Trang chính sách bảo mật: bản tiếng Anh **không index** cho tới khi chủ website
  duyệt nội dung pháp lý.

## 5. Kiểm tra nhanh

```bash
npm run typecheck   # gồm kiểm tra khớp key vi/en
npm test            # gồm tests/i18n.test.ts (routing, parity, overlay)
npm run build       # sinh /vi/... và /en/...
npm run verify:ui    # giao diện thật: tràn header, bàn phím, form → SMTP
```

## 6. Lưu ý kỹ thuật

- Locale là **root param** nên tự động nằm trong cache key của mọi `'use cache'`:
  cache tiếng Việt và tiếng Anh không bao giờ dùng lẫn.
- Ảnh hưởng đã biết: việc **rewrite** của `proxy.ts` kết hợp `cacheComponents`
  hoạt động bình thường khi chạy `next start` cục bộ; có báo cáo lỗi RSC
  content-type trên Vercel. Nếu gặp khi deploy, phương án dự phòng là chuyển sang
  cây `/en` tường minh (không dùng rewrite).

## 7. 404 và kiểm chứng (2026-10-14)

### 404 bản địa hoá

- `src/app/[locale]/not-found.tsx` là **Server Component đồng bộ** render **cả hai
  ngôn ngữ**; CSS `html[lang="en"] .nf-lang-vi { display:none }` (trong
  `globals.css`) hiện đúng bản.
- Vì sao không dùng cách khác:
  - `next/root-params` **không khả dụng** trong `not-found` → gọi sẽ throw và Next
    âm thầm rơi về 404 mặc định (tiếng Anh).
  - Dynamic API (`headers()`/`cookies()`) hoặc Client Component đẩy boundary vào
    streaming → **soft 404** (HTTP 200 + noindex).
- `src/app/[locale]/[...rest]/page.tsx` (catch-all → `notFound()`) đưa URL không
  khớp vào cây `[locale]` để dùng boundary này.
- Chuyển ngôn ngữ dùng `prefetch={false}` (link VI↔EN trỏ vào route rewrite, prefetch
  RSC sẽ 404).

### Giới hạn đã biết

- Slug **tour/bài viết sai vẫn trả HTTP 200** (soft 404) kèm `noindex`, do
  `cacheComponents` (PPR) và `dynamicParams` không tương thích với nó (build đỏ nếu
  thêm). Gọi `notFound()` trong `generateMetadata` cũng không ép được 404 cứng vì
  shell đã stream. Cần xử lý riêng nếu muốn 404 cứng.
- `/khong-ton-tai` (không khớp route) **là** 404 cứng.

### Kết quả kiểm chứng

- `typecheck` ✅ · `lint` ✅ · `test` ✅ 124/124 · `build` ✅ (93 trang).
- HTTP VI/EN: 200 đúng; `html lang` đúng; title dịch; EN draft `noindex` + banner.
- `hreflang`: VI indexable có `vi`/`en`/`x-default`; EN draft không có.
- Form VI/EN lỗi đúng ngôn ngữ (không gửi email thật); không hydration mismatch.
- Typography: H1/H2 = Fraunces (computed ở 360/390/768/1440), body/card/form =
  Be Vietnam Pro. Xem `docs/design-tokens.md` §4.
