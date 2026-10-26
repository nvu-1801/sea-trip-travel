# SAO LƯU & PHỤC HỒI — SEA TRIP TRAVEL

Tài liệu vận hành cho VPS chạy Docker Compose + SQLite WAL + uploads trong volume
`seatrip_content`. Mọi lệnh dưới đây chạy trên **host VPS**, không chạy trong
container web.

> Backup nằm cùng VPS **không** bảo vệ trước việc reset VPS, mất ổ đĩa hoặc
> nhà cung cấp xóa máy. Phải sao chép archive đã mã hóa và khóa ra ngoài VPS.

## 1. Thành phần

| Thành phần | Vị trí | Ghi chú |
| --- | --- | --- |
| Công cụ | `/opt/seatrip/bin/backup/manage.sh` | Bản cài cố định, không phụ thuộc release cũ |
| Cấu hình | `/opt/seatrip/.backup.env` (0600) | Không chứa mật khẩu/khóa |
| Khóa archive | `/opt/seatrip/.backup/archive.key` (0640 root:1001) | **Phải sao lưu offline** |
| Bản sao env cho helper | `/opt/seatrip/.backup/env.production` (0640 root:1001) | Chỉ helper đọc; app không mount thư mục này |
| Bản backup | `/opt/seatrip/backups/` | 2770, app chỉ đọc qua mount `:ro` |
| Log/trạng thái | `/opt/seatrip/backups/logs/`, `state.json` | Không chứa secrets/dữ liệu khách |
| Helper image | `seatrip-backup:1` | Container riêng, không network, không Docker socket |
| Timer | `seatrip-backup.timer`, `seatrip-backup-worker.timer` | Ngày 1 & 16 · 03:00 Asia/Bangkok |

Mỗi bản backup gồm:

```text
<id>.seatar            # tar.gz đã mã hóa AES-256-GCM
<id>.manifest.json     # metadata công khai, không chứa secrets
<id>.sha256            # checksum file .seatar
logs/<id>.log           # tiến trình, dung lượng, lỗi (đã khử secrets)
```

Trong archive:

```text
db.sqlite               # VACUUM INTO snapshot + integrity_check + foreign_key_check
uploads.tar             # toàn bộ uploads
config/env.production   # cấu hình runtime (được mã hóa cùng archive)
manifest.json           # format version, thời gian, APP_SHA, checksum, số bản ghi
RESTORE.txt
```

## 2. Cài đặt lần đầu

Điều kiện: Docker Engine + Compose v2, `bash`, `flock`, `tar`, `openssl`, quyền
root/sudo. Không cần mở port, không cần Docker socket cho web app.

```bash
cd /opt/seatrip/current
sudo bash scripts/backup/manage.sh install --app-dir /opt/seatrip
```

`install` thực hiện idempotent:

1. Tạo `$APP_DIR/.backup.env` nếu chưa có; không ghi đè cấu hình đang dùng.
2. Tạo khóa `archive.key` nếu chưa có và in **đường dẫn** (không in khóa) —
   sao chép khóa này ra ngoài VPS ngay.
3. Copy tool sang `/opt/seatrip/bin/backup`, build `seatrip-backup:1`.
4. Cài/cập nhật 2 timer systemd, `enable --now`.
5. **Không** tạo backup và **không** sửa dữ liệu production.

Kiểm tra (chỉ đọc):

```bash
sudo /opt/seatrip/bin/backup/manage.sh check
sudo systemctl list-timers 'seatrip-backup*' --all
systemd-analyze calendar '*-*-01,16 03:00:00 Asia/Bangkok'
```

## 3. Lịch, retention và mức mất dữ liệu

- Chạy ngày **01 và 16** hằng tháng lúc **03:00 Asia/Bangkok**, `Persistent=true`
  nên máy bật lại sau giờ hẹn sẽ chạy bù.
- Giữ tối đa **3** bản `auto` đã `done + verified`.
- Chỉ bản `auto` mới bị retention xóa. Backup **trước deploy** (`pre-*.sqlite`,
  `media-*`), bản `manual` và mọi file cũ trong `/opt/seatrip/backups` **không bị
  xóa**.
- Nếu bản mới thất bại/không verify được: không xóa bản cũ, không cập nhật
  “thành công”.
- **RPO tối đa lý thuyết:** ~15,5 ngày giữa hai lần chạy thành công. Nếu một lần
  lỗi, RPO tính từ `lastSuccess` (trang Sức khỏe/Bảo mật hiển thị). Muốn giảm RPO,
  đổi `BACKUP_SCHEDULE` (ví dụ hằng ngày) và giữ các mục khác.
- **RTO:** chỉ ghi sau khi chạy `restore-test` và đọc `durationMs` thực đo. Không
  dùng con số ước lượng trong tài liệu này.

## 4. Lệnh vận hành

```bash
# chỉ đọc: timer, lịch, bản gần nhất, dung lượng, retention, offsite, restore-test
sudo /opt/seatrip/bin/backup/manage.sh check

# backup thủ công (auto/manual đều được; manual không vào retention)
sudo /opt/seatrip/bin/backup/manage.sh run --kind manual

# danh sách
sudo /opt/seatrip/bin/backup/manage.sh list

# kiểm tra checksum + archive + SQLite trong thư mục tạm
sudo /opt/seatrip/bin/backup/manage.sh verify <backup-id>

# phục hồi vào volume/container thử độc lập (không đụng production)
sudo /opt/seatrip/bin/backup/manage.sh restore-test <backup-id>

# giải mã ra thư mục để tự phục hồi theo kế hoạch (cẩn thận: có env secrets)
sudo /opt/seatrip/bin/backup/manage.sh extract <backup-id> /opt/seatrip/restore-<id>
```

`run` tự kiểm tra dung lượng, tạo snapshot nhất quán, đối chiếu file uploads mà
DB tham chiếu, kiểm tra integrity, mã hóa và chỉ sau đó ghi manifest `done`.
Chạy trùng (timer + admin) bị chặn bằng `flock` trên `/opt/seatrip/backup.lock`.

### 4.1 Kiểm tra integrity khác với thử phục hồi

- `integrity_check` chỉ chứng minh **trang SQLite** không hỏng và khóa ngoại hợp
  lệ. Nó không chứng minh app khởi động được, uploads đủ, hay dữ liệu khách đọc
  được.
- `restore-test` mới chứng minh: giải mã, phục hồi vào volume tạm, app boot,
  `/api/health` báo `ok` + database `connected`, đếm bản ghi và kiểm tra file ảnh.
  Container thử dùng `--network none`, `MAIL_TRANSPORT=log`, không publish port.

## 5. Nhất quán SQLite ↔ uploads

Không copy hai thư mục độc lập:

1. Helper tạo marker heartbeat `/app/data/.backup-active`.
2. Route upload/xóa media trả **409** trong lúc marker còn hiệu lực (2 phút kể từ
   heartbeat cuối), nên không có file bị xóa/ghi giữa snapshot và tar.
3. Snapshot SQLite bằng `VACUUM INTO` (không copy file đang ghi).
4. Tar uploads, kiểm tra mọi `media.name` và mọi `/api/media/...` trong DB
   snapshot đều có trong tar, đúng kích thước.
5. Nếu thiếu file → bản backup thất bại, không đánh dấu thành công.
6. Marker được xóa trong `finally`; nếu worker chết, app tự bỏ qua marker cũ sau
   2 phút.

## 6. Cấu hình offsite

Mặc định **chưa cấu hình offsite**. Không tự chọn dịch vụ, không phát sinh chi
phí.

Cách 1 — ổ ngoài/NFS đã mount trên VPS:

```bash
sudo mkdir -p /mnt/offsite/seatrip
sudo chown "$USER":1001 /mnt/offsite/seatrip
sudo chmod 2770 /mnt/offsite/seatrip
sudoedit /opt/seatrip/.backup.env
# BACKUP_OFFSITE_DIR=/mnt/offsite/seatrip
```

Cách 2 — tự đồng bộ bằng công cụ của bạn: giữ `BACKUP_OFFSITE_DIR=` trống, dùng
`rsync`/rclone bên ngoài để chép `.seatar` + `.sha256` + `.manifest.json`; trạng
thái trong SEA TRIP sẽ vẫn là “chưa cấu hình offsite”, đúng như thực tế.

Sau khi đặt biến, chạy `manage.sh run` để lần sau copy + xác minh SHA-256 tại
đích. `check` và trang Bảo mật hiển thị `verified` / `failed`.

**Luôn** sao lưu `archive.key` ra ngoài VPS (password manager/ổ offline). File
`.seatar` bị lộ mà không có khóa thì không đọc được; mất khóa thì backup cũng
không phục hồi được.

## 7. Trang quản trị

**Bảo mật → Sao lưu & phục hồi**:

- Nút tạo backup ghi một job vào DB; worker systemd (mỗi phút) nhận và chạy.
- Mỗi thao tác tạo/tải yêu cầu **nhập lại mật khẩu**, có CSRF, kiểm tra quyền,
  giới hạn tần suất (3 backup/giờ, 20 lượt tải/giờ, 10 lần xác thực/15 phút).
- Tải về là file `.seatar` đã mã hóa; không có secrets dạng rõ.
- Không có nút khôi phục đè production. Khôi phục chỉ qua CLI + tài liệu này.
- Web app **không** có Docker socket, không root, không đọc `.backup.env`,
  `archive.key` hay `.env.production`. Chỉ mount read-only thư mục backups.
- Job treo quá 2 giờ bị worker đánh dấu `failed`; bấm lặp trả 409.

**Sức khỏe website** (khi bản phát hành có trang này) hiển thị thêm card Sao lưu:
lần thành công, tuổi bản backup, retention, offsite, verify, thời lượng
restore-test gần nhất và cảnh báo. Trong bản backup-only hiện tại, mục **Bảo mật**
là nơi duy nhất hiển thị trạng thái và thao tác sao lưu.

## 8. Phục hồi

### 8.1 DB hỏng nhưng VPS còn tốt

```bash
sudo /opt/seatrip/bin/backup/manage.sh check
sudo /opt/seatrip/bin/backup/manage.sh verify <backup-id>
sudo /opt/seatrip/bin/backup/manage.sh restore-test <backup-id>
```

Chỉ sau khi `restore-test` đạt mới phục hồi production:

```bash
cd /opt/seatrip/current
export APP_ENV_FILE=/opt/seatrip/.env.production

# 1. Dừng app (không dừng proxy/website khác)
docker compose --env-file "$APP_ENV_FILE" stop app

# 2. Giữ trạng thái hiện tại để rollback
sudo mkdir -p /opt/seatrip/backups/manual-rollback-$(date -u +%Y%m%dT%H%M%SZ)
sudo cp -a /opt/seatrip/current/.env.production /opt/seatrip/backups/manual-rollback-*/
# (tuỳ chọn) snapshot DB hiện tại trước khi thay

# 3. Giải mã bản đã verify
sudo /opt/seatrip/bin/backup/manage.sh extract <backup-id> /opt/seatrip/restore-<id>
sudo chmod 700 /opt/seatrip/restore-<id>

# 4. Ghi DB + uploads vào volume, xóa WAL cũ, đặt owner 1001
sudo docker run --rm --user 0:0 \
  -v seatrip_content:/data -v /opt/seatrip/restore-<id>:/src:ro \
  --entrypoint sh seatrip-backup:1 -c '
    set -e
    rm -f /data/seatrip.sqlite /data/seatrip.sqlite-wal /data/seatrip.sqlite-shm
    cp /src/db.sqlite /data/seatrip.sqlite
    rm -rf /data/uploads && mkdir -p /data/uploads
    tar -C /data/uploads -xf /src/uploads.tar
    chown -R 1001:1001 /data
  '

# 5. Khôi phục cấu hình nếu cần (file này chứa secrets)
sudo install -m 600 -o "$USER" -g "$USER" /opt/seatrip/restore-<id>/config/env.production /opt/seatrip/.env.production

# 6. Khởi động và xác minh
docker compose --env-file "$APP_ENV_FILE" up -d --no-build --wait app
curl -fsS http://127.0.0.1:3080/api/health
cat /opt/seatrip/current-sha
```

Mở admin kiểm tra lead/ảnh. Chỉ xóa `restore-<id>` khi đã xác nhận; thư mục này
chứa env/khóa nhạy cảm.

### 8.2 Reset sạch VPS / chuyển VPS mới

1. Tạo VPS mới, cài Docker Engine + Compose, tạo user deploy, `/opt/seatrip`,
   `chmod 600 .env.production`.
2. Trên VPS cũ (nếu còn): lấy `.seatar`, `.sha256`, `.manifest.json` và
   **archive.key** từ nơi lưu offsite.
3. Trên VPS mới: cài repo/tool, `manage.sh install`, copy backup vào
   `/opt/seatrip/backups`, copy `archive.key` vào `/opt/seatrip/.backup/archive.key`
   (0640 root:1001), rồi:
   ```bash
   sudo /opt/seatrip/bin/backup/manage.sh list
   sudo /opt/seatrip/bin/backup/manage.sh verify <id>
   sudo /opt/seatrip/bin/backup/manage.sh extract <id> /opt/seatrip/restore-<id>
   ```
4. Tạo volume `seatrip_content` rỗng và ghi DB/uploads như mục 8.1 bước 4.
5. Lấy `.env.production` từ `restore-<id>/config/env.production`, đặt quyền 600.
   **Giữ đúng `LEAD_ENCRYPTION_KEY`** — sai khóa thì lead cũ không đọc được.
6. Deploy đúng SHA qua GitHub Actions (Secrets/Variables bên dưới) hoặc chạy
   release tương thích schema; không dùng DB thử để đè production.
7. DNS: trỏ domain về IPv4 VPS mới (DuckDNS/registrar). Không để IPv6 sai.
8. HTTPS: dùng Caddy/Nginx hiện có trên VPS; không mở thêm proxy chiếm 80/443.
   Caddy lấy TLS qua `SITE_DOMAIN`/`ACME_EMAIL`; Nginx cần cert hợp lệ.
9. GitHub: cập nhật secret `VPS_HOST`, `VPS_PORT`, `VPS_SSH_KEY`,
   `VPS_KNOWN_HOSTS` (fingerprint xác minh qua console nhà cung cấp), variable
   `VPS_APP_DIR`, `PROD_HEALTH_URL`; bật `DEPLOY_ENABLED=true` sau khi kiểm tra.
10. Xác minh: `curl -fsS https://<domain>/api/health` phải có
    `status="ok"`, `database="connected"`, `sha` đúng commit đang deploy.

### 8.3 Chỉ hỏng cấu hình/khóa

`restore-<id>/config/env.production` (sau khi giải mã) chứa cấu hình runtime đã
backup. So sánh với file hiện tại, không ghi đè mù. Nếu mất `LEAD_ENCRYPTION_KEY`
nhưng còn `.env` trong backup thì lấy lại từ đây; nếu mất cả backup cấu hình thì
dữ liệu lead đã mã hóa **không thể giải mã**, kể cả khi còn DB.

## 9. Vận hành & xử lý sự cố

| Hiện tượng | Kiểm tra / xử lý |
| --- | --- |
| `check` báo chưa cài timer | `sudo systemctl status seatrip-backup.timer`; chạy lại `install` |
| Lệnh run báo đang chạy | Có backup/restore khác giữ `flock`; đợi hoặc xem `ps aux | grep manage.sh` |
| Thiếu dung lượng | `df -h /opt/seatrip/backups`; giải phóng bản manual cũ, không xóa bản auto cuối |
| Job admin mãi “Đang chờ” | `systemctl status seatrip-backup-worker.timer`; `journalctl -u seatrip-backup-worker -n 50` |
| Upload/xóa ảnh trả 409 | Đang backup (marker); thử lại sau 1–2 phút. Nếu quá 2 phút, marker cũ tự hết hiệu lực |
| `verify` báo sai khóa/sửa file | Sai `archive.key` hoặc file hỏng; thử bản khác, không dùng bản lỗi |
| Offsite “failed” | Kiểm tra mount/quyền/đầy đĩa; sửa rồi chạy `run` lại |
| Không thấy dữ liệu sau restore | Kiểm tra `LEAD_ENCRYPTION_KEY`, đúng volume, đã xóa WAL cũ chưa |

Log không chứa mật khẩu/khóa/nội dung khách. Khi cần gửi log cho hỗ trợ, vẫn
kiểm tra lại trước khi chia sẻ.

## 10. Giới hạn đã biết

- Một VPS, một SQLite: không chống mất VPS; cần offsite.
- Không phải HA/zero-downtime.
- `restore-test` đo trên máy hiện tại; RTO production có thể khác.
- Offsite chỉ hỗ trợ thư mục đã mount (ổ ngoài/NFS). Chưa tự cấu hình cloud.
- Chưa có nút khôi phục trên web (cố ý).
