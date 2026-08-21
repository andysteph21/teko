#!/usr/bin/env bash
# Rafraîchit les polices versionnées dans infra/tiles/martin/fonts/
# (Noto Sans depuis notofonts.github.io ; DejaVu depuis le système en repli).
set -euo pipefail
DATA="$(cd "$(dirname "$0")" && pwd)/fonts"
mkdir -p "$DATA"
BASE="https://raw.githubusercontent.com/notofonts/notofonts.github.io/main/fonts/NotoSans/hinted/ttf"
for f in NotoSans-Regular.ttf NotoSans-Bold.ttf; do
  curl -fsSL --retry 2 -o "$DATA/$f.tmp" "$BASE/$f" && mv "$DATA/$f.tmp" "$DATA/$f" \
    || { rm -f "$DATA/$f.tmp"; echo "avertissement : $f non téléchargé"; }
done
cp -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf "$DATA/" 2>/dev/null || true
cp -f /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf "$DATA/" 2>/dev/null || true
ls -lh "$DATA"
