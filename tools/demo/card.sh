#!/usr/bin/env bash
# card.sh — carte de titre 1920x1080 aux couleurs de la marque Teko.
#
# Usage : card.sh <sortie.mp4> <durée_s> <titre> [sous-titre]
#
# Fond : dégradé diagonal #3D0F5C → #5A1A80 → #8C238A (filtre gradients),
# repli sur violet uni #4A1470 si le filtre est absent. Marque « T » cerclée,
# titre en DejaVuSans-Bold 64, sous-titre en DejaVuSans 36. Fondu 0.4 s.
set -euo pipefail

FFMPEG=/usr/bin/ffmpeg
FONT_BOLD=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
FONT_REG=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf

if [ $# -lt 3 ]; then
  echo "Usage : $0 <sortie.mp4> <durée_s> <titre> [sous-titre]" >&2
  exit 1
fi
OUT=$1
DUR=$2
TITLE=$3
SUBTITLE=${4:-}

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Textes via fichiers : aucun échappement drawtext à gérer (apostrophes, « », : , %)
printf '%s' "$TITLE" > "$TMPDIR/title.txt"
[ -n "$SUBTITLE" ] && printf '%s' "$SUBTITLE" > "$TMPDIR/subtitle.txt"

# Début du fondu de sortie
FADE_OUT_ST=$(python3 -c "import sys; print(max(0.0, float(sys.argv[1]) - 0.4))" "$DUR")

# Fond : dégradé si le filtre existe, sinon violet uni.
# (grep sans -q : évite le SIGPIPE sur ffmpeg qui, avec pipefail, ferait
# échouer le test alors que le filtre existe)
if "$FFMPEG" -hide_banner -filters 2>/dev/null | grep ' gradients ' >/dev/null; then
  SRC="gradients=s=1920x1080:c0=#3D0F5C:c1=#5A1A80:c2=#8C238A:nb_colors=3:x0=200:y0=1080:x1=1720:y1=0:speed=0.00001:rate=30:d=${DUR}"
else
  echo "[card] AVERTISSEMENT : filtre gradients absent, fond uni #4A1470" >&2
  SRC="color=c=0x4A1470:s=1920x1080:r=30:d=${DUR}"
fi

# Marque : anneau « ○ » + « T », tous deux centrés optiquement sur y=370
VF="drawtext=fontfile=${FONT_BOLD}:text=○:fontsize=230:fontcolor=white:x=(w-text_w)/2:y=370-th/2"
VF+=",drawtext=fontfile=${FONT_BOLD}:text=T:fontsize=110:fontcolor=white:x=(w-text_w)/2:y=370-th/2"
# expansion=none : texte littéral (sinon % déclencherait l'expansion drawtext)
VF+=",drawtext=fontfile=${FONT_BOLD}:textfile=${TMPDIR}/title.txt:expansion=none:fontsize=64:fontcolor=white:x=(w-text_w)/2:y=540"
if [ -n "$SUBTITLE" ]; then
  VF+=",drawtext=fontfile=${FONT_REG}:textfile=${TMPDIR}/subtitle.txt:expansion=none:fontsize=36:fontcolor=white@0.85:x=(w-text_w)/2:y=640"
fi
VF+=",fade=t=in:st=0:d=0.4,fade=t=out:st=${FADE_OUT_ST}:d=0.4,format=yuv420p"

"$FFMPEG" -y -hide_banner -loglevel warning -stats \
  -f lavfi -i "$SRC" \
  -vf "$VF" -t "$DUR" -an \
  -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -movflags +faststart \
  "$OUT"
echo "[card] OK → $OUT" >&2
