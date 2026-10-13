# Checklist nghiệm thu

Mỗi mục ghi rõ **cách kiểm chứng**. Trạng thái dùng: ✅ đã kiểm, ⬜ chưa kiểm
(cần chủ website cung cấp dữ liệu — xem `docs/CONTENT-TODO.md`).

## 1. Menu và điều hướng

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 1.1 | Menu đúng cấu trúc, đúng thứ tự, đúng nhãn | `npm test` → test "uses the exact menu labels required by the brief" | ✅ |
| 1.2 | Mọi mục menu cấp 2 trỏ tới trang danh mục có thật | `npm test` → test "resolves every category path used in navigation" | ✅ |
| 1.3 | Dropdown desktop mở bằng Enter/Space, đóng bằng Escape, `ArrowDown` vào panel | Kiểm tay bằng Tab + Enter + Escape | ⬜ |
| 1.4 | Mobile có mở/đóng nhóm con, khép drawer khi chọn link | Kiểm tay ở 390px | ⬜ |
| 1.5 | Focus luôn nhìn thấy được | Tab qua toàn trang, mọi phần tử tương tác có vòng focus | ⬜ |

## 2. CTA và liên kết

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 2.1 | Không có CTA chết | `grep -r "href=\"#\"" src/` không có kết quả | ✅ |
| 2.2 | Không có nút "Đặt ngay" (hệ thống chỉ nhận yêu cầu tư vấn) | Rà soát nhãn nút | ✅ |
| 2.3 | Mỗi tour thuộc đúng danh mục và link đúng trang chi tiết | `npm test` → "includes child-category tours when listing a parent category" | ✅ |
| 2.4 | Hotline và email lấy từ `config/site.ts`, không hardcode trong component | Rà soát; tìm `tel:` trong `src/` | ✅ |
| 2.5 | Link trong email chỉ trỏ về đúng origin của site | `npm test` → "never emits a javascript: or off-site href" | ✅ |

## 3. Dữ liệu còn thiếu

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 3.1 | Giá chưa có hiển thị "Liên hệ tư vấn", **không bao giờ** `0 ₫` | `npm test` → "renders an unpublished price as 'Liên hệ tư vấn', never as 0 ₫" | ✅ |
| 3.2 | Ảnh chưa có thì hiện placeholder thương hiệu, không dùng ảnh stock | Mở trang, xem card/hero | ⬜ |
| 3.3 | Không có nhãn "demo" nào lộ ra giao diện | `grep -rn "Nội dung demo" src/` không có kết quả | ✅ |
| 3.4 | Không có đánh giá khách hàng, số lượng khách, chứng nhận hay đối tác giả | Tìm `review`, `rating`, `aggregateRating` trong `src/` | ✅ |
| 3.5 | Khối chính sách tự ẩn khi chưa có nội dung | `policies: []` ⇒ `TourPolicies` trả `null` | ✅ |
| 3.6 | Trang danh mục rỗng hiển thị trạng thái hợp lý | `TourExplorer` có empty state + "Xoá bộ lọc" | ✅ |

## 4. Form và xử lý lỗi

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 4.1 | Validate cả client và server bằng cùng một schema | `npm test` → nhóm `leadInputSchema` và `submitLead` | ✅ |
| 4.2 | Lỗi từng trường, có thông báo tiếng Việt | POST dữ liệu sai → 400 kèm `fieldErrors` | ✅ |
| 4.3 | Lỗi hệ thống không làm mất dữ liệu khách đã nhập | Input là controlled, không reset ở nhánh lỗi | ✅ |
| 4.4 | Chống gửi lặp | Nút `disabled` + `submittingRef` + `submissionId`; test idempotency | ✅ |
| 4.5 | Không báo "đã gửi email thành công" khi chưa gửi | 503 khi `MAIL_NOT_CONFIGURED`; giao diện nói "Đã tiếp nhận yêu cầu" | ✅ |
| 4.6 | Rate limit hoạt động | `npm test` → "rate limits a burst from the same client" | ✅ |
| 4.7 | Honeypot chặn bot mà không lộ luật | `npm test` → "silently drops a honeypot hit" | ✅ |
| 4.8 | Email không bắt buộc; thiếu email thì email nội bộ ghi rõ "vui lòng gọi điện" | `npm test` → "omits the reply action and says so when there is no email" | ✅ |
| 4.9 | Form dùng được bằng bàn phím, nhãn gắn với input, lỗi là live region | Kiểm tay | ⬜ |

## 5. Email nội bộ

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 5.1 | Email đến hộp thư thử nghiệm | Cấu hình SMTP + `SALES_RECIPIENTS` giả, gửi thử | ⬜ |
| 5.2 | Đọc tốt trên Gmail mobile và Outlook desktop | Gửi thử tới cả hai | ⬜ |
| 5.3 | Vẫn hiểu được khi ảnh bị chặn | `npm test` → "works with images blocked" + xem bằng chế độ chặn ảnh | ✅ |
| 5.4 | Không chèn được HTML từ nội dung khách | `npm test` → "escapes customer HTML so markup cannot be injected" | ✅ |
| 5.5 | Subject không chứa dữ liệu cá nhân | `npm test` → "keeps personal data out of the subject line" | ✅ |
| 5.6 | Có plain-text fallback | `npm test` → "produces a plain-text fallback carrying the same facts" | ✅ |
| 5.7 | Mã yêu cầu và thời gian theo giờ Việt Nam | `npm test` → "includes the request code and a Vietnam-time timestamp" | ✅ |

## 6. Bí mật và an toàn

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 6.1 | Không lộ key ra client | `server/*` đều có `import "server-only"`; build sẽ đỏ nếu bị import nhầm | ✅ |
| 6.2 | Người nhận email do server quyết định | Body request không có trường người nhận | ✅ |
| 6.3 | Không ghi dữ liệu cá nhân vào log | Rà soát `console.*` trong `src/server/` | ✅ |
| 6.4 | `.env*` không bị commit | `.gitignore` chứa `.env*` (trừ `.env.example`) | ✅ |
| 6.5 | JSON-LD không bị chèn qua nội dung | `components/seo/json-ld.tsx` escape `<`, `>`, `&`, U+2028/9 | ✅ |
| 6.6 | Không có `dangerouslySetInnerHTML` ngoài JSON-LD | `grep -rn "dangerouslySetInnerHTML" src/` | ✅ |

## 7. Responsive và accessibility

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 7.1 | Không tràn ngang ở 360px | DevTools ở 360×640, `document.body.scrollWidth <= 360` | ⬜ |
| 7.2 | Tương phản màu đạt WCAG AA | Bảng đo ở `docs/design-tokens.md` mục 2 | ✅ |
| 7.3 | `prefers-reduced-motion` tắt mọi animation | Bật trong DevTools, tải lại | ⬜ |
| 7.4 | Ảnh có `alt` mô tả; placeholder có `role="img"` + label | Rà soát `AssetImage` | ✅ |
| 7.5 | Heading theo thứ tự, mỗi trang một `h1` | Rà soát từng trang | ✅ |
| 7.6 | Có skip link tới nội dung chính | `SkipLink` là phần tử focus đầu tiên | ✅ |
| 7.7 | Nội dung không phụ thuộc JS để hiển thị | Animation chỉ là lớp tăng cường | ✅ |

## 8. SEO

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 8.1 | Mỗi trang có title + description + canonical riêng | Xem `<head>` từng trang | ✅ |
| 8.2 | `sitemap.xml` liệt kê đủ tour, danh mục, bài viết | `curl /sitemap.xml` | ✅ |
| 8.3 | `robots.txt` chặn `/api/` | `curl /robots.txt` | ✅ |
| 8.4 | Có Open Graph + Twitter card | Xem `<meta>` | ✅ |
| 8.5 | Structured data khớp nội dung thật | Xem JSON-LD; `offers` chỉ xuất hiện khi có giá thật | ✅ |
| 8.6 | Breadcrumb có JSON-LD `BreadcrumbList` | Xem JSON-LD trang chi tiết | ✅ |
| 8.7 | 404 trả về đúng HTTP 404 | `curl -I /khong-ton-tai` | ✅ |

## 9. Chất lượng mã

| # | Tiêu chí | Cách kiểm | Trạng thái |
| --- | --- | --- | --- |
| 9.1 | TypeScript không lỗi | `npm run typecheck` | ✅ |
| 9.2 | ESLint không lỗi/cảnh báo | `npm run lint` | ✅ |
| 9.3 | Toàn bộ test pass | `npm test` | ✅ |
| 9.4 | Build thành công, mọi trang tĩnh dựng được | `npm run build` | ✅ |
| 9.5 | Dữ liệu nội dung sai sẽ làm build đỏ | `npm test` → nhóm "content integrity" | ✅ |
| 9.6 | Không có abstraction rỗng | Rà soát `lib/` và `server/` | ✅ |

## 10. Hiệu năng

Chưa đo bằng công cụ — vì vậy **chưa** khẳng định đạt điểm Lighthouse hay
Core Web Vitals nào. Khi đo, dùng:

```bash
npm run build && npm start
npx lighthouse http://localhost:3000 --preset=desktop --view
npx lighthouse "http://localhost:3000/tour/quy-nhon-phu-yen-3-ngay-2-dem" --view
```

Mục tiêu đề ra để đối chiếu (không phải kết quả đã đo):

| Chỉ số | Mục tiêu |
| --- | --- |
| LCP | < 2.5s trên 4G |
| CLS | < 0.1 |
| INP | < 200ms |
| JS trên trang chủ | nhỏ (không có thư viện animation, không có icon library) |

Biện pháp đã áp dụng: hero ảnh `priority`, ảnh còn lại lazy mặc định của
`next/image`, font self-host + `display: swap`, reveal bằng CSS scroll-driven
(không JS), icon inline (không thư viện).

## 11. Trước khi xuất bản

- [ ] Toàn bộ mục nhóm 🔴 trong `docs/CONTENT-TODO.md` đã có thông tin thật.
- [ ] Đã chạy `npm run build` trên môi trường production với `.env` thật.
- [ ] `SALES_RECIPIENTS` trỏ tới hộp thư thật, đã gửi thử và nhận được.
- [ ] SPF/DKIM/DMARC đã cấu hình; kiểm tra bằng công cụ kiểm tra DNS.
- [ ] `MAIL_TRANSPORT=smtp` (không phải `log`).
- [ ] Đã rà soát: không còn nhãn "demo" nào lộ ra giao diện.
- [ ] Đã kiểm tra trang chính sách bảo mật khớp với thực tế xử lý dữ liệu.
