# SEA TRIP · Docker, VPS và tự động deploy main

## Kiến trúc

Next.js và CMS cùng một container Node 22, chạy UID 1001. SQLite WAL, sessions, giới hạn đăng nhập/lead và uploads nằm trong volume `seatrip_content`. Dùng một instance app trên một VPS, không đặt SQLite trên NFS và không nhân bản app với database riêng. Public đọc snapshot xuất bản ở mỗi request; thêm tour, danh mục hoặc sửa footer có hiệu lực ngay, không rebuild. cho tSeed TypeScript giữ làm dữ liệu ban đầu, gồm đủ 28 ảnh; không ghi ngược file nguồn khi admin lưu.

`sea-trip-travel` là nguồn chính; thư mục QA cũ không còn file nguồn ở thời điểm kiểm tra 18/10/2026. Các file thiếu trong nguồn chính đã phục hồi từ main `95c9512` mà không ghi đè file tồn tại. Thư mục recovery chỉ là bản tham chiếu phục hồi.

## Chạy local

1. Node >=22.13: `npm ci`.
2. Sao chép `.env.example` thành `.env.local`; bật `CMS_ENABLED=1`. Tạo `LEAD_ENCRYPTION_KEY` bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Giữ khóa này bền vững, bên ngoài Git. Mất khóa đồng nghĩa không giải mã được dữ liệu khách.
3. Đặt `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong môi trường tiến trình terminal, rồi `npm run admin -- bootstrap`. Mật khẩu tối thiểu 14 ký tự, không có tài khoản/mật khẩu mặc định và không đăng ký công khai. Xóa biến mật khẩu khỏi terminal sau bootstrap. `npm run admin -- reset` đổi mật khẩu và thu hồi mọi session.
4. `npm run dev`; admin tại `/admin`. Chỉ trên local HTTP dùng `ADMIN_COOKIE_SECURE=false`.
5. `npm run build`, `npm start` để chạy production local.

## Chuẩn bị VPS lần đầu

VPS Linux cần Docker Engine và Compose v2, Bash, curl, tar, flock. Chọn domain riêng cho SEA TRIP và trỏ DNS. Tạo SSH deploy user riêng; giới hạn SSH bằng key, tắt đăng nhập root/mật khẩu, chỉ mở cổng cần dùng. Quyền Docker tương đương quyền root: chỉ cấp deploy user có kiểm soát, không cấp cho tài khoản công khai.

Tạo `/opt/seatrip/.env.production` theo `.env.production.example`, `chmod 600`; thư mục ứng dụng thuộc deploy user. Dùng khóa mã hóa và salt riêng, SMTP riêng. Không sao chép thông tin đăng nhập SDT. Domain, email TLS, host và port đều cấu hình được.

Trong source release:

```bash
cp .env.production.example .env.production
# Điền thông tin thật và khóa ngẫu nhiên trước khi chạy.
docker compose --env-file .env.production config --quiet
APP_SHA=$(git rev-parse HEAD) docker compose --env-file .env.production build app
docker compose --env-file .env.production up -d --wait app
```

Bootstrap tài khoản mà không đưa mật khẩu vào lịch sử lệnh:

```bash
read -r -p 'Admin username: ' ADMIN_USERNAME
read -r -s -p 'Admin password (14+ characters): ' ADMIN_PASSWORD; echo
export ADMIN_USERNAME ADMIN_PASSWORD
docker compose --env-file .env.production exec -T -e ADMIN_USERNAME -e ADMIN_PASSWORD app node scripts/admin.mjs bootstrap
unset ADMIN_PASSWORD ADMIN_USERNAME
```

App chỉ mở `127.0.0.1:3080`. Nếu VPS đã có Nginx/Caddy của SDT, thêm virtual host riêng proxy đến cổng này, chuyển tiếp Host/HTTPS và **ghi đè** X-Forwarded-For từ địa chỉ client; không tin header tự gửi của khách. Không khởi động thêm proxy tranh cổng 80/443.

Nếu VPS dành riêng cho SEA TRIP:

```bash
docker compose --env-file .env.production --profile proxy up -d
```

Caddy lấy TLS tự động qua `SITE_DOMAIN` và `ACME_EMAIL`. Chỉ public HTTPS, cookie admin Secure, header chống iframe/nosniff/CSP, giới hạn request 11 MB. Cấu hình firewall ngoài Docker; không mở cổng app ra internet.

## GitHub Actions

Workflow `.github/workflows/ci-deploy.yml` chạy lint, typecheck, unit, CMS tests, production build, UI/tour/CMS browser checks và build Docker. Pull request chỉ kiểm tra. Mọi push main sau khi bật deploy sẽ kiểm tra trước, gửi đúng archive commit đã kiểm tra qua SSH rồi build trên VPS. Không lưu SSH key trong image.

GitHub Environment `production` / repository:

| Secret / variable          | Ý nghĩa                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Secret `VPS_HOST`          | IP/domain SSH                                                                           |
| Secret `VPS_USER`          | Deploy user                                                                             |
| Secret `VPS_PORT`          | Cổng SSH, ví dụ 22                                                                      |
| Secret `VPS_SSH_KEY`       | Private deploy key dành riêng repo này                                                  |
| Secret `VPS_KNOWN_HOSTS`   | Host public key đã kiểm chứng bằng kênh tin cậy; không dùng ssh-keyscan rồi tự tin ngay |
| Variable `VPS_APP_DIR`     | Ví dụ `/opt/seatrip`; đường dẫn không chứa khoảng trắng                                 |
| Variable `PROD_HEALTH_URL` | `https://<domain>/api/health`                                                           |
| Variable `DEPLOY_ENABLED`  | Chỉ đặt `true` sau khi VPS, env và proxy sẵn sàng                                       |

Workflow từ chối commit đã cũ khi main có SHA mới hơn. Trên VPS, `flock` tuần tự hóa deploy, tạo release riêng, backup SQLite bằng VACUUM INTO và copy uploads trước cập nhật, build image gắn SHA. Compose đợi health và đối chiếu SHA/database. Nếu khởi động hoặc health nội bộ thất bại, tự chạy lại image trước. Job còn kiểm tra health HTTPS công khai; nếu bước này lỗi, kiểm tra proxy/DNS và rollback thủ công theo dưới. Không tuyên bố deploy thành công khi job health lỗi.

Migrations hiện chỉ tạo bảng hoặc cột bổ sung (`user_version=1`), không phá dữ liệu. Khi thay schema sau này, cần migration phiên bản và đánh giá tương thích image cũ; không tự khôi phục DB cũ vì có thể mất lead mới.

## Email báo cập nhật cho chủ doanh nghiệp

Sau khi `deploy.sh` xác nhận container mới đúng SHA, database kết nối và bước kiểm tra `https://<domain>/api/health` công khai đạt, workflow chạy `scripts/deploy/notify.sh` để gửi một email tới chủ website. Không có quy trình deploy thứ hai: email dùng SMTP đã có trong `/opt/seatrip/.env.production` và chạy trong chính container vừa deploy.

- Chỉ gửi sau khi cả health nội bộ và health công khai đạt. Deploy lỗi, rollback hoặc health công khai lỗi thì không gửi.
- Mỗi SHA chỉ gửi một lần. Danh sách SHA đã thông báo nằm ở `/app/data/release-notices.json` trong volume `seatrip_content`, nên deploy lại cùng bản sẽ không gửi trùng.
- Người nhận: `RELEASE_NOTICE_RECIPIENTS` (nhiều địa chỉ ngăn cách bằng dấu phẩy). Để trống thì dùng `SALES_RECIPIENTS`.
- Dùng chung `MAIL_TRANSPORT=smtp`, `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` và `NEXT_PUBLIC_SITE_URL` đã có. Không cần thêm mật khẩu SMTP vào GitHub.
- Tắt tạm mà không sửa quy trình deploy: `RELEASE_NOTICE_ENABLED=false`.
- Lỗi gửi email chỉ hiện cảnh báo ở bước “Send owner update email”; bản đã deploy thành công vẫn giữ nguyên, không rollback.

### Ghi chú dành cho khách hàng

Email không tự đoán tính năng từ commit message. Chỉ commit có trailer tường minh mới được đưa vào:

```text
feat: add tour filters

Customer-Note: Bộ lọc tìm tour nhanh và dễ dùng hơn trên điện thoại
Customer-Note: Trang tour hiển thị lịch trình và giá rõ ràng hơn
```

- Viết tiếng Việt, ngắn gọn, nói điều khách nhìn thấy và lợi ích. Không viết tên tệp, mã commit, URL, log hay thuật ngữ kỹ thuật.
- Chỉ lấy các commit giữa SHA đang chạy trên production và SHA mới. Lần deploy đầu tiên chỉ lấy commit mới nhất.
- Không có trailer nào: email vẫn xác nhận cập nhật thành công nhưng ghi rõ “không kèm ghi chú thay đổi dành cho khách hàng”; không tự bịa nội dung.
- Ghi chú có dấu hiệu kỹ thuật bị loại; số lượng bị loại được ghi trong log deploy.
- Nếu thiếu cấu hình, log deploy ghi rõ tên biến cần thêm vào `.env.production`.

## Backup và phục hồi

Backup nhất quán SQLite:

```bash
export APP_ENV_FILE=/opt/seatrip/.env.production
cd /opt/seatrip/current
docker compose --env-file "$APP_ENV_FILE" exec -T -e BACKUP_PATH=/app/data/backups/manual.sqlite app node scripts/admin.mjs backup
cid=$(docker compose --env-file "$APP_ENV_FILE" ps -q app)
docker cp "$cid:/app/data/backups/manual.sqlite" /secure-backups/seatrip.sqlite
docker cp "$cid:/app/data/uploads" /secure-backups/uploads
```

Đặt lịch cron/systemd hằng ngày cho hai phần này; bản ghi lead mã hóa nhưng ảnh và nội dung public không mã hóa. Bảo vệ backup, sao chép ra máy khác, lưu khóa mã hóa riêng trong password manager. Snapshot/backup phải có cả DB, uploads và khóa. Định kỳ thử phục hồi vào volume thử, chạy `node scripts/admin.mjs verify`, đăng nhập và tải ảnh trước khi coi backup dùng được. Không sao chép trực tiếp SQLite đang ghi để làm backup.

Phục hồi: dừng app, sao lưu trạng thái hiện tại trước, đưa file SQLite đã integrity-check cùng uploads vào volume bằng container tạm, đặt owner `1001:1001`, dùng đúng LEAD_ENCRYPTION_KEY và khởi động app. Không thay DB khi app còn chạy. Giữ bản gốc cho đến khi kiểm tra dữ liệu và ảnh thành công.

Rollback image:

```bash
cd /opt/seatrip/current
APP_ENV_FILE=/opt/seatrip/.env.production APP_IMAGE=sea-trip:<SHA-cũ> \
  docker compose --env-file /opt/seatrip/.env.production up -d --no-build --wait app
curl -fsS https://<domain>/api/health
```

Không prune volume hoặc image đang phục vụ. Sau rollback ghi lại `current-image/current-sha` tương ứng trước deploy tiếp.

## CMS và bảo mật

- Session 8 giờ, token ngẫu nhiên chỉ lưu SHA-256, cookie HttpOnly/SameSite Strict/Secure; đổi/reset mật khẩu thu hồi tất cả session.
- Mật khẩu scrypt salt riêng; login rate limit SQLite; mutation cần session, Origin cùng site và CSRF token. Upload không nhận SVG/HTML, decode bằng sharp, tối đa 25 triệu pixel/10 MB, re-encode WebP bỏ metadata, tên UUID.
- Dữ liệu lead và ghi chú mã hóa AES-256-GCM. Lưu trước gửi mail; lỗi SMTP không mất lead. Chủ quản trị có thể gửi lại email trong tab Tư vấn sau khi cấu hình SMTP.
- Nháp không vào trang public, tìm kiếm hoặc sitemap. Lưu nháp của bản đã xuất bản giữ snapshot cũ trên website; xuất bản mới thay snapshot. Thùng rác có thể khôi phục thành nháp; ảnh còn tham chiếu không được xóa. Slug/path đã tạo được giữ nguyên để tránh gãy SEO.
- Form có kiểm tra schema, reference và revision chống lưu đè. Nội dung hiển thị bằng React/structured blocks, không thực thi HTML từ CMS. Bản dịch EN có trạng thái duyệt riêng.
- Frontend JS luôn có thể đọc được; không dùng obfuscation như một lớp bảo mật. DB, SMTP, session và khóa mã hóa chỉ ở server; `.env`, DB, uploads, bundle và log không vào image context/Git.

## Nghiệm thu

```bash
npm run lint
npm run typecheck
npm test
npm run test:cms
npm run build
npm run verify:ui
npm run verify:tour-import
npm run verify:cms
APP_ENV_FILE=.env.production.example docker compose --env-file .env.production.example config --quiet
docker build --build-arg APP_SHA=$(git rev-parse HEAD) -t sea-trip:check .
```

`verify:cms` dùng database/uploads tạm và tài khoản ngẫu nhiên, không sửa nội dung thật hoặc gửi email khách. `verify:ui` dùng SMTP sink local. Để test full local, Chrome cần được cài. Chưa bật deploy thực tế cho đến khi có thông tin VPS và thiết lập Secrets ở trên.
