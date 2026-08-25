#!/usr/bin/env bash
# composite.sh — assemble les 3 captures (cliente, chauffeur, console admin) sur un
# canevas 1920x1080 synchronisé sur une horloge commune t0.
#
# Usage : composite.sh <timeline.json> <sortie.mp4>
#
# Schéma de timeline.json :
# {
#   "t0": <epoch s (float) — référence commune>,
#   "start": <s après t0 où commence le segment (trim)>,
#   "duration": <durée du segment en s>,
#   "client": {"file": "...", "recStart": <epoch s du démarrage réel de l'enregistreur>},
#   "driver": {"file": "...", "recStart": ...},
#   "admin":  {"file": "...", "recStart": ...},
#   "captions": [{"from": s, "to": s, "text": "…"}]   // s relatives à t0
# }
#
# Synchro : à l'instant composite t, chaque volet montre l'instant source
# (t0 + start + t) - recStart, soit un trim par volet de (t0 + start - recStart).
# Si ce trim est négatif (enregistreur démarré après le point demandé), il est
# ramené à 0 avec un avertissement — le début du volet sera en avance.
set -euo pipefail

FFMPEG=/usr/bin/ffmpeg
FFPROBE=/usr/bin/ffprobe

if [ $# -ne 2 ]; then
  echo "Usage : $0 <timeline.json> <sortie.mp4>" >&2
  exit 1
fi
TIMELINE=$1
OUT=$2
[ -f "$TIMELINE" ] || { echo "Erreur : timeline introuvable : $TIMELINE" >&2; exit 1; }

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Le python construit tout (trims, disposition, fichiers texte, filtergraph)
# et écrit la ligne de commande ffmpeg dans un fichier d'arguments séparés par NUL.
python3 - "$TIMELINE" "$TMPDIR" "$FFMPEG" "$FFPROBE" "$OUT" <<'PYEOF'
import json, math, subprocess, sys

timeline_path, tmpdir, ffmpeg, ffprobe, out = sys.argv[1:6]

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# --- Constantes de mise en page (canevas 1920x1080) ---
CANVAS_W, CANVAS_H = 1920, 1080
BG = "0x1E1E30"
PHONE_H_MAX = 950      # hauteur cible des volets téléphone
PHONE_X0 = 42          # marge gauche
PHONE_Y = 92           # haut des volets téléphone
GUTTER = 24            # gouttière entre volets
ADMIN_W = 940          # largeur cible du volet admin
ADMIN_X = CANVAS_W - ADMIN_W - 30
ADMIN_Y = 200
LABEL_SIZE = 26        # étiquettes au-dessus des volets
LABEL_DY = 44          # étiquette à pane_y - 44
CAPTION_SIZE = 30      # sous-titres
BAND_H = 76            # hauteur du bandeau de sous-titres
BAND_Y = CANVAS_H - BAND_H

LABELS = {
    "client": "CLIENTE · NADIA",
    "driver": "CHAUFFEUR · BORIS",
    "admin":  "CONSOLE ADMIN · OPS",
}

def warn(msg):
    print(f"[composite] AVERTISSEMENT : {msg}", file=sys.stderr)

def die(msg):
    print(f"[composite] Erreur : {msg}", file=sys.stderr)
    sys.exit(1)

def probe_dims(path):
    """Dimensions du premier flux vidéo via ffprobe."""
    try:
        r = subprocess.run(
            [ffprobe, "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=p=0", path],
            capture_output=True, text=True, check=True)
        w, h = r.stdout.strip().split(",")[:2]
        return int(w), int(h)
    except Exception as e:
        die(f"ffprobe a échoué sur {path} : {e}")

with open(timeline_path) as f:
    tl = json.load(f)

for key in ("t0", "start", "duration", "client", "driver", "admin"):
    if key not in tl:
        die(f"clé manquante dans la timeline : {key!r}")

t0 = float(tl["t0"])
start = float(tl["start"])
dur = float(tl["duration"])
if dur <= 0:
    die("duration doit être > 0")

# --- Trim par volet : offset source = t0 + start - recStart ---
panes = {}
for name in ("client", "driver", "admin"):
    p = tl[name]
    off = t0 + start - float(p["recStart"])
    if off < 0:
        warn(f"volet {name} : l'enregistreur a démarré {-off:.3f}s après le point "
             f"demandé — trim ramené à 0, le volet sera en avance d'autant")
        off = 0.0
    w, h = probe_dims(p["file"])
    panes[name] = {"file": p["file"], "off": off, "w": w, "h": h}

# --- Disposition : téléphones à gauche (hauteur cible 950), admin à droite ---
def scaled_w(p, target_h):
    return round(p["w"] * target_h / p["h"])

phone_h = PHONE_H_MAX
cw = scaled_w(panes["client"], phone_h)
dw = scaled_w(panes["driver"], phone_h)
# Anti-chevauchement : si les téléphones mordent sur la zone admin, on réduit
# leur hauteur pour garder une gouttière avant le volet admin.
if PHONE_X0 + cw + GUTTER + dw + GUTTER > ADMIN_X:
    ratio = panes["client"]["w"] / panes["client"]["h"] + panes["driver"]["w"] / panes["driver"]["h"]
    phone_h = int((ADMIN_X - PHONE_X0 - 2 * GUTTER) / ratio)
    phone_h -= phone_h % 2  # hauteur paire
    cw = scaled_w(panes["client"], phone_h)
    dw = scaled_w(panes["driver"], phone_h)
    warn(f"hauteur téléphones réduite de {PHONE_H_MAX} à {phone_h}px pour éviter "
         f"le chevauchement avec le volet admin")

ah = round(panes["admin"]["h"] * ADMIN_W / panes["admin"]["w"])
ah -= ah % 2

geo = {
    "client": {"sw": cw, "sh": phone_h, "x": PHONE_X0, "y": PHONE_Y},
    "driver": {"sw": dw, "sh": phone_h, "x": PHONE_X0 + cw + GUTTER, "y": PHONE_Y},
    "admin":  {"sw": ADMIN_W, "sh": ah, "x": ADMIN_X, "y": ADMIN_Y},
}

# --- Fichiers texte (évite tout échappement drawtext : apostrophes, « », etc.) ---
def textfile(name, content):
    path = f"{tmpdir}/{name}.txt"
    with open(path, "w") as f:
        f.write(content)
    return path

# --- Filtergraph ---
order = ["client", "driver", "admin"]
parts = [f"color=c={BG}:s={CANVAS_W}x{CANVAS_H}:r=30:d={dur:.3f}[base]"]
for i, name in enumerate(order):
    p, g = panes[name], geo[name]
    # trim → setpts → fps (normalise aussi le webm admin à débit d'images variable)
    parts.append(
        f"[{i}:v]trim=start={p['off']:.6f}:end={p['off'] + dur:.6f},"
        f"setpts=PTS-STARTPTS,fps=30,scale={g['sw']}:{g['sh']},setsar=1[p{i}]")

prev = "base"
for i, name in enumerate(order):
    g = geo[name]
    nxt = f"ov{i}"
    parts.append(f"[{prev}][p{i}]overlay=x={g['x']}:y={g['y']}[{nxt}]")
    prev = nxt

# Étiquettes au-dessus des volets, centrées sur chaque volet
draws = []
for name in order:
    g = geo[name]
    tf = textfile(f"label_{name}", LABELS[name])
    # expansion=none : texte littéral (sinon % déclenche l'expansion drawtext)
    draws.append(
        f"drawtext=fontfile={FONT_BOLD}:textfile={tf}:expansion=none:fontsize={LABEL_SIZE}:"
        f"fontcolor=white:x={g['x']}+({g['sw']}-text_w)/2:y={g['y'] - LABEL_DY}")

# Sous-titres : bandeau pleine largeur semi-transparent + texte centré,
# affichés dans leur fenêtre [from,to] (relative à t0 → décalée de start)
for i, cap in enumerate(tl.get("captions", [])):
    f_rel = float(cap["from"]) - start
    t_rel = float(cap["to"]) - start
    if t_rel <= 0 or f_rel >= dur:
        warn(f"sous-titre {i} hors segment, ignoré : {cap['text']!r}")
        continue
    f_rel, t_rel = max(0.0, f_rel), min(dur, t_rel)
    enable = f"enable='between(t,{f_rel:.3f},{t_rel:.3f})'"
    tf = textfile(f"cap_{i}", cap["text"])
    draws.append(
        f"drawbox=x=0:y={BAND_Y}:w={CANVAS_W}:h={BAND_H}:color=black@0.55:t=fill:{enable}")
    draws.append(
        f"drawtext=fontfile={FONT_BOLD}:textfile={tf}:expansion=none:fontsize={CAPTION_SIZE}:"
        f"fontcolor=white:x=(w-text_w)/2:y={BAND_Y}+({BAND_H}-th)/2:{enable}")

parts.append(f"[{prev}]" + ",".join(draws) + "[vout]")
filtergraph = ";".join(parts)

# --- Commande ffmpeg (arguments séparés par NUL, lus par le bash appelant :
#     aucun échappement shell nécessaire, le graphe passe en un seul argument) ---
args = [ffmpeg, "-y", "-hide_banner", "-loglevel", "warning", "-stats"]
for name in order:
    args += ["-i", panes[name]["file"]]
args += ["-filter_complex", filtergraph, "-map", "[vout]", "-an",
         "-c:v", "libx264", "-crf", "20", "-preset", "medium",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
with open(f"{tmpdir}/ffargs", "wb") as f:
    f.write(b"\0".join(a.encode() for a in args))
PYEOF

# Exécute la commande construite par le python
mapfile -d '' -t ARGS < "$TMPDIR/ffargs"
"${ARGS[@]}"
echo "[composite] OK → $OUT" >&2
