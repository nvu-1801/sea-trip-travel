# Luồng form → email → lead

## 1. Tổng quan

```
Khách điền form
      │  (React controlled inputs, không reset khi lỗi)
      ▼
Validate phía client  ──  dùng CHÍNH schema của server (domain/lead.ts)
      │
      ▼
POST /api/leads        ──  chặn theo kích thước payload trước khi parse
      │
      ▼
submitLead()           ──  validate → idempotency → rate limit → chuẩn hoá
      │
      ▼
getMailer().send()     ──  Mailer interface (SMTP hoặc log)
      │
      ├─ ok    → 200 { ok, requestId, status: "accepted" }
      └─ lỗi   → 4xx/5xx { ok:false, error:{ code, message } }
```

## 2. Trường và ràng buộc

| Trường | Bắt buộc | Ràng buộc |
| --- | --- | --- |
| `fullName` | ✅ | 2–80 ký tự |
| `phone` | ✅ | 8–20 ký tự, khớp `^[+0-9][0-9\s.\-()]{7,19}$`; chuẩn hoá về `0xxxxxxxxx` |
| `email` | — | tối đa 160, phải là email hợp lệ. **Không có email thì sales vẫn gọi điện được** |
| `interest` | — | tối đa 160 |
| `tourSlug` | — | tối đa 120; **phải khớp tour có thật** mới được ghi |
| `travelDate` | — | `YYYY-MM-DD`; ngày quá khứ vẫn hợp lệ |
| `partySize` | — | số nguyên 1–60 |
| `message` | — | tối đa 2000 |
| `consent` | ✅ | phải là `true` |
| `sourcePage` | — | chỉ nhận đường dẫn nội bộ `/…` |
| `utm` | — | chỉ 5 khoá chuẩn, mỗi khoá tối đa 120 ký tự |
| `submissionId` | — | khoá idempotency do client sinh |
| `company` | — | **honeypot** — phải rỗng |

Tổng payload tối đa **16 KB**, chặn trước khi `JSON.parse`.

## 3. Hợp đồng API

`POST /api/leads` · `Content-Type: application/json` · runtime Node.js.

### Thành công — `200`

```json
{
  "ok": true,
  "requestId": "STT-20261013-6474",
  "status": "accepted",
  "receivedAt": "2026-10-13T04:31:37.320Z"
}
```

`status: "accepted"` nghĩa là **đã chuyển cho nhà cung cấp email và được chấp
nhận**. Điều này **không** chứng minh email đã vào hộp thư. Vì vậy giao diện
luôn nói "Đã tiếp nhận yêu cầu", không bao giờ nói "Đã gửi email thành công".

### Lỗi

| HTTP | `code` | Khi nào | Giao diện làm gì |
| --- | --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Schema không đạt | Hiện lỗi từng trường, giữ nguyên dữ liệu, focus trường lỗi đầu tiên |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 16 KB | Thông báo rút gọn nội dung |
| 429 | `RATE_LIMITED` | Quá 5 lần / 10 phút / client | Thông báo thử lại sau, kèm hotline |
| 502 | `MAIL_DELIVERY_FAILED` | Transport từ chối | Đề nghị thử lại hoặc gọi hotline |
| 503 | `MAIL_NOT_CONFIGURED` | Chưa cấu hình email (kể cả khi `MAIL_TRANSPORT=log` ở production) | **Không báo thành công**, đưa hotline ra trước |
| 500 | `INTERNAL_ERROR` | Lỗi ngoài dự kiến | Thông báo chung + `requestId` để tra log |

Lỗi 400 kèm `fieldErrors: { tênTrường: ["thông báo"] }`.

## 4. Phòng chống spam và lạm dụng

| Lớp | Cơ chế | Ghi chú |
| --- | --- | --- |
| 1 | Giới hạn kích thước payload | 16 KB, chặn trước khi parse |
| 2 | Honeypot `company` | Trường ẩn, `aria-hidden`, `tabIndex=-1`, `autoComplete=off`. Điền ⇒ **im lặng bỏ qua**: trả về 200 giống hệt thành công nhưng không gửi gì và chỉ ghi log (không log nội dung) |
| 3 | Rate limit | 5 lần / 10 phút, khoá là hash(salt + IP + user-agent) |
| 4 | Idempotency | `submissionId` → trả lại kết quả cũ trong 10 phút, không gửi email thứ hai |
| 5 | Xác thực schema | Chặn dữ liệu sai dạng trước khi chạm tới mailer |

### Giới hạn đã biết

- **Rate limit và idempotency nằm trong bộ nhớ một instance.** Trên serverless,
  request rải qua nhiều instance sẽ vượt được hạn mức. Đây là lớp chặn cho
  trường hợp phổ biến (một script đập vào một endpoint), không phải bảo vệ tuyệt
  đối. Xem mục 7 để biết điểm thay thế.
- **CAPTCHA chưa dùng.** Chỉ nên thêm khi log cho thấy tỉ lệ spam vượt ngưỡng
  chấp nhận được. Khi đó dùng Cloudflare Turnstile (không cần tương tác, thân
  thiện với người dùng hơn reCAPTCHA) và xác thực token ở phía server.
- **Không ghi dữ liệu cá nhân vào log.** Log chỉ có `requestId`, transport, số
  người nhận, và lý do lỗi — không có tên, số điện thoại, email hay nội dung.
- **Người nhận email do server quyết định.** `SALES_RECIPIENTS` đọc từ env; body
  request không có trường này.

## 5. Chọn phương án: lưu lead hay chỉ gửi email?

**Chọn: giai đoạn MVP chỉ gửi email, có mã yêu cầu và log đường đi.**

Lý do:

- Không dựng database chỉ để "phòng khi cần" — điều đó thêm hạ tầng, backup,
  migration và bảo mật dữ liệu mà chưa có người dùng trả tiền cho nó.
- Hộp thư của sales **đã là** nơi lưu trữ bền vững, có tìm kiếm, có phân quyền,
  và sales vốn đã làm việc ở đó.
- Mã yêu cầu `STT-YYYYMMDD-XXXX` + log server đủ để tra cứu khi khách gọi lại.

**Rủi ro mất lead và cách xử lý:**

| Tình huống | Điều gì xảy ra | Đã xử lý thế nào |
| --- | --- | --- |
| SMTP/API lỗi tạm thời | Transport trả lỗi | Trả **502** kèm `requestId`; giao diện **giữ nguyên dữ liệu khách đã nhập** và mời gọi hotline. Khách bấm gửi lại được |
| Chưa cấu hình email | `isConfigured()` = false | Trả **503**, không báo thành công giả. Log lỗi rõ ràng để vận hành biết |
| Khách bấm gửi hai lần | Hai request | Lần hai trả lại kết quả cũ (idempotency), không có email thứ hai |
| Email vào spam | Transport đã chấp nhận | Cấu hình SPF/DKIM/DMARC (mục 6) và **luôn có `replyTo` là email khách** để sales trả lời trực tiếp |
| Rate limit quá chặt | Khách thật bị chặn | Thông báo rõ + hotline; 5 lần/10 phút là rộng cho người dùng thật |

**Cách tránh gửi trùng:** ba lớp — nút bị `disabled` khi đang gửi, cờ
`submittingRef` chặn lần bấm thứ hai trong cùng một render, và `submissionId`
chặn trường hợp retry sau khi timeout.

**Giới hạn bảo đảm:** hệ thống bảo đảm *"email đã được transport chấp nhận"*,
**không** bảo đảm *"email đã nằm trong hộp thư"*. Muốn bảo đảm hơn thì phải bổ
sung lưu trữ bền vững + retry (mục 7).

## 6. Biến môi trường

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Origin công khai, dùng cho canonical, sitemap và link trong email |
| `SALES_RECIPIENTS` | ✅ | Danh sách email sales, phân tách bằng dấu phẩy. **Chỉ cấu hình ở server** |
| `LEAD_HASH_SALT` | ✅ | Chuỗi ngẫu nhiên dài, dùng để băm dấu vết client cho rate limit |
| `MAIL_TRANSPORT` | ✅ | `smtp` hoặc `log` |
| `MAIL_FROM_NAME` | — | Tên hiển thị, mặc định `SEA TRIP TRAVEL` |
| `MAIL_FROM_EMAIL` | ✅ (khi dùng smtp) | **Phải thuộc domain đã xác minh** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` | ✅ (khi `smtp`) | Cổng 587 + `SMTP_SECURE=false` (STARTTLS) hoặc 465 + `true` |

**Không có secret nào trong source.** Chỉ biến `NEXT_PUBLIC_*` mới lộ ra trình
duyệt. Module dùng credential đều có `import "server-only"` — nếu ai đó vô tình
import vào Client Component, build sẽ đỏ ngay.

### Vì sao chọn dịch vụ email API thay vì SMTP thuần?

| Tiêu chí | SMTP (nodemailer) | Dịch vụ API (Resend/Postmark/SendGrid) |
| --- | --- | --- |
| Cấu hình | Cần host/port/TLS, dễ sai | Một API key |
| Serverless | Kết nối TCP mỗi lần gọi, có thể chậm hoặc timeout | HTTP, thân thiện cold start hơn |
| Theo dõi | Phải tự xây | Có dashboard, log, trạng thái delivered/bounced |
| Chi phí | Thấp nhưng phải tự vận hành | Có bậc miễn phí, sau đó trả theo lượng |
| Khoá vào nhà cung cấp | Không | Có, nhưng đổi được |

**MVP chọn SMTP** vì đây là thứ hầu hết đơn vị du lịch Việt Nam đã có sẵn (Google
Workspace / Zoho / email theo domain) và không phát sinh chi phí mới. Kiến trúc
đã sẵn sàng để đổi: thêm một class implement `Mailer` và một nhánh trong
`getMailer()`.

> **Chưa xác minh:** giá và hạn mức cụ thể của từng nhà cung cấp dịch vụ email
> thay đổi theo thời điểm. Cần kiểm tra lại trang giá của nhà cung cấp trước khi
> cam kết với chủ website.

## 7. Lộ trình nâng cấp

| Giai đoạn | Việc làm | Thay đổi ở đâu |
| --- | --- | --- |
| Ngay | Gửi email (hiện tại) | — |
| Khi log cho thấy spam | Thêm Turnstile | Thêm một lớp trong `service.ts`, thêm widget vào `LeadForm` |
| Khi cần chống rate limit thật | Đổi `getRateLimiter()` sang Redis/KV | Chỉ file `rate-limit.ts`, không đổi caller |
| Khi cần không mất lead | Lưu lead vào DB **trước**, rồi mới gửi email; thêm retry có backoff | Thêm bước trong `service.ts`; `getRateLimiter` và `Mailer` giữ nguyên |
| Khi cần sales làm việc trên lead | Bảng lead + trạng thái xử lý | Xem `docs/admin-roadmap.md` |

## 8. Wireframe email và nội dung mẫu

### Cấu trúc

```
┌───────────────────────────────────────────────────────────┐
│ ████████ thanh gradient 8px (#FF0366 → #FFBC0E) █████████ │
│                                                           │
│  [logo SEA TRIP TRAVEL — alt text đầy đủ]                 │
│  CHỌN LỌC ĐIỂM ĐẾN – NÂNG TẦM TRẢI NGHIỆM                 │
│                                                           │
│  Yêu cầu tư vấn mới                                       │
│  Mã yêu cầu #STT-20261013-6474                            │
│  Tiếp nhận lúc 13/10/2026 lúc 11:31 (GMT+7)               │
│                                                           │
│  [ Gọi 0987 654 321 ]   ( Trả lời email )                 │
│  ^ nút chữ, không phụ thuộc ảnh                           │
│                                                           │
│  THÔNG TIN KHÁCH                                          │
│  Họ tên            Nguyễn Văn A                           │
│  Số điện thoại     0987 654 321  (link tel:)              │
│  Email             khach@example.com  (link mailto:)      │
│  Tour quan tâm     Quy Nhơn – Phú Yên 3 ngày 2 đêm        │
│                    → Mở trang tour                        │
│  Ngày dự kiến      01/12/2026                             │
│  Số người          2 khách                                │
│                                                           │
│  NỘI DUNG KHÁCH GỬI                                       │
│  ┃ Gia đình 4 người, muốn đi 3 ngày 2 đêm…                │
│                                                           │
│  Trang gửi yêu cầu: https://…/tour/quy-nhon-…             │
│  Nguồn: facebook / cpc / quynhon                          │
│                                                           │
│  ─────────────────────────────────────────────────────    │
│  Đây là thông báo tự động nội bộ từ website SEA TRIP…     │
└───────────────────────────────────────────────────────────┘
```

### Quy tắc kỹ thuật đã áp dụng

| Yêu cầu | Cách làm |
| --- | --- |
| Gmail/Outlook | Bảng `<table role="presentation">`, style inline, không flex/grid, rộng 600px |
| Ảnh bị chặn vẫn hiểu được | Thanh gradient có `bgcolor` dự phòng; logo có `alt="SEA TRIP TRAVEL"`; **mọi thông tin đều là chữ** |
| Không JavaScript / form | Không có `<script>`, không có `<form>` |
| Escape dữ liệu khách | `escapeHtml()` trên **mọi** giá trị; không nội suy HTML thô |
| `href` an toàn | `safeTelHref`, `safeMailtoHref`, `isSafeSiteHref` — kiểm tra lại trong template trước khi ghi `href` |
| `From` thuộc domain xác minh | `MAIL_FROM_EMAIL` + SPF/DKIM/DMARC |
| `Reply-To` chỉ từ email hợp lệ | Chỉ set khi email của khách qua được regex |
| Không dùng email khách làm `From` | `From` luôn là `MAIL_FROM_*,` |
| Có plain-text fallback | `buildLeadNotificationText()` |
| Preheader | Chuỗi ẩn, hiển thị ở phần xem trước của hộp thư |

### Mẫu subject

```
[SEA TRIP] Yêu cầu tư vấn mới · #STT-20261013-6474 · Quy Nhơn – Phú Yên 3 ngày 2 đêm
```

Subject **không** chứa tên, số điện thoại hay email khách (hộp thư có thể bị
chia sẻ hoặc hiện trên màn hình khoá).

### Mẫu plain text

```
SEA TRIP TRAVEL
CHỌN LỌC ĐIỂM ĐẾN – NÂNG TẦM TRẢI NGHIỆM

YÊU CẦU TƯ VẤN MỚI
Mã yêu cầu: #STT-20261013-6474
Tiếp nhận lúc: 13/10/2026 lúc 11:31 (GMT+7)

-- THÔNG TIN KHÁCH --
Họ tên: Nguyễn Văn A
Số điện thoại: 0987654321
Email: khach@example.com
Tour / điểm đến quan tâm: Quy Nhơn – Phú Yên 3 ngày 2 đêm
Ngày dự kiến: 01/12/2026
Số người: 2
Trang tour: https://example.com/tour/quy-nhon-phu-yen-3-ngay-2-dem

-- NỘI DUNG KHÁCH GỬI --
Gia đình 4 người, muốn đi 3 ngày 2 đêm, ưu tiên biển và hải sản.

--
Thông báo tự động nội bộ từ website SEA TRIP TRAVEL.
Vui lòng không chuyển tiếp ra ngoài.
```

### Email xác nhận cho khách

**Nằm ngoài MVP.** Khi bổ sung: là một template riêng, có cơ chế không gửi trùng,
và **không** kèm bất kỳ đăng ký nhận tin marketing nào.
