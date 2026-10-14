# Checklist nghiệm thu

Mỗi mục ghi rõ **cách kiểm chứng**. Trạng thái:

- ✅ đã kiểm và có bằng chứng chạy lại được
- ⬜ chưa kiểm (nêu rõ lý do)
- 🔴 cần chủ website cung cấp dữ liệu — xem `docs/CONTENT-TODO.md`

Bằng chứng chi tiết, kèm phân tích lỗi đã tìm và sửa: **`docs/verification.md`**.

```bash
npm run typecheck      # ✅ 0 lỗi
npm run lint           # ✅ 0 lỗi, 0 cảnh báo
npm test               # ✅ 110/110
npm run build          # ✅ 42 trang
npm run verify:ui      # ✅ 104/104 (Chrome thật)
npm run content:report # danh sách nội dung còn thiếu
```

---

## 1. Menu và điều hướng

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 1.1 | Menu đúng cấu trúc, đúng thứ tự, đúng nhãn | `npm test` → "uses the exact menu labels required by the brief" | ✅ |
| 1.2 | Mọi mục menu cấp 2 trỏ tới trang danh mục có thật | `npm test` → "resolves every category path used in navigation" | ✅ |
| 1.3 | Desktop: `ArrowDown` mở dropdown **và đưa focus vào panel**; `Enter` mở; `Escape` đóng và trả focus về trigger | `npm run verify:ui` mục 4 — 7/7 | ✅ |
| 1.4 | Mobile: nút menu mở drawer, accordion mở/đóng, `Escape` đóng | `npm run verify:ui` mục 5 — 7/7 | ✅ |
| 1.5 | Desktop nav ẩn ở 390px, hamburger hiện | `npm run verify:ui` mục 5 | ✅ |
| 1.6 | Nhãn menu **không xuống dòng** ở mọi bề rộng | `verify:ui` không phát hiện tràn ngang; ảnh `home-desktop.png` | ✅ |

## 2. CTA và liên kết

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 2.1 | Không có CTA chết | `grep -r 'href="#"' src/` không có kết quả | ✅ |
| 2.2 | Không có nút "Đặt ngay" | Rà soát nhãn nút | ✅ |
| 2.3 | Tour thuộc đúng danh mục, link đúng chi tiết | `npm test` → "includes child-category tours when listing a parent category" | ✅ |
| 2.4 | Hotline/email lấy từ config, không hardcode | Rà soát; `grep 'tel:' src/` | ✅ |
| 2.7 | Thông tin liên hệ thật đi tới mọi nơi khách thấy (header, footer, rail, form, chính sách, JSON-LD) | `verify:ui` mục 9 — 20/20 | ✅ |
| 2.8 | Không còn giá trị placeholder nào trên giao diện | `verify:ui` → "no placeholder contact value" (4 trang) | ✅ |
| 2.5 | Link trong email chỉ trỏ về đúng origin | `npm test` → "never emits a javascript: or off-site href" | ✅ |
| 2.6 | Form trên trang chi tiết tour tự điền đúng tên tour | `npm run verify:ui` mục 7 | ✅ |

## 3. Dữ liệu còn thiếu

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 3.1 | Giá chưa có hiển thị "Liên hệ tư vấn", **không bao giờ** `0 ₫` | `npm test` → "renders an unpublished price as 'Liên hệ tư vấn', never as 0 ₫" | ✅ |
| 3.2 | Ảnh chưa có thì hiện placeholder thương hiệu | Ảnh chụp `verify-screenshots/` | ✅ |
| 3.3 | Không có nhãn "demo" nào lộ ra giao diện | `grep -rn "Nội dung demo" src/` | ✅ |
| 3.4 | Không có đánh giá/chứng nhận/đối tác giả | `grep -rE "aggregateRating\|review\|partner" src/` | ✅ |
| 3.5 | Khối chính sách tự ẩn khi chưa có nội dung | `TourPolicies` trả `null` khi mảng rỗng | ✅ |
| 3.6 | Danh mục rỗng có trạng thái hợp lý + xoá lọc | `TourExplorer` empty state | ✅ |
| 3.7 | Danh sách nội dung còn thiếu, có tên cụ thể | `npm run content:report` | ✅ |
| 3.8 | Duyệt nội dung 15 tour + 5 bài | Chủ website | 🔴 |

## 4. Form và xử lý lỗi

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 4.1 | Validate client và server dùng cùng schema | `npm test` → nhóm `leadInputSchema`, `submitLead` | ✅ |
| 4.2 | Lỗi từng trường, tiếng Việt | `npm test`; `verify:ui` mục 7 "shows a field error" | ✅ |
| 4.3 | Lỗi hệ thống không làm mất dữ liệu | Controlled inputs, không reset ở nhánh lỗi | ✅ |
| 4.4 | Chống gửi lặp | `npm test` → "returns the original result for a repeated submission id" | ✅ |
| 4.5 | Không báo "đã gửi email thành công" | `verify:ui` → "success copy does not claim the email was delivered" | ✅ |
| 4.6 | Rate limit hoạt động | `npm test` → "rate limits a burst from the same client" | ✅ |
| 4.7 | Honeypot chặn bot không lộ luật | `npm test` → "silently drops a honeypot hit" | ✅ |
| 4.8 | Không bắt buộc email | `npm test` → "omits the reply action and says so when there is no email" | ✅ |
| 4.9 | Thao tác được hoàn toàn bằng bàn phím, không lỗi runtime | `verify:ui` mục 6 + 7; "no uncaught page errors during the flow" | ✅ |
| 4.10 | Ô ngày dùng bàn phím được | `verify:ui` mục 6 — 11/11 | ✅ |
| 4.11 | Không lệch ngày qua múi giờ / DST | `npm test` → nhóm `date` (25 test) | ✅ |

## 5. Email nội bộ

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 5.1 | Có cuộc hội thoại SMTP thật, thư đến nơi, đúng nội dung | `npm test` → `tests/mail-transport.test.ts` | ✅ |
| 5.2 | Nhà cung cấp từ chối → 502, không có thư nào gửi | `npm test` → "reports MAIL_DELIVERY_FAILED when the provider rejects authentication" | ✅ |
| 5.3 | Host không kết nối được → 502 | `npm test` → "when the host is unreachable" | ✅ |
| 5.4 | Production thiếu cấu hình → 503, không báo thành công giả | `npm test` → nhóm "transport configuration" | ✅ |
| 5.5 | Gửi từ trình duyệt thật → đúng 1 thư | `verify:ui` → "exactly one email arrived at the SMTP server" | ✅ |
| 5.6 | Subject mã hoá tiếng Việt đúng (RFC 2047) | `npm test` → decode subject rồi assert | ✅ |
| 5.7 | Vẫn hiểu được khi ảnh bị chặn | `npm test` → "works with images blocked" | ✅ |
| 5.8 | Không chèn được HTML từ nội dung khách | `npm test` → "escapes customer HTML so markup cannot be injected" | ✅ |
| 5.9 | Subject không chứa dữ liệu cá nhân | `npm test` → "keeps personal data out of the subject line" | ✅ |
| 5.10 | Có plain-text fallback | `npm test` → "produces a plain-text fallback" | ✅ |
| 5.11 | **Thư vào hộp thư Gmail/Outlook thật** | Cần domain thật + SPF/DKIM/DMARC | 🔴 |

## 6. Bí mật và an toàn

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 6.1 | Không lộ key ra client | `import "server-only"` ở mọi module dùng credential | ✅ |
| 6.2 | Người nhận email do server quyết định | `npm test` → `RCPT TO` từ `SALES_RECIPIENTS` | ✅ |
| 6.3 | Không ghi dữ liệu cá nhân vào log | Rà soát `console.*` trong `src/server/` | ✅ |
| 6.4 | `.env*` không bị commit | `.gitignore` (có `!.env.example`) | ✅ |
| 6.5 | JSON-LD không bị chèn qua nội dung | `components/seo/json-ld.tsx` escape `<`, `>`, `&`, U+2028/9 | ✅ |
| 6.6 | Không có `dangerouslySetInnerHTML` ngoài JSON-LD | `grep -rn dangerousSetInnerHTML src/` | ✅ |
| 6.7 | Rate limit/idempotency không im lặng khi chỉ chạy trong bộ nhớ | Cảnh báo trong log khi production + store=memory | ✅ |
| 6.8 | Có store dùng chung cho nhiều instance | `npm test` → nhóm "rest store (Redis over HTTP)" | ✅ |

## 7. Responsive và accessibility

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 7.1 | Không tràn ngang ở 360 / 390 / 768 / 1280 | `npm run verify:ui` mục 1 — 32/32 | ✅ |
| 7.2 | Tương phản màu đạt WCAG AA | Bảng đo ở `docs/design-tokens.md` mục 2 | ✅ |
| 7.3 | `prefers-reduced-motion` → mọi nội dung vẫn hiện | `verify:ui` mục 2 — 6/6 | ✅ |
| 7.4 | Nội dung **dưới màn hình** vẫn hiện khi chưa cuộn | `verify:ui` → "content below the fold is visible without scrolling" | ✅ |
| 7.5 | Animation cuộn được gate bằng `@supports` + `@media` | `verify:ui` mục 3 — đọc CSSOM thật | ✅ |
| 7.6 | In ra giấy không mất nội dung | `@media print` reset trong `globals.css` | ✅ (theo code) |
| 7.7 | Ảnh có `alt`; placeholder có `role="img"` | Rà soát `AssetImage` | ✅ |
| 7.8 | Mỗi trang một `h1`, heading theo thứ tự | Rà soát từng trang | ✅ |
| 7.9 | Có skip link | `SkipLink` là phần tử focus đầu tiên | ✅ |
| 7.10 | Trình đọc màn hình thật (NVDA/VoiceOver) | Chưa chạy | ⬜ |
| 7.11 | Safari / Firefox thật | `verify:ui` chạy Chrome; chưa đo trên máy thật | ⬜ |

## 8. SEO

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 8.1 | Mỗi trang có title/description/canonical riêng | Xem `<head>` | ✅ |
| 8.2 | `sitemap.xml` đủ tour, danh mục, bài viết | `curl /sitemap.xml` | ✅ |
| 8.3 | `robots.txt` chặn `/api/` | `curl /robots.txt` | ✅ |
| 8.4 | Open Graph + Twitter card | Xem `<meta>` | ✅ |
| 8.5 | Structured data khớp nội dung thật; `offers` chỉ khi có giá thật | Xem JSON-LD | ✅ |
| 8.6 | Breadcrumb có JSON-LD | Xem JSON-LD trang chi tiết | ✅ |
| 8.7 | 404 trả về đúng HTTP 404 | `curl -I /khong-ton-tai` | ✅ |

## 9. Chất lượng mã

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 9.1 | TypeScript không lỗi | `npm run typecheck` | ✅ |
| 9.2 | ESLint không lỗi/cảnh báo | `npm run lint` | ✅ |
| 9.3 | Toàn bộ test pass | `npm test` → 110/110 | ✅ |
| 9.4 | Build thành công, mọi trang dựng được | `npm run build` → 42/42 | ✅ |
| 9.5 | Dữ liệu nội dung sai làm build đỏ | `npm test` → nhóm "content integrity" | ✅ |
| 9.6 | Không có abstraction rỗng | Rà soát `lib/`, `server/` | ✅ |

## 10. Hiệu năng

**Chưa đo** — vì vậy **không** khẳng định đạt điểm Lighthouse hay Core Web
Vitals nào.

```bash
npm run build && npm start
npx lighthouse http://localhost:3000 --preset=desktop --view
npx lighthouse "http://localhost:3000/tour/quy-nhon-phu-yen-3-ngay-2-dem" --view
```

Mục tiêu để đối chiếu (không phải kết quả đã đo): LCP < 2.5s · CLS < 0.1 ·
INP < 200ms.

Đã áp dụng: hero `priority` + `sizes`, ảnh còn lại lazy mặc định của
`next/image`, font self-host `display: swap`, **không** thư viện animation,
**không** thư viện icon, reveal và parallax bằng CSS scroll-driven (0 JS), 41
trang nội dung là HTML tĩnh.

---

## 11. Trước khi xuất bản

- [ ] Toàn bộ mục 🔴 trong `docs/CONTENT-TODO.md` đã có thông tin thật
- [ ] `npm run build` trên production với `.env` thật
- [ ] `SALES_RECIPIENTS` trỏ hộp thư thật, đã gửi thử và **nhận được** (5.11)
- [ ] SPF/DKIM/DMARC đã cấu hình và kiểm bằng công cụ DNS
- [ ] `MAIL_TRANSPORT=smtp` (không phải `log`)
- [ ] `LEAD_RATE_LIMIT_STORE=rest` + URL/token nếu deploy serverless (6.8)
- [ ] Đã chạy `npm run content:report` và xử lý hết mục "WHAT IS MISSING"
- [ ] Đã chạy `npm run verify:ui` trên bản build cuối cùng
- [ ] Trang chính sách bảo mật khớp thực tế xử lý dữ liệu
