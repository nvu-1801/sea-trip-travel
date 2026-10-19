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
test ! -e "$release" || { echo 'Release directory already exists; inspect previous attempt before retry'; exit 1; }
mkdir "$release"
tar -xzf "$app_dir/incoming-$sha.tar.gz" -C "$release"
cd "$release"
export APP_ENV_FILE="$app_dir/.env.production" APP_SHA="$sha" APP_IMAGE="sea-trip:$sha"
compose=(docker compose --env-file "$APP_ENV_FILE" -f "$release/compose.yml")
previous=''
if test -f "$app_dir/current-image"; then previous=$(cat "$app_dir/current-image"); fi
if test -n "$previous"; then
  backup="/app/data/backups/pre-$sha.sqlite"
  "${compose[@]}" exec -T -e BACKUP_PATH="$backup" app node scripts/admin.mjs backup
  cid=$("${compose[@]}" ps -q app)
  docker cp "$cid:$backup" "$app_dir/backups/pre-$sha.sqlite"
  if "${compose[@]}" exec -T app node -e 'process.exit(require("fs").existsSync("/app/data/uploads")?0:1)'; then
    docker cp "$cid:/app/data/uploads" "$app_dir/backups/media-$sha"
  fi
fi
"${compose[@]}" build --pull app
rollback() {
  echo 'Deployment health failed.'
  if test -n "$previous"; then APP_IMAGE="$previous" "${compose[@]}" up -d --no-build --wait --wait-timeout 120 app; fi
  exit 1
}
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 app || rollback
port=$("${compose[@]}" port app 3000 | awk -F: '{print $NF}')
body=$(curl -fsS --max-time 15 "http://127.0.0.1:$port/api/health") || rollback
"${compose[@]}" exec -T app node -e 'const body=JSON.parse(process.argv[1]);if(body.status!=="ok"||body.sha!==process.argv[2]||body.database!=="connected")process.exit(1)' "$body" "$sha" || rollback
printf '%s\n' "$APP_IMAGE" > "$app_dir/current-image"
printf '%s\n' "$sha" > "$app_dir/current-sha"
ln -sfn "$release" "$app_dir/current"
echo "Deployed and health verified: $sha"
