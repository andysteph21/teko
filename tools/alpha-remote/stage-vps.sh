#!/usr/bin/env bash
# Installe le banc fictif en boucle locale, sans mettre de port public en écoute.
set -euo pipefail
umask 077

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
root=$PWD
local_dir="$root/.local/alpha-remote"
project=teko-alpha-remote
network=teko-alpha-remote-private
compose="$root/tools/alpha-remote/compose.vps.yml"
[[ "$root" =~ ^/[A-Za-z0-9_./-]+$ ]] || { echo "Chemin de déploiement simple requis" >&2; exit 1; }
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 24 ]]
case "$(timeout 15 supabase --version)" in
  2.120.0|2.110.0) ;;
  *) echo "Supabase CLI 2.120.0 ou compagnon Go 2.110.0 requis" >&2; exit 1 ;;
esac
grep -Fxq 'project_id = "teko-alpha-remote"' "$local_dir/supabase/config.toml"
test -s "$local_dir/accounts.json"
test -s "$local_dir/functions.env"
test -s "$root/infra/_data/tiles/gabon.pmtiles"
test -s "$root/infra/_data/valhalla/custom_files/valhalla_tiles.tar"

if ! docker network inspect "$network" >/dev/null 2>&1; then
  docker network create --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 "$network" >/dev/null
fi
[[ "$(docker network inspect --format '{{index .Options "com.docker.network.bridge.host_binding_ipv4"}}' "$network")" == 127.0.0.1 ]]
cp -R "$root/supabase/migrations" "$root/supabase/functions" "$root/supabase/seed.sql" "$local_dir/supabase/"
sed -i 's|^VALHALLA_URL=.*|VALHALLA_URL=http://valhalla:8002|' "$local_dir/functions.env"
supabase start --workdir "$local_dir" --network-id "$network" \
  --exclude studio,postgres-meta,logflare,vector,supavisor,edge-runtime >"$local_dir/start.log" 2>&1
[[ "$(docker port "supabase_kong_$project" 8000)" == 127.0.0.1:58421 ]]
[[ "$(docker port "supabase_db_$project" 5432)" == 127.0.0.1:58422 ]]

npm ci --prefix "$root/supabase/tests/e2e" --ignore-scripts --no-audit --no-fund
node tools/alpha-remote/seed.mjs
node tools/alpha-remote/configure-vps.mjs
cat >"$local_dir/vps-compose.env" <<EOF
ALPHA_SITE=http://:80
ALPHA_HTTP_BIND=127.0.0.1:58481
ALPHA_HTTPS_BIND=127.0.0.1:58443
ALPHA_UID=$(id -u)
ALPHA_GID=$(id -g)
EOF
docker compose --env-file "$local_dir/vps-compose.env" -f "$compose" up -d --wait --wait-timeout 120

supabase_bin=$(command -v supabase)
unit_dir="$HOME/.config/systemd/user"
mkdir -p "$unit_dir"
cat >"$unit_dir/teko-alpha-functions.service" <<EOF
[Unit]
Description=Fonctions du banc fictif Teko

[Service]
WorkingDirectory=$root
ExecStart=$supabase_bin functions serve --workdir $local_dir --network-id $network --env-file $local_dir/functions.env
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now teko-alpha-functions.service
echo "Banc démarré en boucle locale. Vérifier la passerelle avant d’activer HTTPS public."
