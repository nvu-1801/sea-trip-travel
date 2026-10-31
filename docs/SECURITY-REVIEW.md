# Rà soát bảo mật · 30/10/2026

## Phạm vi và kết luận

Rà soát source và cấu hình trong working tree, dependency theo `package-lock.json`, test CMS và email, cùng lịch sử của hai template môi trường. Working tree có các thay đổi đang thực hiện từ trước; báo cáo này không phải đánh giá riêng một release đã deploy.

Đã sửa dependency có advisory và loại địa chỉ email vận hành khỏi hai template. Chưa thực hiện pentest, kiểm tra cấu hình VPS, quyền GitHub, chứng thực domain email hoặc phục hồi backup production. Không dùng báo cáo để tuyên bố hệ thống không có lỗ hổng.

## Dependency

`npm audit --json` ban đầu phát hiện một dependency mức **moderate**: Nodemailer dưới 10.1.4, với ba advisory về cách phân tích địa chỉ nhận:

- [GHSA-8c8m-p3m8-cjg8](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8).
- [GHSA-m943-m63m-w62w](https://github.com/advisories/GHSA-m943-m63m-w62w).
- [GHSA-85x2-q946-cp5h](https://github.com/advisories/GHSA-85x2-q946-cp5h).

Đã cập nhật Nodemailer lên **10.3.1** (bản vá tối thiểu theo advisory là 10.1.4), nâng minimum range trong `package.json` và cập nhật lockfile. Audit sau cập nhật không báo vulnerability tại thời điểm chạy. Kết quả registry có thể thay đổi khi advisory mới được công bố; không thay thế review code.

## Kiểm soát đã đối chiếu trong source

| Khu vực            | Bằng chứng                                                                                               | Giới hạn                                                                           |
| :----------------- | :------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| Tài khoản quản trị | `src/server/cms/auth.ts`: scrypt với salt ngẫu nhiên, mật khẩu 14–200 ký tự, so sánh timing-safe         | Một chủ quản trị; chưa có MFA hoặc phân quyền nhiều vai trò                        |
| Phiên & CSRF       | Token phiên băm SHA-256 trong DB; cookie HttpOnly, SameSite strict; thao tác ghi kiểm tra Origin và CSRF | `Secure` có thể bị cấu hình tắt; cần kiểm tra env production                       |
| Payload lead       | `src/server/cms/leads.ts`: AES-256-GCM, IV ngẫu nhiên, kiểm tra khóa 64 hex                              | Không mã hóa toàn bộ database; metadata và các dữ liệu khác có chính sách riêng    |
| Chống lạm dụng     | Rate limit đăng nhập trong SQLite; validation và rate limit cho lead                                     | Lead dùng memory không chia sẻ bộ đếm giữa nhiều process                           |
| HTTP               | `next.config.ts`: CSP, nosniff, frame DENY; Caddy cấu hình HSTS                                          | CSP còn `unsafe-inline`; chưa đạt chính sách nonce/hash nghiêm ngặt                |
| Container          | `compose.yml`: bind localhost, read-only, bỏ capabilities, no-new-privileges, volume dữ liệu             | Chưa kiểm tra container hoặc firewall đang chạy trên VPS trong đợt này             |
| Supply chain       | Workflow dùng SHA cho checkout/setup-node, quyền mặc định contents:read                                  | Chưa kiểm tra branch protection, environment approvals hoặc quyền tài khoản GitHub |
| Secrets            | `.gitignore`, `.dockerignore` loại `.env*`; output tracing loại file môi trường                          | Có thể bị force-add hoặc lộ qua log/code; ignore không phải secret scanner         |

## Điểm cần ưu tiên tiếp theo

1. **Giới hạn body của API lead:** `src/app/api/leads/route.ts` dùng `request.text()` trước khi kiểm tra độ dài thực, rồi đếm ký tự thay vì byte. Header Content-Length không đủ để chặn body streaming hoặc khai báo sai. Caddy có giới hạn tổng 11 MB, nhưng đây không phải giới hạn riêng của API lead. Nên đọc stream với ngưỡng byte và có test cho body không có Content-Length trước khi sửa runtime.
2. **Chống gửi trùng khi đồng thời:** service lead đã ghi rõ khoảng trống giữa bước kiểm tra và ghi idempotency. Hai request đồng thời có thể gửi hai email. Nếu yêu cầu nghiệp vụ là exactly-once, cần cơ chế claim nguyên tử và test concurrency.
3. **Cấu hình runtime:** xác minh HTTPS, cookie Secure, origin, header proxy, khóa và bản backup ngoài VPS. Đây là điều kiện vận hành cần bằng chứng riêng, chưa xác minh từ source.

Hai điểm đầu được ghi nhận qua đọc source; chưa thử khai thác hoặc sửa logic trong đợt tài liệu này.

## Kiểm tra đã chạy

- Lịch sử hai file `.env.example` và `.env.production.example`: 7 revision; không thấy giá trị thật ở các biến SMTP password, lead encryption key, lead salt, Redis token và admin password được kiểm tra. Đây không phải scan toàn bộ lịch sử repository.
- Hai template: không còn địa chỉ email vận hành, không trùng tên biến; file env thật và tên backup mẫu được Git ignore.
- `npm test`: 337/341 pass trong sandbox; 4 lỗi ở SMTP cục bộ và thao tác rename file trạng thái release (`EPERM`).
- Chạy lại hai file test email ngoài sandbox: **11/11 pass**, gồm toàn bộ 4 case vừa lỗi, dùng SMTP giả lập cục bộ, không gửi email ra ngoài.
- `npm run lint` và `npm run typecheck`: pass.
- Liên kết và đường dẫn ảnh cục bộ trong các tài liệu sửa: pass; `git diff --check`: pass.
- `npm run test:cms`: **42/42 pass**, gồm kiểm tra password, Origin, mã hóa lead, giới hạn đăng nhập và backup SQLite.

Không chạy full preflight, Docker smoke test, browser test hoặc kiểm tra production trong đợt này. Phải chạy đầy đủ các cổng release trước khi push/merge theo [CI/CD](CI-CD.md).
