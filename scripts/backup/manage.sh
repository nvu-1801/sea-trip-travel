#!/usr/bin/env bash
# SEA TRIP backup operator CLI. Runs on the VPS host, never inside the web app.
# Commands: check | install | run | list | verify <id> | restore-test <id>
# Extra:    worker (systemd) | extract <id> <dir>
set -Eeuo pipefail
umask 027

VERSION="1"
DEFAULT_APP_DIR="/opt/seatrip"
DEFAULT_VOLUME="seatrip_content"
DEFAULT_GID="1001"
DEFAULT_IMAGE="seatrip-backup:1"
DEFAULT_KEEP="3"
DEFAULT_TZ="Asia/Bangkok"
DEFAULT_SCHEDULE="*-*-01,16 03:00:00"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${BACKUP_APP_DIR:-$DEFAULT_APP_DIR}"
CONFIG_FILE="${BACKUP_CONFIG:-}"
BACKUP_DIR=""
VOLUME="$DEFAULT_VOLUME"
BACKUP_GID="$DEFAULT_GID"
HELPER_IMAGE="$DEFAULT_IMAGE"
KEEP_AUTO="$DEFAULT_KEEP"
MIN_FREE_BYTES="2147483648"
TIMEZONE="$DEFAULT_TZ"
SCHEDULE="$DEFAULT_SCHEDULE"
OFFSITE_DIR=""
LOCK_FILE=""
KEY_FILE=""
ENV_COPY=""
OWNER="root"

say() { printf '%s\n' "$*"; }
fail() { printf 'LỖI: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Dùng: manage.sh <lệnh> [tham số]

  check                         Chỉ đọc: timer, lịch, bản gần nhất, dung lượng, retention, offsite
  install [--app-dir DIR]       Cài/cập nhật service + timer (idempotent, không chạy backup)
  run [--kind auto|manual|predeploy]
                                Tạo backup, verify trước khi đánh dấu thành công
  list                          Liệt kê ID/trạng thái các bản backup
  verify <backup-id>            Kiểm tra checksum, archive và SQLite trong thư mục tạm
  restore-test <backup-id>      Phục hồi vào volume/container thử, không đụng production
EOF
}

require_root() {
  [ "$(id -u)" = "0" ] || fail "Cần chạy bằng sudo/root (chỉ đọc cũng nên dùng sudo để đọc trạng thái)."
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Thiếu lệnh '$1'. Cài trước khi tiếp tục."
}

load_config() {
  APP_DIR="${BACKUP_APP_DIR:-${APP_DIR:-$DEFAULT_APP_DIR}}"
  CONFIG_FILE="${BACKUP_CONFIG:-$APP_DIR/.backup.env}"
  if [ -f "$CONFIG_FILE" ]; then
    # shellcheck disable=SC1090
    . "$CONFIG_FILE"
  fi
  APP_DIR="${BACKUP_APP_DIR:-${APP_DIR:-$DEFAULT_APP_DIR}}"
  BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
  VOLUME="${BACKUP_VOLUME:-$DEFAULT_VOLUME}"
  BACKUP_GID="${BACKUP_GID:-$DEFAULT_GID}"
  HELPER_IMAGE="${BACKUP_IMAGE:-$DEFAULT_IMAGE}"
  KEEP_AUTO="${BACKUP_KEEP_AUTO:-$DEFAULT_KEEP}"
  MIN_FREE_BYTES="${BACKUP_MIN_FREE_BYTES:-2147483648}"
  TIMEZONE="${BACKUP_TIMEZONE:-$DEFAULT_TZ}"
  SCHEDULE="${BACKUP_SCHEDULE:-$DEFAULT_SCHEDULE}"
  OFFSITE_DIR="${BACKUP_OFFSITE_DIR:-}"
  LOCK_FILE="$APP_DIR/backup.lock"
  KEY_FILE="$APP_DIR/.backup/archive.key"
  ENV_COPY="$APP_DIR/.backup/env.production"
  [ -n "${SUDO_USER:-}" ] && OWNER="${SUDO_USER}"
  [[ "$APP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "APP_DIR không hợp lệ"
  [[ "$BACKUP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "BACKUP_DIR không hợp lệ"
  [[ "$VOLUME" =~ ^[A-Za-z0-9._-]+$ ]] || fail "Tên volume không hợp lệ"
  [[ "$BACKUP_GID" =~ ^[0-9]+$ ]] || fail "GID không hợp lệ"
  [[ "$KEEP_AUTO" =~ ^[0-9]+$ ]] || fail "Số bản giữ lại không hợp lệ"
}

acquire_lock() {
  exec 9>"$LOCK_FILE"
  flock -n 9 || return 1
  return 0
}

sync_secrets() {
  install -d -m 0750 -o root -g "$BACKUP_GID" "$APP_DIR/.backup"
  if [ -f "$APP_DIR/.env.production" ]; then
    install -m 0640 -o root -g "$BACKUP_GID" "$APP_DIR/.env.production" "$ENV_COPY"
  fi
  if [ ! -s "$KEY_FILE" ]; then
    need_cmd openssl
    (umask 027; openssl rand -base64 32 >"$KEY_FILE")
    chown root:"$BACKUP_GID" "$KEY_FILE"
    chmod 0640 "$KEY_FILE"
    say "Đã tạo khóa mã hóa backup: $KEY_FILE"
    say "HÃY sao lưu khóa này ra ngoài VPS (password manager/ổ offline). Mất khóa = không mở được backup."
  fi
  local bytes
  bytes=$(base64 -d <"$KEY_FILE" 2>/dev/null | wc -c || true)
  [ "$bytes" = "32" ] || fail "Khóa $KEY_FILE không phải 32 byte base64"
}

ensure_dirs() {
  install -d -m 0750 -o root -g "$BACKUP_GID" "$APP_DIR/.backup"
  if [ ! -d "$BACKUP_DIR" ]; then
    install -d -m 2770 -o "$OWNER" -g "$BACKUP_GID" "$BACKUP_DIR"
  fi
  # Existing directories keep their files; only ensure group access for the app.
  chmod 2770 "$BACKUP_DIR"
  chgrp "$BACKUP_GID" "$BACKUP_DIR" 2>/dev/null || true
  install -d -m 2770 -o "$OWNER" -g "$BACKUP_GID" \
    "$BACKUP_DIR/logs" "$BACKUP_DIR/.tmp" "$BACKUP_DIR/.verify" 2>/dev/null || true
  chmod 2770 "$BACKUP_DIR/logs" "$BACKUP_DIR/.tmp" "$BACKUP_DIR/.verify" 2>/dev/null || true
  chgrp "$BACKUP_GID" "$BACKUP_DIR/logs" "$BACKUP_DIR/.tmp" "$BACKUP_DIR/.verify" 2>/dev/null || true
}

docker_mounts() {
  local mounts=(
    --volume "$VOLUME:/data"
    --volume "$BACKUP_DIR:/backups"
    --volume "$KEY_FILE:/config/archive.key:ro"
  )
  if [ -f "$ENV_COPY" ]; then
    mounts+=(--volume "$ENV_COPY:/config/env.production:ro")
  fi
  if [ -n "$OFFSITE_DIR" ]; then
    mounts+=(--volume "$OFFSITE_DIR:/offsite")
  fi
  printf '%s\n' "${mounts[@]}"
}

helper_env() {
  local envs=(
    --env "BACKUP_DIR=/backups"
    --env "BACKUP_DATA_DIR=/data"
    --env "BACKUP_KEY_FILE=/config/archive.key"
    --env "BACKUP_CONFIG_DIR=/config"
    --env "BACKUP_KEEP_AUTO=$KEEP_AUTO"
    --env "BACKUP_MIN_FREE_BYTES=$MIN_FREE_BYTES"
    --env "BACKUP_IMAGE=$HELPER_IMAGE"
  )
  if [ -n "${APP_SHA:-}" ]; then envs+=(--env "BACKUP_APP_SHA=$APP_SHA"); fi
  if [ -n "$OFFSITE_DIR" ]; then envs+=(--env "BACKUP_OFFSITE_DIR=/offsite"); fi
  printf '%s\n' "${envs[@]}"
}

app_sha() {
  if [ -s "$APP_DIR/current-sha" ]; then cat "$APP_DIR/current-sha"; fi
}

run_helper() {
  local -a mounts envs
  mapfile -t mounts < <(docker_mounts)
  mapfile -t envs < <(helper_env)
  docker run --rm --name "seatrip-backup-$$" \
    --user 1001:1001 \
    --read-only \
    --tmpfs /tmp:rw,size=256m \
    --network none \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    "${mounts[@]}" "${envs[@]}" "$HELPER_IMAGE" "$@"
}

need_image() {
  docker image inspect "$HELPER_IMAGE" >/dev/null 2>&1 \
    || fail "Chưa có image $HELPER_IMAGE. Chạy: sudo bash $SCRIPT_DIR/manage.sh install"
}

build_helper() {
  need_cmd docker
  if docker image inspect "$HELPER_IMAGE" >/dev/null 2>&1; then
    say "Image $HELPER_IMAGE đã có; cập nhật nếu scripts đổi."
  fi
  docker build -t "$HELPER_IMAGE" "$SCRIPT_DIR"
}

install_units() {
  local unit_dir="/etc/systemd/system"
  local manage="$APP_DIR/bin/backup/manage.sh"
  [ -x "$manage" ] || fail "Chưa có $manage"
  sed -e "s|@MANAGE@|$manage|g" -e "s|@APP_DIR@|$APP_DIR|g" \
    -e "s|@BACKUP_DIR@|$BACKUP_DIR|g" -e "s|@GID@|$BACKUP_GID|g" \
    "$SCRIPT_DIR/systemd/seatrip-backup.service" >"$unit_dir/seatrip-backup.service"
  sed -e "s|@MANAGE@|$manage|g" -e "s|@APP_DIR@|$APP_DIR|g" \
    -e "s|@BACKUP_DIR@|$BACKUP_DIR|g" -e "s|@GID@|$BACKUP_GID|g" \
    -e "s|@CALENDAR@|$SCHEDULE $TIMEZONE|g" \
    "$SCRIPT_DIR/systemd/seatrip-backup.timer" >"$unit_dir/seatrip-backup.timer"
  sed -e "s|@MANAGE@|$manage|g" -e "s|@APP_DIR@|$APP_DIR|g" \
    -e "s|@BACKUP_DIR@|$BACKUP_DIR|g" -e "s|@GID@|$BACKUP_GID|g" \
    "$SCRIPT_DIR/systemd/seatrip-backup-worker.service" >"$unit_dir/seatrip-backup-worker.service"
  sed -e "s|@MANAGE@|$manage|g" -e "s|@APP_DIR@|$APP_DIR|g" \
    -e "s|@BACKUP_DIR@|$BACKUP_DIR|g" -e "s|@GID@|$BACKUP_GID|g" \
    "$SCRIPT_DIR/systemd/seatrip-backup-worker.timer" >"$unit_dir/seatrip-backup-worker.timer"
  systemctl daemon-reload
  systemctl enable --now seatrip-backup.timer seatrip-backup-worker.timer >/dev/null
  say "Đã cài/cập nhật systemd timer (${SCHEDULE} ${TIMEZONE})."
}

write_config_if_missing() {
  if [ ! -f "$CONFIG_FILE" ]; then
    install -d -m 0750 "$APP_DIR/.backup"
    cat >"$CONFIG_FILE" <<EOF
# SEA TRIP backup config — không đặt mật khẩu/khóa trong file này.
APP_DIR=$APP_DIR
BACKUP_DIR=$APP_DIR/backups
BACKUP_VOLUME=$DEFAULT_VOLUME
BACKUP_GID=$DEFAULT_GID
BACKUP_KEEP_AUTO=$DEFAULT_KEEP
BACKUP_MIN_FREE_BYTES=$MIN_FREE_BYTES
BACKUP_TIMEZONE=$DEFAULT_TZ
BACKUP_SCHEDULE="$DEFAULT_SCHEDULE"
BACKUP_IMAGE=$DEFAULT_IMAGE
# Để trống = chưa cấu hình offsite. Ví dụ thư mục mount ngoài VPS:
# BACKUP_OFFSITE_DIR=/mnt/offsite/seatrip
BACKUP_OFFSITE_DIR=
EOF
    chmod 0600 "$CONFIG_FILE"
  fi
}

write_install_state() {
  local state="$BACKUP_DIR/install-state.json"
  local offsite="false"
  [ -n "$OFFSITE_DIR" ] && offsite="true"
  cat >"$state" <<EOF
{
  "formatVersion": 1,
  "toolVersion": "$VERSION",
  "installedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "appDir": "$APP_DIR",
  "backupDir": "$BACKUP_DIR",
  "schedule": "$SCHEDULE",
  "timezone": "$TIMEZONE",
  "retentionAuto": $KEEP_AUTO,
  "offsiteConfigured": $offsite,
  "encryption": "aes-256-gcm",
  "helperImage": "$HELPER_IMAGE"
}
EOF
  chown "$OWNER":"$BACKUP_GID" "$state" 2>/dev/null || true
  chmod 0640 "$state"
}

cmd_install() {
  require_root
  need_cmd docker
  need_cmd flock
  need_cmd tar
  need_cmd openssl
  local arg_backup_dir=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --app-dir) APP_DIR="$2"; shift 2 ;;
      --backup-dir) arg_backup_dir="$2"; shift 2 ;;
      --gid) BACKUP_GID="$2"; shift 2 ;;
      *) fail "Tham số không hợp lệ: $1" ;;
    esac
  done
  BACKUP_APP_DIR="$APP_DIR"
  load_config
  [ -n "$arg_backup_dir" ] && BACKUP_DIR="$arg_backup_dir"
  [[ "$APP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "APP_DIR không hợp lệ"
  [[ "$BACKUP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "BACKUP_DIR không hợp lệ"
  write_config_if_missing
  load_config
  [ -n "$arg_backup_dir" ] && BACKUP_DIR="$arg_backup_dir"
  ensure_dirs
  sync_secrets
  install -d -m 0750 -o "$OWNER" -g "$BACKUP_GID" "$APP_DIR/bin"
  local source_real target_real staging
  source_real="$(cd "$SCRIPT_DIR" && pwd -P)"
  target_real="$APP_DIR/bin/backup"
  local target_current=""
  if [ -d "$target_real" ]; then
    target_current="$(cd "$target_real" && pwd -P)"
  fi
  if [ "$source_real" != "$target_current" ]; then
    staging="$APP_DIR/bin/.backup-install-$$"
    rm -rf "$staging"
    cp -a "$SCRIPT_DIR" "$staging"
    rm -rf "$target_real"
    mv "$staging" "$target_real"
  fi
  chown -R "$OWNER":"$BACKUP_GID" "$APP_DIR/bin" 2>/dev/null || true
  chmod 0750 "$APP_DIR/bin" "$target_real" 2>/dev/null || true
  chmod 0750 "$target_real/manage.sh" 2>/dev/null || true
  build_helper
  install_units
  write_install_state
  # Preserve the state file the helper writes; install-state is separate.
  say "Đã cài đặt. Chưa tạo backup nào. Kiểm tra: sudo $target_real/manage.sh check"
  say "Cấu hình: $CONFIG_FILE (không chứa khóa). Khóa: $KEY_FILE (hãy sao lưu offline)."
}

cmd_check() {
  load_config
  [ -d "$APP_DIR" ] || fail "Không thấy $APP_DIR"
  local timer_state worker_state next backup_count free restore_test last_ok offsite
  timer_state=$(systemctl is-enabled seatrip-backup.timer 2>/dev/null || echo "chưa cài")
  worker_state=$(systemctl is-enabled seatrip-backup-worker.timer 2>/dev/null || echo "chưa cài")
  next=$(systemctl show seatrip-backup.timer -p NextElapseUSecRealtime --value 2>/dev/null || true)
  free=$(df -Pm "$BACKUP_DIR" 2>/dev/null | awk 'NR==2{print $4" MB trống"}' || echo "không đọc được")
  backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'auto-*.seatar' 2>/dev/null | wc -l)
  last_ok=$(grep -o '"finishedAt": *"[^"]*"' "$BACKUP_DIR/state.json" 2>/dev/null | tail -1 | cut -d'"' -f4 || true)
  restore_test=$(grep -o '"lastRestoreTest":[^}]*}' "$BACKUP_DIR/state.json" 2>/dev/null | tail -1 || true)
  offsite=$([ -n "$OFFSITE_DIR" ] && echo "$OFFSITE_DIR" || echo "chưa cấu hình offsite")

  say "SEA TRIP backup · check (chỉ đọc)"
  say "App dir: $APP_DIR"
  say "Backup dir: $BACKUP_DIR ($free)"
  say "Volume: $VOLUME · GID: $BACKUP_GID · retention auto: $KEEP_AUTO bản"
  say "Lịch: $SCHEDULE ($TIMEZONE) · timer: $timer_state · worker: $worker_state"
  [ -n "$next" ] && say "Lần chạy kế tiếp: $next"
  if [ -f "$KEY_FILE" ]; then
    say "Khóa mã hóa: có ($KEY_FILE)"
  else
    say "Khóa mã hóa: CHƯA CÓ"
  fi
  say "Image helper: $HELPER_IMAGE"
  say "Offsite: $offsite"
  [ -n "$last_ok" ] && say "Backup thành công gần nhất: $last_ok"
  say "Số bản auto hiện có: $backup_count"
  if [ -f "$BACKUP_DIR/state.json" ]; then
    say "Trạng thái gần nhất:"
    grep -E '"(lastAttempt|lastSuccess|lastFailure|lastVerify|offsite|lastDeleted)"|"(status|at|id|kind|bytes|error)"' "$BACKUP_DIR/state.json" | sed 's/^/  /' | head -40
  else
    say "Chưa có state.json (chưa chạy backup lần nào)."
  fi
  [ -n "$restore_test" ] && say "Lần thử phục hồi gần nhất: $restore_test"
  say "Lưu ý: backup cùng VPS không bảo vệ khỏi mất ổ đĩa/reset. Sao lưu khóa và archive ra ngoài."
}

cmd_run() {
  require_root
  load_config
  ensure_dirs
  sync_secrets
  need_image
  need_cmd flock
  if ! acquire_lock; then
    say "Một tác vụ backup khác đang chạy; bỏ qua lượt này."
    return 75
  fi
  local kind="auto"
  while [ $# -gt 0 ]; do
    case "$1" in
      --kind) kind="$2"; shift 2 ;;
      *) fail "Tham số không hợp lệ: $1" ;;
    esac
  done
  case "$kind" in auto|manual|predeploy) ;; *) fail "kind không hợp lệ" ;; esac
  APP_SHA="$(app_sha)"
  say "Bắt đầu backup $kind (SHA ${APP_SHA:-không rõ})…"
  local -a mounts envs
  mapfile -t mounts < <(docker_mounts)
  mapfile -t envs < <(helper_env)
  docker run --rm --name "seatrip-backup-run-$$" \
    --user 1001:1001 --read-only --network none \
    --tmpfs /tmp:rw,size=256m --cap-drop ALL \
    --security-opt no-new-privileges \
    "${mounts[@]}" "${envs[@]}" \
    --env "BACKUP_KIND=$kind" "$HELPER_IMAGE" run
  say "Hoàn tất. Xem: sudo $APP_DIR/bin/backup/manage.sh list"
}

cmd_worker() {
  require_root
  load_config
  ensure_dirs
  sync_secrets
  need_image || return 0
  if ! acquire_lock; then
    say "Backup khác đang chạy; worker bỏ qua."
    return 0
  fi
  APP_SHA="$(app_sha)"
  local -a mounts envs
  mapfile -t mounts < <(docker_mounts)
  mapfile -t envs < <(helper_env)
  docker run --rm --name "seatrip-backup-worker-$$" \
    --user 1001:1001 --read-only --network none \
    --tmpfs /tmp:rw,size=128m --cap-drop ALL \
    --security-opt no-new-privileges \
    "${mounts[@]}" "${envs[@]}" "$HELPER_IMAGE" worker || true
}

cmd_list() {
  load_config
  need_image || return 0
  docker run --rm --user 1001:1001 --read-only \
    --volume "$BACKUP_DIR:/backups" --env "BACKUP_DIR=/backups" \
    "$HELPER_IMAGE" list "$@"
}

cmd_verify() {
  require_root
  local id="${1:-}"
  [ -n "$id" ] || fail "Thiếu backup-id"
  load_config
  ensure_dirs
  sync_secrets
  need_image
  acquire_lock || fail "Đang có tác vụ backup khác; thử lại sau"
  APP_SHA="$(app_sha)"
  local -a verify_mounts verify_envs
  mapfile -t verify_mounts < <(docker_mounts)
  mapfile -t verify_envs < <(helper_env)
  docker run --rm --name "seatrip-backup-verify-$$" \
    --user 1001:1001 --read-only --network none \
    --tmpfs /tmp:rw,size=512m --cap-drop ALL \
    --security-opt no-new-privileges \
    "${verify_mounts[@]}" "${verify_envs[@]}" "$HELPER_IMAGE" verify "$id"
}

cmd_extract() {
  local id="${1:-}" dest="${2:-}"
  if [ -z "$id" ] || [ -z "$dest" ]; then
    fail "Dùng: extract <backup-id> <thư mục>"
  fi
  require_root
  load_config
  sync_secrets
  need_image
  install -d -m 0700 "$dest"
  chown 1001:1001 "$dest" 2>/dev/null || true
  docker run --rm --user 1001:1001 --read-only --network none \
    --volume "$BACKUP_DIR:/backups" --volume "$dest:/extract" \
    --volume "$KEY_FILE:/config/archive.key:ro" \
    --tmpfs /tmp:rw,size=256m \
    --env "BACKUP_DIR=/backups" --env "BACKUP_DATA_DIR=/data" \
    --env "BACKUP_KEY_FILE=/config/archive.key" \
    "$HELPER_IMAGE" extract "$id" /extract
}

cmd_restore_test() {
  require_root
  local id="${1:-}"
  [ -n "$id" ] || fail "Thiếu backup-id"
  load_config
  ensure_dirs
  sync_secrets
  need_image
  need_cmd docker
  local app_image=""
  [ -s "$APP_DIR/current-image" ] && app_image=$(cat "$APP_DIR/current-image")
  [ -n "$app_image" ] || fail "Không đọc được image app hiện tại ($APP_DIR/current-image)"
  docker image inspect "$app_image" >/dev/null 2>&1 || fail "Image app $app_image không tồn tại trên máy"
  acquire_lock || fail "Đang có tác vụ backup khác; thử lại sau"

  local tmp volume name envfile started ended ms partial lead_key
  tmp=$(mktemp -d "$BACKUP_DIR/.restore-${id}-XXXXXX")
  chown 1001:1001 "$tmp"
  chmod 0700 "$tmp"
  volume="seatrip-restore-test-$$"
  name="seatrip-restore-test-$$"
  envfile="$tmp/runtime.env"
  partial="false"
  started=$(date +%s%3N)
  cleanup_restore() {
    docker rm -f "$name" >/dev/null 2>&1 || true
    docker volume rm -f "$volume" >/dev/null 2>&1 || true
    rm -rf "$tmp"
  }
  trap cleanup_restore EXIT

  say "Giải mã backup $id…"
  docker run --rm --user 1001:1001 --read-only --network none \
    --volume "$BACKUP_DIR:/backups" --volume "$tmp:/extract" \
    --volume "$KEY_FILE:/config/archive.key:ro" \
    --tmpfs /tmp:rw,size=256m \
    --env "BACKUP_DIR=/backups" --env "BACKUP_DATA_DIR=/data" \
    --env "BACKUP_KEY_FILE=/config/archive.key" \
    "$HELPER_IMAGE" extract "$id" /extract

  docker volume create "$volume" >/dev/null
  docker run --rm --user 0:0 \
    --volume "$volume:/data" --volume "$tmp:/src:ro" \
    --entrypoint sh "$HELPER_IMAGE" -c '
      set -e
      cp /src/db.sqlite /data/seatrip.sqlite
      mkdir -p /data/uploads
      tar -C /data/uploads -xf /src/uploads.tar
      chown -R 1001:1001 /data
      rm -f /data/db.sqlite /data/uploads.tar
    '

  lead_key=""
  if [ -f "$tmp/config/env.production" ]; then
    lead_key=$(grep -m1 '^LEAD_ENCRYPTION_KEY=' "$tmp/config/env.production" | cut -d= -f2- | tr -d '\r\n')
  fi
  if ! printf '%s' "$lead_key" | grep -Eq '^[a-fA-F0-9]{64}$'; then
    lead_key=$(openssl rand -hex 32)
    partial="true"
    say "CẢNH BÁO: không có LEAD_ENCRYPTION_KEY trong backup cấu hình; dùng khóa tạm, chỉ kiểm tra cấu trúc."
  fi
  (umask 077; cat >"$envfile" <<EOF
CMS_ENABLED=1
LEAD_ENCRYPTION_KEY=$lead_key
MAIL_TRANSPORT=log
RELEASE_NOTICE_ENABLED=false
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
EOF
  )

  say "Khởi động app thử (không cổng public, không mạng, mail=log)…"
  docker run -d --name "$name" --network none --read-only \
    --tmpfs /tmp:rw,size=64m --tmpfs /app/.next/cache:rw,uid=1001,gid=1001,size=128m \
    --volume "$volume:/app/data" --env-file "$envfile" \
    "$app_image" >/dev/null

  local ok="false"
  for _ in $(seq 1 60); do
    if docker exec "$name" node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{const b=await r.json();if(r.ok&&b.status==='ok'&&b.database==='connected')process.exit(0);process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      ok="true"; break
    fi
    sleep 2
  done
  [ "$ok" = "true" ] || fail "App thử không đạt health (xem: docker logs $name)"

  local counts
  counts=$(docker exec "$name" node -e '
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const db = new DatabaseSync("/app/data/seatrip.sqlite", { readOnly: true });
const counts = {
  leads: Number(db.prepare("SELECT COUNT(*) n FROM leads").get().n),
  media: Number(db.prepare("SELECT COUNT(*) n FROM media").get().n),
  records: Number(db.prepare("SELECT COUNT(*) n FROM records").get().n),
};
const names = db.prepare("SELECT name FROM media").all().map((r) => r.name);
const missing = names.filter((n) => { try { return !fs.statSync("/app/data/uploads/" + n).isFile(); } catch { return true; } });
const integrity = db.prepare("PRAGMA integrity_check").get();
console.log(JSON.stringify({ counts, missing: missing.length, integrity: Object.values(integrity)[0] }));
')
  say "Kiểm tra dữ liệu thử: $counts"
  ended=$(date +%s%3N)
  ms=$((ended - started))

  docker run --rm --user 1001:1001 --read-only --network none \
    --volume "$BACKUP_DIR:/backups" --env "BACKUP_DIR=/backups" \
    "$HELPER_IMAGE" record-restore-test "$id" "$ok" "$ms" "$partial" "$counts" >/dev/null || true

  say "Restore-test đạt sau ${ms}ms. Không đụng production; volume thử sẽ được xóa."
  cleanup_restore
  trap - EXIT
}

main() {
  local command="${1:-}"; shift || true
  case "$command" in
    check) load_config; cmd_check ;;
    install) cmd_install "$@" ;;
    run) cmd_run "$@" ;;
    worker) cmd_worker ;;
    list) cmd_list "$@" ;;
    verify) cmd_verify "$@" ;;
    extract) cmd_extract "$@" ;;
    restore-test) cmd_restore_test "$@" ;;
    ""|-h|--help|help) usage ;;
    *) usage; exit 2 ;;
  esac
}
main "$@"
