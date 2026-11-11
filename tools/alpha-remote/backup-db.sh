#!/usr/bin/env bash
# Sauvegarde logique de la base du banc alpha sur le VPS (format pg_dump -Fc).
# Le fichier contient des données de test nominatives : dossier root 0700,
# jamais copié dans le dépôt. Restauration : pg_restore --clean dans le
# conteneur, hors course active.
set -euo pipefail
umask 077
container=supabase_db_teko-alpha-remote
target=${TEKO_ALPHA_BACKUP_DIR:-/var/backups/teko-alpha}
keep=${TEKO_ALPHA_BACKUP_KEEP:-14}
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$target"
tmp=$(mktemp "$target/.dump.XXXXXX")
trap 'rm -f "$tmp"' EXIT
docker exec "$container" pg_dump -U postgres -d postgres -Fc \
  --schema=public --schema=private --schema=auth --schema=storage >"$tmp"
[[ $(stat -c %s "$tmp") -gt 10000 ]] || { echo "Sauvegarde anormalement petite" >&2; exit 1; }
mv "$tmp" "$target/teko-alpha-$stamp.dump"
trap - EXIT
sha256sum "$target/teko-alpha-$stamp.dump" >"$target/teko-alpha-$stamp.dump.sha256"
ls -1t "$target"/teko-alpha-*.dump | tail -n +"$((keep + 1))" | while read -r old; do
  rm -f "$old" "$old.sha256"
done
echo "Sauvegarde écrite : teko-alpha-$stamp.dump"
