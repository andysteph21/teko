#!/usr/bin/env bash
# Polices pour les étiquettes de carte (glyphes servis par Martin sur
# /font/{fontstack}/{range}). Cible : Noto Sans (couverture large, OFL) ;
# repli : DejaVu Sans du système (suffisant pour le français).
# Sortie : infra/_data/fonts/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DATA="$ROOT/infra/_data/fonts"
mkdir -p "$DATA"

BASE="https://raw.githubusercontent.com/notofonts/notofonts.github.io/main/fonts/NotoSans/hinted/ttf"
ok=1
for f in NotoSans-Regular.ttf NotoSans-Bold.ttf; do
  if [ ! -f "$DATA/$f" ]; then
    curl -fsSL --retry 2 -o "$DATA/$f.tmp" "$BASE/$f" && mv "$DATA/$f.tmp" "$f" 2>/dev/null || true
    [ -f "$DATA/$f.tmp" ] && mv "$DATA/$f.tmp" "$DATA/$f" || true
  fi
  [ -f "$DATA/$f" ] || ok=0
done

if [ "$ok" = 0 ]; then
  echo "Noto indisponible — repli sur DejaVu Sans (système)."
  cp -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf "$DATA/" 2>/dev/null || true
  cp -f /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf "$DATA/" 2>/dev/null || true
fi
ls -lh "$DATA"
echo "✓ Polices prêtes (redémarrez Martin)."
