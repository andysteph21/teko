#!/usr/bin/env bash
# assemble.sh — concatène des segments 1920x1080/30fps/yuv420p (cartes + composites).
#
# Usage : assemble.sh <sortie.mp4> <part1.mp4> [part2.mp4 ...]
#
# Utilise le filtre concat (ré-encodage) : plus robuste que le demuxer concat
# quand les segments viennent d'encodages aux paramètres différents. Chaque
# entrée est renormalisée (fps, taille, SAR, format) avant concaténation.
set -euo pipefail

FFMPEG=/usr/bin/ffmpeg

if [ $# -lt 2 ]; then
  echo "Usage : $0 <sortie.mp4> <part1.mp4> [part2.mp4 ...]" >&2
  exit 1
fi
OUT=$1
shift

INPUTS=()
FC=""
N=0
for f in "$@"; do
  [ -f "$f" ] || { echo "Erreur : segment introuvable : $f" >&2; exit 1; }
  INPUTS+=(-i "$f")
  # Renormalisation défensive de chaque segment
  FC+="[${N}:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p[v${N}];"
  N=$((N + 1))
done
for ((i = 0; i < N; i++)); do
  FC+="[v${i}]"
done
FC+="concat=n=${N}:v=1:a=0[vout]"

"$FFMPEG" -y -hide_banner -loglevel warning -stats \
  "${INPUTS[@]}" \
  -filter_complex "$FC" -map '[vout]' -an \
  -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -movflags +faststart \
  "$OUT"
echo "[assemble] OK → $OUT (${N} segments)" >&2
