# SEA TRIP — lệnh deploy lần đầu và bật GitHub Actions

Áp dụng cho cấu trúc hiện tại: Next.js + API + admin + SQLite trong một container.
Lệnh trong PowerShell chạy trên Windows; lệnh Bash chạy sau khi SSH vào VPS Linux.
Thay mọi giá trị ví dụ trước khi chạy. Chạy từng khối và dừng nếu có lỗi.
Tài liệu này không xác nhận production đã được triển khai hoặc nghiệm thu.

## 1. Khai báo trên máy Windows — PowerShell

```powershell
cd "C:\Users\Nguyen Vu\Downloads\Landingpage Tourist\sea-trip-travel"

$taskRepo = "nvu-1801/sea-trip-travel"
$taskHost = "THAY_IP_VPS"
$taskSshPort = 22
$taskUser = "THAY_USER_DEPLOY"
$taskDomain = "THAY_TEN.duckdns.org"
$taskAppDir = "/opt/seatrip"

git remote -v
git status --short --branch
gh auth status
```

User deploy cần có quyền Docker không cần sudo và ghi được `/opt/seatrip`.
Không dùng tài khoản root làm tài khoản deploy CI. Quyền Docker tương đương quyền root trên host.

Nếu thiếu xác thực GitHub:

```powershell
gh auth login --hostname github.com --web --git-protocol https
gh auth setup-git
```

## 2. Kiểm tra VPS — Bash

Từ PowerShell:

Trước lần kết nối đầu, đối chiếu fingerprint SSH bằng console nhà cung cấp theo bước 8. Không chấp nhận host key chưa xác minh.

```powershell
ssh -p $taskSshPort "${taskUser}@${taskHost}"
```

Trên VPS:

```bash
whoami
docker version
docker compose version
command -v bash curl tar flock openssl
sudo ss -lntp
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
docker compose ls
docker volume ls
free -h
df -h
```

Yêu cầu: Docker Engine sẵn sàng, Compose v2 hỗ trợ `--wait`, Bash/curl/tar/flock/openssl có sẵn.
Nếu thiếu Docker trên VPS đang chạy các web khác, dừng tại đây để chọn cách cài phù hợp hệ điều hành; không tự cài lại hoặc restart Docker.

Kiểm tra tên project `sea-trip`, volume `seatrip_content` và thư mục `/opt/seatrip` chưa thuộc ứng dụng khác.
Cổng ví dụ là 3080. Nếu đã bận, chọn cổng khác và dùng nhất quán trong env/proxy/health bên dưới.
Kiểm tra cả CPU/RAM/dung lượng; container riêng vẫn dùng chung tài nguyên host.
Workflow hiện build Docker trên VPS, vì vậy phải có RAM dự phòng trước khi chạy trên máy SDT.

Không chạy `docker compose down`, `docker system prune`, `docker volume prune`, restart Docker hoặc khởi động proxy mới chiếm 80/443.

## 3. Domain và môi trường VPS — Bash

Đăng ký một subdomain còn trống tại https://www.duckdns.org/ và trỏ IPv4 đến IP VPS.
Không cần domain riêng cho BE vì FE/API/admin dùng chung origin. Không để bản ghi IPv6 trỏ nhầm máy.

Chỉ tạo thư mục mới nếu `/opt/seatrip` chưa tồn tại:

```bash
if sudo test -e /opt/seatrip; then
  echo 'Thư mục đã tồn tại: kiểm tra owner/nội dung trước, không ghi đè.'
else
  sudo install -d -m 750 -o "$(id -un)" -g "$(id -gn)" /opt/seatrip
fi

cd /opt/seatrip
ls -ld .
test -w .
umask 077

if [ ! -e .env.production ]; then
  touch .env.production
  chmod 600 .env.production
fi

openssl rand -hex 32
openssl rand -hex 32
nano .env.production
```

Dùng hai kết quả khác nhau cho khóa mã hóa và salt. Không thay khóa nếu đã có dữ liệu.
Điền file sau, thay domain/email/khóa và SMTP thật:

```dotenv
NEXT_PUBLIC_SITE_URL=https://THAY_TEN.duckdns.org
SITE_URL=https://THAY_TEN.duckdns.org
SITE_DOMAIN=THAY_TEN.duckdns.org
ACME_EMAIL=THAY_EMAIL
APP_BIND_PORT=3080
CMS_ENABLED=1
ADMIN_COOKIE_SECURE=true
LEAD_ENCRYPTION_KEY=THAY_64_KY_TU_HEX
LEAD_HASH_SALT=THAY_CHUOI_NGAU_NHIEN_RIENG
LEAD_RATE_LIMIT_STORE=memory
MAIL_TRANSPORT=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=THAY_EMAIL_GUI
SMTP_PASSWORD=THAY_MAT_KHAU_UNG_DUNG
MAIL_FROM_EMAIL=THAY_EMAIL_GUI
MAIL_FROM_NAME=SEA TRIP TRAVEL
SALES_RECIPIENTS=THAY_EMAIL_NHAN
```

Thiếu SMTP thì chưa nghiệm thu gửi email tư vấn. Không đưa file này vào Git/chat.
Lưu khóa mã hóa riêng ở nơi an toàn ngoài VPS. Env runtime không tự thay các giá trị NEXT_PUBLIC đã đóng vào client bundle; cần kiểm tra URL canonical/social trên bản build thực tế.

## 4. Kiểm tra và đưa source lên GitHub — PowerShell

Chỉ chạy khi đợt sửa code đã hoàn tất. Repo đang có thay đổi chưa commit; không lấy commit cũ rồi tưởng chứa các file Docker/CMS mới.

```powershell
git status --short --branch
git diff --stat
git diff

npm ci
npm run lint
npm run typecheck
npm test
npm run test:cms
npm run build

npx playwright install chromium
$env:CHROMIUM_EXECUTABLE_PATH = node -e "console.log(require('playwright').chromium.executablePath())"
npm run verify:ui
npm run verify:tour-import
npm run verify:cms
```

Chỉ tiếp tục khi mọi kiểm tra đạt. Không coi lỗi xoá mềm hoặc các sửa UI còn dang dở là đã nghiệm thu.
Review trước khi stage. Lệnh dưới lấy source, infra và tài liệu vận hành; cố ý không tự stage `docs/TRAVEL-MOTION-PLAN.md`.

```powershell
if ((git branch --show-current) -ne "main") {
  throw "Đang ở nhánh khác main. Dừng để review/merge đúng quy trình, không tự checkout."
}

git add -- src scripts tests .github deploy Dockerfile compose.yml .dockerignore .gitattributes .env.example .env.production.example .gitignore next.config.ts package.json package-lock.json README.md docs/admin-roadmap.md docs/architecture.md docs/CMS-OWNER-GUIDE.md docs/IMPLEMENTATION-2026-10.md docs/VPS-DEPLOY.md docs/VPS-FIRST-DEPLOY.md
git diff --cached --stat
git diff --cached --check
git diff --cached
```

Kiểm tra cả các file đã được stage từ trước. Không commit DB, uploads, secrets hoặc bundle.
Sau khi review xong mới chạy:

```powershell
git commit -m "Prepare SEA TRIP CMS and VPS deployment"
git fetch origin
git merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) {
  throw "Remote main có commit chưa có ở local. Dừng để đối chiếu, không force push."
}
```

Giữ deploy tắt trong lần push chuẩn bị:

```powershell
gh variable set DEPLOY_ENABLED --repo $taskRepo --body "false"
if ($LASTEXITCODE -ne 0) { throw "Không đặt được biến deploy; dừng." }
git push origin main
if ($LASTEXITCODE -ne 0) { throw "Push thất bại; không tiếp tục deploy." }

git fetch origin main
$taskSha = (git rev-parse HEAD).Trim()
$taskRemoteLine = git ls-remote origin refs/heads/main
if ($LASTEXITCODE -ne 0 -or !$taskRemoteLine) { throw "Không đọc được remote main." }
$taskRemoteSha = ($taskRemoteLine -split '\s+')[0]
if ($taskSha -ne $taskRemoteSha) { throw "SHA local/remote không trùng." }
git ls-tree -r --name-only $taskSha Dockerfile compose.yml scripts/deploy/deploy.sh .github/workflows/ci-deploy.yml
```

Nếu main có branch protection, dùng PR và merge sau CI; sau đó fetch và dùng SHA của `origin/main` cho các bước dưới.

## 5. Deploy lần đầu bằng đúng SHA — PowerShell rồi Bash

Chờ job `check` của commit main ở bước 4 đạt trước. Xem:

```powershell
gh run list --repo $taskRepo --workflow ci-deploy.yml --branch main --limit 5
# Thay ID tương ứng với SHA đã chọn
gh run view THAY_RUN_ID --repo $taskRepo

$taskSha = (git rev-parse origin/main).Trim()
$taskArchive = Join-Path $env:TEMP "seatrip-$taskSha.tar.gz"
$taskDeployScript = Join-Path $env:TEMP "seatrip-deploy-$taskSha.sh"

git archive --format=tar.gz --output="$taskArchive" $taskSha
if ($LASTEXITCODE -ne 0) { throw "Không tạo được archive." }

# Xuất bản script từ chính commit, giữ UTF-8 không BOM và LF
$taskScriptText = git show "${taskSha}:scripts/deploy/deploy.sh"
if ($LASTEXITCODE -ne 0) { throw "Commit thiếu script deploy." }
[System.IO.File]::WriteAllText($taskDeployScript, (($taskScriptText -join "`n") + "`n"), [System.Text.UTF8Encoding]::new($false))

scp -P $taskSshPort "$taskArchive" "${taskUser}@${taskHost}:${taskAppDir}/incoming-$taskSha.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "Transfer archive thất bại." }
scp -P $taskSshPort "$taskDeployScript" "${taskUser}@${taskHost}:${taskAppDir}/deploy-$taskSha.sh"
if ($LASTEXITCODE -ne 0) { throw "Transfer script thất bại." }
ssh -p $taskSshPort "${taskUser}@${taskHost}" "bash '$taskAppDir/deploy-$taskSha.sh' '$taskSha' '$taskAppDir'"
```

Xác minh fingerprint SSH trước khi chấp nhận host lần đầu (bước 8).
Script chỉ chạy service app, không proxy. Không dùng `--profile proxy` trên VPS chung.
Nếu release cùng SHA đã tồn tại do lần thử lỗi: kiểm tra log/trạng thái trước, không xoá dữ liệu hoặc chạy reset/clean để thử lại.

Trên VPS, sau khi script thành công:

```bash
cd /opt/seatrip/current
export APP_ENV_FILE=/opt/seatrip/.env.production
docker compose --env-file "$APP_ENV_FILE" ps
docker compose --env-file "$APP_ENV_FILE" logs --tail=100 app
curl -fsS http://127.0.0.1:3080/api/health
cat /opt/seatrip/current-sha
```

JSON phải có status=ok, database=connected và SHA đúng. Chưa có proxy thì URL HTTPS chưa hoạt động.

## 6. Proxy/HTTPS — chỉ chọn nhánh đúng với VPS

Không cài proxy thứ hai. Không sửa/xoá virtual host SDT. Không mở cổng 3080 ra Internet.
Các cấu hình dưới giả định proxy chạy TRỰC TIẾP TRÊN HOST, kết nối loopback 3080.
Chưa có thông tin proxy thực tế thì dừng ở đây và cung cấp output kiểm tra bước 2.

### A. Caddy trên host, Caddyfile là /etc/caddy/Caddyfile

Xác minh đường dẫn từ service hiện tại trước. Sao lưu rồi thêm một block domain riêng, không thay toàn bộ file:

```bash
sudo systemctl cat caddy
sudo cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.backup-seatrip-$(date +%Y%m%d%H%M%S)"
sudo nano /etc/caddy/Caddyfile
```

Thêm:

```caddyfile
THAY_TEN.duckdns.org {
    request_body {
        max_size 11MB
    }
    reverse_proxy 127.0.0.1:3080 {
        header_up X-Forwarded-For {remote_host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

Validate trước; chỉ reload nếu đạt. Không restart:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

Caddy tự cấp HTTPS khi DNS/firewall và cấu hình TLS hiện tại cho phép. Giữ nguyên cấu hình global hiện có.

### B. Nginx trên host kiểu Debian/Ubuntu sites-enabled

Chỉ dùng khi Nginx hiện tại thực sự include `sites-enabled/*`, và Certbot đã có sẵn.

```bash
sudo nginx -t
command -v certbot
sudo test ! -e /etc/nginx/sites-available/seatrip
sudo test ! -e /etc/nginx/sites-enabled/seatrip
```

Nếu file đã tồn tại, kiểm tra nội dung thay vì ghi đè. Tạo file mới:

```bash
sudo nano /etc/nginx/sites-available/seatrip
```

Nội dung:

```nginx
server {
    listen 80;
    server_name THAY_TEN.duckdns.org;
    client_max_body_size 11m;
    location / {
        proxy_pass http://127.0.0.1:3080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Kích hoạt và cấp chứng chỉ bằng webroot, không để Certbot sửa các site khác:

```bash
sudo install -d -m 755 /var/www/seatrip-acme
```

Thêm block dưới vào trong `server { ... }` ở trên, trước location `/`:

```nginx
location ^~ /.well-known/acme-challenge/ {
    root /var/www/seatrip-acme;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/seatrip /etc/nginx/sites-enabled/seatrip
sudo nginx -t && sudo systemctl reload nginx

sudo certbot certonly --webroot -w /var/www/seatrip-acme \
  -d THAY_TEN.duckdns.org --email THAY_EMAIL --agree-tos --non-interactive
```

Sau khi cấp thành công, thêm vào cùng server (giữ listen 80 để renewal webroot hoạt động):

```nginx
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/THAY_TEN.duckdns.org/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/THAY_TEN.duckdns.org/privkey.pem;
```

Trong location `/` thêm `if ($scheme = http) { return 301 https://$host$request_uri; }`.

```bash
sudo nginx -t && sudo systemctl reload nginx
systemctl list-timers --all | grep -i certbot
sudo certbot renew --dry-run --cert-name THAY_TEN.duckdns.org
```

Cần bảo đảm Certbot có deploy hook reload Nginx sau renewal thành công; nếu chưa có, cấu hình theo cơ chế Certbot sẵn có trên VPS, không tạo cron trùng.
Nếu chưa có Certbot, dừng để chọn cách cài theo OS; không dùng standalone chiếm 80 hoặc dừng Nginx.

### C. Proxy chạy trong Docker hoặc có CDN/proxy nhiều tầng

Không áp dụng A/B. `127.0.0.1` trong container proxy không phải localhost của host.
Cần xem network/mount/config hiện tại để thêm upstream bằng network riêng hoặc cơ chế host phù hợp.
Không tự publish app ra `0.0.0.0`, không đổi network của SDT khi chưa kiểm tra.
Nếu có CDN phía trước, cần cấu hình trusted proxy để lấy IP thật an toàn.

Sau khi cấu hình proxy đúng, kiểm tra cả domain SEA TRIP và các domain SDT trước/sau reload:

```bash
curl -fsS https://THAY_TEN.duckdns.org/api/health
curl -I https://THAY_TEN.duckdns.org/admin
```

## 7. Tạo admin — Bash trên VPS

```bash
cd /opt/seatrip/current
export APP_ENV_FILE=/opt/seatrip/.env.production

read -r -p 'Admin username: ' ADMIN_USERNAME
read -r -s -p 'Admin password (14–200 ký tự): ' ADMIN_PASSWORD
echo
export ADMIN_USERNAME ADMIN_PASSWORD

docker compose --env-file "$APP_ENV_FILE" exec -T \
  -e ADMIN_USERNAME -e ADMIN_PASSWORD \
  app node scripts/admin.mjs bootstrap

unset ADMIN_USERNAME ADMIN_PASSWORD
```

Nếu đã có admin: dùng `reset` thay `bootstrap`. Reset thu hồi mọi phiên cũ.
Mở `https://THAY_TEN.duckdns.org/admin`, đăng nhập và đổi mật khẩu nếu cần.
Tài khoản/data local không tự chuyển sang VPS. Không ghi đè DB production bằng DB thử.

## 8. Tạo SSH key riêng cho Actions — PowerShell

```powershell
$taskKeyPath = Join-Path $env:USERPROFILE ".ssh\seatrip_actions"
New-Item -ItemType Directory -Force (Split-Path $taskKeyPath) | Out-Null
if (Test-Path $taskKeyPath) { throw "Key đã tồn tại: kiểm tra trước, không ghi đè." }
ssh-keygen -t ed25519 -f "$taskKeyPath" -C "seatrip-github-actions"
```

Với workflow hiện tại, key máy CI cần không có passphrase (Enter trống hai lần). Bảo vệ key và chỉ dùng cho repo này.

```powershell
scp -P $taskSshPort "${taskKeyPath}.pub" "${taskUser}@${taskHost}:seatrip-actions.pub"
ssh -p $taskSshPort "${taskUser}@${taskHost}"
```

Trên VPS, bằng đúng user deploy:

```bash
install -d -m 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
if ! grep -qxF "$(cat ~/seatrip-actions.pub)" ~/.ssh/authorized_keys; then
  printf '\n' >> ~/.ssh/authorized_keys
  cat ~/seatrip-actions.pub >> ~/.ssh/authorized_keys
fi
```

Qua console tin cậy của nhà cung cấp VPS, xem fingerprint host key:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Trên PowerShell, lấy host key và kiểm tra fingerprint khớp kết quả console:

```powershell
$taskKnownHosts = Join-Path $env:TEMP "seatrip-known-hosts"
$taskHostKeys = ssh-keyscan -p $taskSshPort -t ed25519 $taskHost
if ($LASTEXITCODE -ne 0 -or !$taskHostKeys) { throw "Không lấy được host key." }
[System.IO.File]::WriteAllLines($taskKnownHosts, [string[]]$taskHostKeys, [System.Text.UTF8Encoding]::new($false))
ssh-keygen -lf "$taskKnownHosts"
```

Chỉ tiếp tục nếu fingerprint đã khớp. Không tin riêng kết quả ssh-keyscan.

```powershell
ssh -i "$taskKeyPath" -p $taskSshPort `
  -o "UserKnownHostsFile=$taskKnownHosts" -o StrictHostKeyChecking=yes -o BatchMode=yes `
  "${taskUser}@${taskHost}" "docker version --format '{{.Server.Version}}'"
```

## 9. Đưa Secrets/Variables vào GitHub — PowerShell

```powershell
gh api --method PUT "repos/$taskRepo/environments/production"

gh secret set VPS_HOST --repo $taskRepo --body "$taskHost"
gh secret set VPS_USER --repo $taskRepo --body "$taskUser"
gh secret set VPS_PORT --repo $taskRepo --body "$taskSshPort"

Get-Content -Raw "$taskKeyPath" | gh secret set VPS_SSH_KEY --repo $taskRepo
Get-Content -Raw "$taskKnownHosts" | gh secret set VPS_KNOWN_HOSTS --repo $taskRepo

gh variable set VPS_APP_DIR --repo $taskRepo --body "$taskAppDir"
gh variable set PROD_HEALTH_URL --repo $taskRepo --body "https://$taskDomain/api/health"
gh variable set DEPLOY_ENABLED --repo $taskRepo --body "false"

gh secret list --repo $taskRepo
gh variable list --repo $taskRepo
```

Kiểm tra từng lệnh thành công. Đặt DEPLOY_ENABLED ở cấp repository vì job dùng biến này trong điều kiện trước khi vào environment.
Đừng tạo Environment Secret/Variable cùng tên nhưng giá trị khác ở environment production.
Không paste private key/token/.env vào chat. Key chỉ đi từ máy bạn tới GitHub Secrets.

## 10. Bật tự động deploy — PowerShell

Chỉ bật sau khi manual deploy, HTTPS, admin, upload, tư vấn và backup đã được kiểm tra.
Lần deploy tay đã tạo release của SHA hiện tại. Không dispatch lại cùng SHA vì script sẽ từ chối release đã tồn tại.

```powershell
gh variable set DEPLOY_ENABLED --repo $taskRepo --body "true"
```

Từ commit main TIẾP THEO, Actions tự chạy test/build/deploy. Không cần commit rỗng chỉ để thử; dùng thay đổi thực đã review.
Với một commit main mới chưa từng deploy và workflow đã có trên main, có thể dispatch:

```powershell
gh workflow run ci-deploy.yml --repo $taskRepo --ref main
gh run list --repo $taskRepo --workflow ci-deploy.yml --branch main --limit 5
gh run watch THAY_RUN_ID --repo $taskRepo --exit-status
```

Nếu push main đã khởi động workflow thì không dispatch thêm lượt trùng SHA.

Đối chiếu release sau mỗi lần:

```powershell
git fetch origin main
$taskExpectedSha = (git rev-parse origin/main).Trim()
$taskHealth = Invoke-RestMethod "https://$taskDomain/api/health"
if ($taskHealth.status -ne "ok" -or $taskHealth.database -ne "connected" -or $taskHealth.sha -ne $taskExpectedSha) {
  throw "Health/SHA chưa đạt, không xác nhận deploy thành công."
}
"Health và SHA khớp: $taskExpectedSha"
```

Nếu main đang có commit mới hơn release vừa xong, chờ lượt deploy mới nhất rồi đối chiếu lại.

## 11. Xem log, backup và xử lý lỗi — Bash

```bash
cd /opt/seatrip/current
export APP_ENV_FILE=/opt/seatrip/.env.production
docker compose --env-file "$APP_ENV_FILE" ps
docker compose --env-file "$APP_ENV_FILE" logs --tail=200 app
cat /opt/seatrip/current-image
cat /opt/seatrip/current-sha
```

Backup chuẩn (SQLite + uploads nhất quán, mã hóa, timer ngày 1 & 16 lúc 03:00
Asia/Bangkok). Cài một lần rồi dùng lệnh cố định:

```bash
cd /opt/seatrip/current
sudo bash scripts/backup/manage.sh install --app-dir /opt/seatrip

sudo /opt/seatrip/bin/backup/manage.sh check
sudo systemctl list-timers 'seatrip-backup*' --all
sudo /opt/seatrip/bin/backup/manage.sh run
sudo /opt/seatrip/bin/backup/manage.sh list
sudo /opt/seatrip/bin/backup/manage.sh verify <backup-id>
sudo /opt/seatrip/bin/backup/manage.sh restore-test <backup-id>
```

Giữ khóa `/opt/seatrip/.backup/archive.key` ở nơi an toàn ngoài VPS. Chưa có
`BACKUP_OFFSITE_DIR` thì trạng thái là “chưa cấu hình offsite”. Quy trình phục
hồi DB, reset/chuyển VPS, lấy lại `.env.production` + `LEAD_ENCRYPTION_KEY`,
SSH/GitHub, DNS/HTTPS và xác minh health/SHA: `docs/BACKUP-RESTORE.md`.

Script deploy tự backup trước cập nhật khi có release trước; các file
`pre-<sha>.sqlite`/`media-<sha>` được giữ nguyên và không bị retention xóa.

Rollback tự động chỉ áp dụng lúc khởi động/health nội bộ lỗi và có image trước.
Lỗi HTTPS công khai không tự rollback. Không tự phục hồi DB cũ vì có thể mất lead mới.
Nếu cần rollback tay, đọc VPS-DEPLOY.md và chọn đúng image/release tương thích schema; không đoán SHA.

Không có cam kết zero-downtime cho app SEA TRIP một instance. Không restart/dừng ứng dụng SDT để xử lý SEA TRIP.
