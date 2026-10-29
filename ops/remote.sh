#!/usr/bin/env bash
# Temporary content-ops helper. Runs on the VPS as the deploy user.
# Usage: bash /tmp/seatrip-remote.sh dump|apply /opt/seatrip
set -Eeuo pipefail
mode=${1:?mode}
app_dir=${2:?app dir}
cd "$app_dir/current"
export APP_ENV_FILE="$app_dir/.env.production"
export APP_IMAGE="$(cat "$app_dir/current-image")"
export APP_BACKUP_DIR="$app_dir/backups"
compose=(docker compose --env-file "$app_dir/.env.production" -f compose.yml)
cid=$("${compose[@]}" ps -q app </dev/null)
test -n "$cid"

case "$mode" in
  dump)
    "${compose[@]}" exec -T app node --input-type=module - </tmp/dump.mjs
    ;;
  apply)
    # /app/data is the persistent volume and is writable even though the
    # container root filesystem is read-only.
    docker cp /tmp/seatrip-apply.json "$cid:/app/data/seatrip-apply.json"
    trap '"${compose[@]}" exec -T app rm -f /app/data/seatrip-apply.json >/dev/null 2>&1 || true' EXIT
    "${compose[@]}" exec -T app node --input-type=module - </tmp/apply.mjs
    ;;
  *)
    echo "unknown mode: $mode" >&2
    exit 1
    ;;
esac
