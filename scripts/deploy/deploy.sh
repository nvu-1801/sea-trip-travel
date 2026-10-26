#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
sha=${1:?Missing commit SHA}
app_dir=${2:?Missing application directory}
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid SHA'; exit 1; }
[[ "$app_dir" =~ ^/[a-zA-Z0-9_/-]+$ && "$app_dir" != / && "$app_dir" != /home && "$app_dir" != /opt ]] || { echo 'Unsafe application directory'; exit 1; }
mkdir -p "$app_dir/releases" "$app_dir/backups"
exec 9>"$app_dir/deploy.lock"
flock -w 1200 9
test -s "$app_dir/.env.production"
release="$app_dir/releases/$sha"
if test -e "$release"; then
  echo "Removing incomplete release from a previous attempt: $release"
  rm -rf -- "$release"
fi
mkdir "$release"
tar -xzf "$app_dir/incoming-$sha.tar.gz" -C "$release"
cd "$release"
test -f "$release/scripts/backup/manage.sh" || {
  echo "Release is missing scripts/backup/manage.sh"
  exit 1
}
export APP_ENV_FILE="$app_dir/.env.production" APP_SHA="$sha" APP_IMAGE="sea-trip:$sha" APP_BACKUP_DIR="$app_dir/backups"
compose=(docker compose --env-file "$APP_ENV_FILE" -f "$release/compose.yml")
previous=''
if test -f "$app_dir/current-image"; then previous=$(cat "$app_dir/current-image"); fi
previous_sha=''
if test -f "$app_dir/current-sha"; then previous_sha=$(cat "$app_dir/current-sha"); fi
[[ "$previous_sha" =~ ^[a-f0-9]{40}$ ]] || previous_sha=''
if test -n "$previous"; then
  backup="/app/data/backups/pre-$sha.sqlite"
  # Share the backup lock so a scheduled/manual backup cannot interleave with
  # this pre-deploy copy (and vice versa). These files are never retention-pruned.
  exec 8>"$app_dir/backup.lock"
  if flock -w 600 8; then
    "${compose[@]}" exec -T -e BACKUP_PATH="$backup" app node scripts/admin.mjs backup </dev/null
    cid=$("${compose[@]}" ps -q app </dev/null)
    docker cp "$cid:$backup" "$app_dir/backups/pre-$sha.sqlite"
    if "${compose[@]}" exec -T app node -e 'process.exit(require("fs").existsSync("/app/data/uploads")?0:1)' </dev/null; then
      docker cp "$cid:/app/data/uploads" "$app_dir/backups/media-$sha"
    fi
    flock -u 8
  else
    echo "WARNING: backup lock busy; skipping pre-deploy copy (scheduled backup is running)."
  fi
  exec 8>&-
fi
echo "Building image for $sha"
"${compose[@]}" build --pull app </dev/null
rollback() {
  echo 'Deployment health failed.'
  if test -n "$previous"; then APP_IMAGE="$previous" "${compose[@]}" up -d --no-build --wait --wait-timeout 120 app </dev/null; fi
  exit 1
}
echo "Starting container for $sha"
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 app </dev/null || rollback
port=$("${compose[@]}" port app 3000 </dev/null | awk -F: '{print $NF}')
body=''
for attempt in $(seq 1 30); do
  if body=$(curl -fsS --max-time 15 "http://127.0.0.1:$port/api/health"); then break; fi
  sleep 2
done
test -n "$body" || rollback
"${compose[@]}" exec -T app node -e 'const body=JSON.parse(process.argv[1]);if(body.status!=="ok"||body.sha!==process.argv[2]||body.database!=="connected")process.exit(1)' "$body" "$sha" </dev/null || rollback
printf '%s\n' "$previous_sha" > "$app_dir/previous-sha"
printf '%s\n' "$APP_IMAGE" > "$app_dir/current-image"
printf '%s\n' "$sha" > "$app_dir/current-sha"
ln -sfn "$release" "$app_dir/current"
test -f "$app_dir/current/scripts/backup/manage.sh" || {
  echo "Backup operator CLI missing from current release"
  exit 1
}
echo "Backup operator CLI available: $app_dir/current/scripts/backup/manage.sh"
echo "Deployed and health verified: $sha"
