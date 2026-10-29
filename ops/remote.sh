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
    docker cp /tmp/dump.mjs "$cid:/tmp/seatrip-dump.mjs"
    "${compose[@]}" exec -T app node /tmp/seatrip-dump.mjs </dev/null
    ;;
  apply)
    docker cp /tmp/apply.mjs "$cid:/tmp/seatrip-apply.mjs"
    docker cp /tmp/seatrip-apply.json "$cid:/tmp/seatrip-apply.json"
    "${compose[@]}" exec -T app node /tmp/seatrip-apply.mjs </dev/null
    ;;
  *)
    echo "unknown mode: $mode" >&2
    exit 1
    ;;
esac
