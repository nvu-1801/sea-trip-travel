# Báo cáo kiểm chứng

Tài liệu này trả lời từng điểm còn nghi ngờ, kèm **bằng chứng chạy được** và
**những gì vẫn chưa được chứng minh**. Mọi lệnh dưới đây đều tái tạo được.

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm test              # 110 test
npm run build         # next build
npm run verify:ui     # trình duyệt thật, 104 kiểm tra
npm run content:report
```

---

## 1. "16 tour nhưng chỉ 15 trang chi tiết"

**Không thiếu route.** Có **15 bản ghi tour**, 15 slug duy nhất, 15 trang chi tiết.

```
$ npm run content:report
  tours : 15 (15 still marked demo)

$ node --import tsx -e "…"
  tour records        : 15
  unique tour slugs   : 15
```

Con số 16 đến từ **báo cáo build của Next.js**, không phải số trang:

```
└   /tour/[slug]                        1d  1w   ← route
  ├ ◐ /tour/[slug]                      1d  1w   ← "App Shell" cho slug KHÔNG tồn tại
  ├ ○ /tour/quy-nhon-ky-co-eo-gio-1-ngay 1d 1w   ← trang tĩnh thật
  ├ ○ /tour/quy-nhon-hon-kho-lan-bien-1-ngay
  └ ◐ [+13 more paths]                            ← 2 + 13 = 15 trang
```

2 trang in ra + 13 trang gộp = **15**. Cộng thêm dòng `◐ /tour/[slug]` (bản dựng
sẵn cho slug lạ) thành 16 dòng. Đây là hành vi chuẩn của Next khi bật Cache
Components: `generateStaticParams` sinh 15 trang tĩnh, và framework luôn in thêm
một dòng đại diện cho các giá trị param chưa biết.

Slug lạ trả **404 thật** (đã kiểm: `/khong-ton-tai` → HTTP 404).

---

## 2. Email gửi thật

### Đã chứng minh

`tests/mail-transport.test.ts` dựng một **SMTP server thật** trên loopback, trỏ
ứng dụng vào đó, rồi **đọc chính cuộc hội thoại SMTP** mà nó nhận được.

```
$ node --import tsx --conditions=react-server --test tests/mail-transport.test.ts
✓ completes a real SMTP exchange and sends the expected message
✓ reports MAIL_DELIVERY_FAILED when the provider rejects authentication
✓ reports MAIL_DELIVERY_FAILED when the host is unreachable
✓ refuses to report success in production when SMTP is not configured
✓ refuses to report success in production when MAIL_TRANSPORT is left as 'log'
✓ succeeds with the log transport outside production (developer flow)
```

Những gì được khẳng định trên thư đến thật:

| Kiểm tra | Ý nghĩa |
| --- | --- |
| `MAIL FROM` chứa `no-reply@example.com` | Địa chỉ gửi thuộc domain của mình, **không** dùng email khách |
| `RCPT TO` có **đúng 2** người nhận | Lấy từ `SALES_RECIPIENTS`; body request không quyết định được |
| `Reply-To: khach@example.com` | Trả lời sẽ tới thẳng khách |
| Subject mã hoá RFC 2047 | Tiếng Việt được encode đúng, không bị vỡ dấu |
| Subject **không** chứa tên/SĐT/email | Hộp thư có thể bị chia sẻ hoặc hiện trên màn hình khoá |
| Có cả `text/plain` và `text/html` | Bản plain-text fallback tồn tại thật |
| Giải mã quoted-printable rồi mới assert | Kiểm tra nội dung sau khi decode, như mail client thật |

Và **trình duyệt thật** cũng đã đi hết luồng (`npm run verify:ui`, mục 7):

```
✓ tour detail form is pre-filled with the tour title — Quy Nhơn – Phú Yên 4 ngày 3 đêm
✓ submitting empty shows a field error and stays on the form
✓ success panel carries a request code — … STT-20261013-30A6
✓ success copy does not claim the email was delivered
✓ exactly one email arrived at the SMTP server — received=1
✓ email went to the configured sales recipient
✓ email has both HTML and plain-text parts
✓ email replies to the customer
✓ no uncaught page errors during the flow
```

### Đường lỗi

| Tình huống | Kết quả đã kiểm |
| --- | --- |
| Nhà cung cấp từ chối xác thực (535) | HTTP **502** `MAIL_DELIVERY_FAILED`, **0 email** được gửi |
| Host không kết nối được | HTTP **502** `MAIL_DELIVERY_FAILED` |
| Production + chưa cấu hình SMTP | HTTP **503** `MAIL_NOT_CONFIGURED` |
| Production + `MAIL_TRANSPORT=log` | HTTP **503** `MAIL_NOT_CONFIGURED` — **không** báo thành công giả |

### CHƯA chứng minh

Việc email **vào được hộp thư Gmail/Outlook** phụ thuộc vào:
- SPF / DKIM / DMARC của domain thật,
- uy tín domain (domain mới thường bị lọc),
- chính sách của người nhận.

Những thứ này **chỉ kiểm được với domain thật và hộp thư thật**. Không có cách
nào chứng minh bằng code trong repo. Đây là việc của chủ website, ghi ở
`docs/CONTENT-TODO.md` mục **A5**, và nằm trong checklist trước khi xuất bản.

---

## 3. Rate limit và idempotency

**Đúng như lo ngại: bộ nhớ trong tiến trình không đủ cho serverless.** Đã xử lý
theo hai hướng.

### a. Không còn im lặng

Nếu chạy production mà vẫn dùng store trong bộ nhớ, ứng dụng **ghi cảnh báo rõ**:

```
[lead-store] Using the IN-MEMORY store. Rate limiting and idempotency are
per-instance and will NOT hold across serverless invocations or multiple
instances. Set LEAD_RATE_LIMIT_STORE=rest with LEAD_RATE_LIMIT_URL/TOKEN for a
shared store.
```

### b. Có sẵn store dùng chung, chỉ cần đổi cấu hình

`src/server/leads/store.ts` định nghĩa một interface `LeadStore` với hai
implementation:

| Store | Dùng khi | Hành vi |
| --- | --- | --- |
| `memory` | Một instance (VPS, `next dev`) | Map trong tiến trình, có dọn key hết hạn |
| `rest` | Serverless / nhiều instance | Redis qua HTTP (Upstash, Vercel KV…) |

Cả rate limit **và** idempotency đều đi qua store này.

```
LEAD_RATE_LIMIT_STORE=rest
LEAD_RATE_LIMIT_URL=https://<db>.upstash.io
LEAD_RATE_LIMIT_TOKEN=<token>
```

Lệnh Redis được assert trong test (không cần Redis thật, dùng fetch stub):

```
✓ increments via a single pipeline (INCR + PEXPIRE NX + PTTL)
✓ falls back to the window length when PTTL is not usable
✓ returns null (so the caller can fail open) on a transport error
✓ returns null on a non-2xx response
✓ returns null when Redis reports a command-level error
✓ uses SET … PX … NX for idempotency and reports whether it created the key
✓ reads idempotency values with GET
```

`PEXPIRE … NX` chỉ đặt TTL ở lần ghi đầu → cửa sổ **cố định**, không trôi theo
mỗi request.

### c. Quyết định khi store chết: **fail-open**

Store lỗi ⇒ **cho request đi qua** và ghi log. Lý do: mất một lead thật tệ hơn
để một đợt spam lọt qua **một** lớp, khi các lớp khác (honeypot, giới hạn kích
thước payload, validate schema) vẫn còn. Nếu fail-closed, một sự cố Redis sẽ
biến thành "form liên hệ hỏng".

```
✓ fails open when the store is unavailable, and says so
```

### d. Khoảng trống còn lại, nói thẳng

Hai request **cùng key đến đúng lúc** có thể cùng vượt qua bước kiểm tra trước
khi request nào ghi. Cửa sổ này được chặn ở phía client (nút bị `disabled` + cờ
`submittingRef`) và bởi rate limit. Muốn đóng hẳn cần giao thức claim-then-send
kèm lệnh xoá bù — nhiều máy móc hơn mức form này cần. Ghi rõ trong
`src/server/leads/service.ts`.

---

## 4. "Toàn bộ nội dung static"

**Cách nói trong báo cáo trước chưa chính xác.** Bảng route thật:

| Loại | Số lượng | Ghi chú |
| --- | --- | --- |
| `○` Static | 41 | Toàn bộ trang nội dung: chủ, danh mục, chi tiết tour, cẩm nang, liên hệ, chính sách, 404, icon, sitemap, robots |
| `ƒ` Dynamic | **1** | `POST /api/leads` — chạy phía server mỗi lần gửi form |
| `◐` App Shell | 2 | Bản dựng sẵn cho slug tour/bài viết chưa biết |

Nói đúng: **41 trang nội dung là HTML tĩnh**, **1 endpoint là server-side**, và
hai route động có app-shell. Endpoint không thể là tĩnh vì nó gửi email và đọc
secret — và đó cũng chính là lý do **không dùng static hosting thuần**.

---

## 5. Animation và mobile

Đây là phần **chỉ trình duyệt thật mới trả lời được**. Đã dựng
`scripts/verify-ui.mjs`: chạy `next start` ở chế độ production, mở Chrome thật
(dùng Chrome có sẵn trên máy, không tải browser), và kiểm 82 điểm.

```
$ npm run verify:ui
UI verification: 104/104 checks passed
```

### 5.1 Tràn ngang — 8 trang × 4 kích thước

```
✓ 360px /  ✓ 360px /tour-trong-nuoc/tour-mien-bac  … (32 kiểm tra)
```

Lần chạy đầu **đã tìm ra 3 lỗi thật**, không phải cấu hình sai:

| Lỗi | Nguyên nhân | Đã sửa |
| --- | --- | --- |
| Tràn 9px ở 360px | Vòng `scale(1.65)` của nút liên hệ nổi tạo overflow cuộn được (transform **có** tính vào scrollable overflow) | Đổi sang `box-shadow` spread trên `::after` — không ảnh hưởng layout |
| Tràn 29px | `grid gap-12 lg:grid-cols-12` **không khai báo cột cơ sở**; ở mobile track `auto` bị đẩy rộng theo max-content | Thêm `grid-cols-1` cho **24 grid** → track `minmax(0,1fr)` |
| Tràn 16px | Nút `whitespace-nowrap` có `min-content` lớn, nằm trong grid item thì đẩy cả layout | Bỏ nowrap ở mobile (`sm:whitespace-nowrap`), dùng `min-h` thay `h` để nhãn xuống dòng không bị cắt |

### 5.2 Nội dung vẫn hiện khi không có animation

Hai tầng bằng chứng:

```
✓ scroll-animation rules were found — 3 animated rule(s)
✓ every scroll-animation rule is inside @supports (animation-timeline: view())
✓ every scroll-animation rule is inside @media (prefers-reduced-motion: no-preference)
✓ no rule sets opacity:0 on a scroll-animated element outside a motion query
```

Kiểm tra này đọc **CSSOM thật** và ghi lại ngữ cảnh `@supports` / `@media` của
từng rule, nên nó chứng minh cấu trúc chứ không chỉ đọc file.

Và kiểm tra runtime với `prefers-reduced-motion: reduce`:

```
✓ reduced-motion / — all content visible — 26 reveal + 2 parallax
✓ reduced-motion /tour/… — all content visible
```

### 5.3 Bài học từ ảnh chụp màn hình

Ảnh full-page **đầu tiên cho thấy các section bị trắng**. Nguyên nhân: reveal
theo cuộn dùng `opacity: 0` + `fill-mode: both`, nên mọi thứ dưới màn hình giữ
trạng thái `from` cho tới khi được cuộn tới. Điều đó đúng khi đang cuộn và **sai
ở mọi trường hợp khác**: ảnh full-page, in PDF (khách in lịch trình), và bất kỳ
lúc nào trang bị chụp mà không cuộn.

Đã sửa: `[data-reveal]` **chỉ animate transform**, không animate opacity.
`[data-entrance]` (hero, trên màn hình đầu) vẫn fade vì nó luôn hiện khi tải.
Thêm khối `@media print` xoá mọi animation/transform.

Và thêm một kiểm tra để không tái diễn:

```
✓ content below the fold is visible without scrolling (no opacity:0 hold)
    — 27 below-fold animated element(s), 0 invisible
```

### 5.4 Bàn phím

```
✓ ArrowDown sets aria-expanded=true
✓ panel is visible after ArrowDown
✓ focus moved into the panel
✓ Escape sets aria-expanded=false
✓ Escape returns focus to the trigger
✓ Enter opens the panel
✓ hamburger is visible at 390px / desktop nav hidden at 390px
✓ drawer opens / is modal / background inert / accordion expands / Escape closes
✓ six full weeks are rendered (stable height)
✓ trigger now shows a dd/mm/yyyy value — Chọn ngày -> 16/10/2026
✓ Escape does not change the committed value
```

Hai lỗi bàn phím cũng do kiểm tra này tìm ra:
- `ArrowDown` mở panel nhưng **không đưa focus vào trong** → panel `invisible`
  một frame nên `focus()` bị bỏ qua. Sửa bằng cách focus trong `useEffect` có
  retry qua vài frame.
- Bấm chuột vào ô ngày rồi bấm mũi tên **không có tác dụng** → focus còn ở nút
  trigger, ngoài popup. Sửa bằng cách luôn đưa focus vào lưới ngày khi mở.

### 5.5 Thông tin liên hệ thật (mục 9)

Sau khi chủ website cung cấp hotline, email, địa chỉ và Facebook, một nhóm kiểm
tra riêng xác nhận các giá trị đó đã đi tới **mọi nơi khách nhìn thấy** — và
không còn giá trị placeholder nào sót lại:

`
✓ contact page shows the hotline / links the dialable hotline
✓ contact page shows the email / links the mailto / shows the address
✓ header hotline link is visible at 1280px / shows the number
✓ floating rail links Facebook to the real page
✓ floating rail links the dialable hotline
✓ floating rail Zalo resolves to a usable link — https://zalo.me/0969297064
✓ privacy page shows the email / shows the address
✓ JSON-LD telephone / email / address has real parts / addressCountry is VN
✓ JSON-LD sameAs contains the Facebook page
✓ / , /lien-he , /chinh-sach-bao-mat , /tour/… — no placeholder contact value
`

Kiểm tra này cũng tìm ra một lỗi thật khác: ria-controls=\

`npm run verify:ui` ghi `verify-screenshots/`: home desktop + mobile, tour desktop
+ mobile, contact mobile.

---

## 6. Dữ liệu minh họa

Đúng: **placeholder đẹp không thay thế việc duyệt nội dung.** Công cụ để xử lý:

```
$ npm run content:report
SUMMARY
  tours              : 15 (15 still marked demo)
  tours without price: 15 — the UI shows "Liên hệ tư vấn", which is correct
  tours without real images: 15 — branded placeholders are shown
  tours without policy text: 15 — the policy block is hidden
  articles           : 5 (5 still marked demo)

WHAT IS MISSING, PER TOUR
  quy-nhon-ky-co-eo-gio-1-ngay
      - contentStatus=demo
      - no price (shows 'Liên hệ tư vấn')
      - images are placeholders
      - no published policy text
```

Báo cáo này là danh sách việc có tên cụ thể, không phải một đoạn văn.

Cơ chế bảo vệ nội dung chưa duyệt:
- `contentStatus: "demo"` là metadata theo dõi, **không render** ra giao diện.
- Giá `null` ⇒ hiển thị "Liên hệ tư vấn"; có test chặn giá ≤ 0.
- Ảnh thiếu `src` ⇒ placeholder gradient thương hiệu, không dùng ảnh stock.
- Khối chính sách tự ẩn khi rỗng.
- Nhập sai khoá ngoại / trùng slug ⇒ **build đỏ**.

---

## Còn lại gì chưa kiểm

| Việc | Vì sao chưa kiểm được |
| --- | --- |
| Email vào hộp thư Gmail/Outlook thật | Cần domain thật + SPF/DKIM/DMARC. Mục A5 |
| Điểm Lighthouse / Core Web Vitals | Chưa chạy `lighthouse`. Mục tiêu và cách đo ở `docs/acceptance-checklist.md` mục 10 |
| Hành vi trên Safari/Firefox | `verify:ui` chạy Chrome. `animation-timeline` có `@supports` nên trình duyệt khác chỉ mất hiệu ứng, không mất nội dung; nhưng **chưa đo trên máy thật** |
| Trình đọc màn hình (NVDA/VoiceOver) | Chưa chạy. Đã có cấu trúc ARIA và kiểm tra bàn phím tự động |
| Nội dung và ảnh thật | Chủ website cung cấp. Mục A8–A10, B1 |
