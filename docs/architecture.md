# Kiến trúc SEA TRIP TRAVEL

Tài liệu này giải thích **cách source được tổ chức và vì sao**. Kèm theo là quy
tắc phụ thuộc để việc mở rộng sau này (admin/CMS) không phải viết lại UI.

## 1. Stack và lý do chọn

| Thành phần | Lựa chọn | Lý do |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | SSG cho toàn bộ trang nội dung + Route Handler cho endpoint nhận lead, trong **một** ứng dụng. Không cần dựng backend riêng cho MVP. |
| Ngôn ngữ | TypeScript strict | Hợp đồng dữ liệu rõ ràng, refactor an toàn. |
| Styling | Tailwind CSS v4 | Token hoá bằng CSS variables, không cần file config thứ hai. |
| Validation | Zod 4 | Một schema dùng chung cho **cả** client và server. |
| Email | Interface `Mailer` + adapter SMTP | UI không phụ thuộc SDK email. Đổi nhà cung cấp = thêm một adapter. |
| Cache | Cache Components (mặc định của `create-next-app` 16) | Trang nội dung là static shell; chỉ phần phụ thuộc request mới stream. |

**Không dùng ở MVP:** NestJS, database, queue, CMS, auth. Không có lý do thực tế
nào ở giai đoạn này; xem `docs/admin-roadmap.md`.

## 2. Cây thư mục

```text
src/
├── app/                          # Route + page composition (mỏng)
│   ├── layout.tsx                # Shell: font, header, footer, JSON-LD toàn site
│   ├── page.tsx                  # Trang chủ
│   ├── globals.css               # Design tokens + utilities
│   ├── not-found.tsx / error.tsx # 404 và error boundary
│   ├── sitemap.ts / robots.ts    # SEO
│   ├── icon.png / apple-icon.png / opengraph-image.png
│   ├── api/leads/route.ts        # POST — tiếp nhận yêu cầu tư vấn
│   ├── tour/[slug]/              # Chi tiết tour (dynamic, static params)
│   ├── tour-quy-nhon-phu-yen/    # Danh mục (parent + 2 child)
│   ├── tour-trong-nuoc/          # Danh mục (parent + 4 child)
│   ├── cam-nang-du-lich/         # Danh sách + chi tiết bài viết
│   ├── lien-he/                  # Liên hệ
│   └── chinh-sach-bao-mat/       # Chính sách xử lý thông tin
│
├── components/                   # UI không biết gì về domain
│   ├── ui/                       # Primitives: button, form, badge, layout,
│   │                             # asset-image, reveal, icons
│   ├── layout/                   # Header, desktop/mobile nav, footer, breadcrumbs
│   └── seo/                      # JsonLd renderer
│
├── features/                     # UI biết về domain
│   ├── home/                     # Các section của trang chủ
│   ├── tours/                    # Card, grid, explorer, gallery, itinerary, view
│   ├── guides/                   # Article card + block renderer
│   ├── destinations/             # Destination card
│   └── leads/                    # LeadForm + ConsultSection
│
├── content/                      # Nội dung (hiện là file TS)
│   ├── index.ts                  # Ép kiểu + kiểm tra toàn vẹn quan hệ
│   ├── destinations.ts / categories.ts / articles.ts
│   └── tours/                    # Chia theo vùng
│
├── domain/                       # Kiểu + schema (nguồn sự thật duy nhất)
│   ├── common.ts                 # Money, Duration, ImageAsset, Region…
│   ├── tour.ts / category.ts / destination.ts / article.ts
│   └── lead.ts                   # Hợp đồng form + mã lỗi API
│
├── server/                       # Chỉ chạy trên server
│   ├── email/                    # Mailer interface + adapter + template
│   └── leads/                    # Service điều phối + rate limit
│
├── lib/
│   ├── data/                     # Repository — nơi DUY NHẤT đọc `content/`
│   ├── date.ts                   # Số học lịch (thuần, có test) — không có React
│   ├── format.ts                 # Format tiền, ngày, thời lượng
│   ├── sanitize.ts               # Escape HTML + kiểm tra href
│   ├── seo.ts                    # buildMetadata + absoluteUrl
│   ├── json-ld.ts                # Structured data builders
│   └── utils.ts                  # cn()
│
└── config/
    ├── site.ts                   # Nhận diện + liên hệ + cờ demo
    └── navigation.ts             # Menu bắt buộc + ROUTES
```

## 3. Quy tắc phụ thuộc

Mũi tên nghĩa là "được phép import". Chiều ngược lại bị cấm.

```text
app  ──►  features  ──►  components/ui
 │           │
 │           └──►  lib/data  ──►  content  ──►  domain
 │                                              ▲
 ├──►  lib/*  ───────────────────────────────────┘
 │
 ├──►  config  ──────────────────────────────────┘
 │
 └──►  server/*  ──►  domain, config, lib/data
```

Bất biến quan trọng:

1. **Chỉ `lib/data` đọc `content/`.** UI không bao giờ import thẳng file nội
   dung. Đổi nguồn sang API/CMS nghĩa là viết lại `lib/data`, không sửa UI.
2. **`components/ui` không biết domain.** Nó không import `domain/` hay
   `features/`. Nhờ vậy primitive dùng lại được ở bất kỳ màn hình nào.
3. **UI không import `server/`.** `server/email/mailer.ts` có
   `import "server-only"` để điều này fail ngay ở build nếu vi phạm.
4. **`domain/` không import gì ngoài `zod`.** Kiểu và schema là gốc của cây.

## 4. Luồng dữ liệu

```text
content/*.ts
   │  (Zod parse + kiểm tra khoá ngoại — fail ở build nếu sai)
   ▼
content/index.ts
   │
   ▼
lib/data/*.ts          Repository: getTours(), getTourBySlug(), …
   │
   ├──► Server Component  →  render HTML tĩnh
   │
   └──► toTourCard()      Projection nhỏ, serialisable
            │
            ▼
        Client Component (TourExplorer) — nhận dữ liệu qua props
```

`toTourCard()` là ranh giới quan trọng: nó biến một `Tour` đầy đủ thành
`TourCardModel` gọn nhẹ. Nhờ vậy trang danh mục có thể giao dữ liệu cho Client
Component để lọc mà **không** đẩy toàn bộ nội dung sang bundle trình duyệt.

### Vì sao nội dung là file TypeScript, không phải JSON/MDX?

- **Có kiểu.** `TourInput` bắt lỗi thiếu trường ngay khi gõ.
- **Có kiểm tra runtime.** `content/index.ts` gọi `z.array(tourSchema).parse(...)`
  và `assertIntegrity()` — trỏ sai danh mục, trùng slug, hay thiếu trường đều
  làm **build đỏ**, không lọt ra production.
- **Không cần pipeline.** Không có bước build MDX, không phụ thuộc thư viện
  markdown, câu chữ nằm ngoài JSX.
- **Đổi nguồn dễ.** Chỉ `lib/data` biết dữ liệu đến từ đâu.

Nội dung bài viết dùng **block có cấu trúc** (`ArticleBlock`) thay vì HTML thô
hay MDX: render bằng `switch` trên discriminated union, không có
`dangerouslySetInnerHTML`, và một CMS sau này có thể trả về đúng cấu trúc đó qua
API.

## 5. Bảo mật ranh giới

| Ranh giới | Cơ chế |
| --- | --- |
| Secret không lọt vào client | `import "server-only"` ở mọi module dùng credential + chỉ đọc `process.env` không có tiền tố `NEXT_PUBLIC_`. |
| Người nhận email không do client chọn | `SALES_RECIPIENTS` đọc ở server; body request không có trường này. |
| Dữ liệu khách không chèn được HTML | Email template escape mọi giá trị; `href` chỉ được tạo từ số điện thoại/email đã validate. |
| URL trong email | Chỉ chấp nhận đường dẫn nội bộ `/...`; scheme lạ bị loại. |
| JSON-LD | Serialize có escape `<`, `>`, `&`, U+2028/2029. |

Chi tiết luồng lead: `docs/lead-flow.md`.

## 6. Phụ thuộc cần chú ý

- **Cache Components buộc xử lý giá trị không tất định.** `new Date()` khi
  prerender sẽ báo lỗi. Vì vậy: năm bản quyền được bọc trong `'use cache'`
  (`site-footer.tsx`), còn `sitemap.ts` lấy `lastModified` từ dữ liệu nội dung.
- **`runtime` export không dùng được** khi bật `cacheComponents`. Route Handler
  mặc định đã chạy trên Node runtime.
- **`dynamicParams` cũng không dùng được.** Slug không tồn tại sẽ render ở
  request time rồi rơi vào `notFound()`.
