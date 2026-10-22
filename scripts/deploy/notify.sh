#!/usr/bin/env bash
# Gửi email báo cập nhật sau khi workflow deploy đã xác nhận health công khai.
#
# Tách khỏi deploy.sh để email chỉ được gửi khi TOÀN BỘ job deploy thành công:
# nếu bước kiểm tra https://<domain>/api/health thất bại, workflow dừng trước
# bước này và không có email nào được gửi.
#
# Script được pipe qua `bash -s` trên VPS, nên mọi lệnh có thể đọc stdin đều
# phải giữ `</dev/null`.
set -Eeuo pipefail
umask 077
sha=${1:?Missing commit SHA}
app_dir=${2:?Missing application directory}
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid SHA'; exit 1; }
[[ "$app_dir" =~ ^/[a-zA-Z0-9_/-]+$ && "$app_dir" != / && "$app_dir" != /home && "$app_dir" != /opt ]] || { echo 'Unsafe application directory'; exit 1; }
test -s "$app_dir/.env.production"
release="$app_dir/current"
test -d "$release" || { echo 'Missing current release'; exit 1; }

previous_sha=''
if test -f "$app_dir/previous-sha"; then previous_sha=$(cat "$app_dir/previous-sha"); fi
[[ "$previous_sha" =~ ^[a-f0-9]{40}$ ]] || previous_sha=''

notes_json=''
if test -f "$release/release-notes.json"; then notes_json=$(cat "$release/release-notes.json"); fi

compose=(docker compose --env-file "$app_dir/.env.production" -f "$release/compose.yml")
export APP_ENV_FILE="$app_dir/.env.production" APP_SHA="$sha" APP_IMAGE="sea-trip:$sha"
echo "Sending update email for $sha"
"${compose[@]}" exec -T -e RELEASE_NOTICE_PREVIOUS_SHA="$previous_sha" -e RELEASE_NOTES_JSON="$notes_json" app node scripts/release-notice.mjs "$sha" </dev/null
