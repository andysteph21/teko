// Animations et pictogrammes carte (web uniquement — canvas + rAF).
//
// Conçus pour être compris SANS LIRE : le départ est une épingle avec une
// silhouette de personne, l'arrivée une épingle avec un drapeau, la position
// vit (pulsation), la voiture s'oriente et avance, l'attente respire.

import type * as maplibregl from "maplibre-gl";
import { type LonLat, pointAlong } from "../geo";

/** Image animée « pulsation » (anneau qui s'étend puis s'efface), à passer à
 *  map.addImage(id, makePulse(map, couleur), { pixelRatio: 2 }). */
export function makePulse(map: maplibregl.Map, color: string, size = 120) {
  let ctx: CanvasRenderingContext2D | null = null;
  return {
    width: size,
    height: size,
    data: new Uint8ClampedArray(size * size * 4),
    onAdd(): void {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      ctx = canvas.getContext("2d", { willReadFrequently: true });
    },
    render(): boolean {
      if (!ctx) return false;
      const t = (performance.now() % 1600) / 1600;
      const r = (size / 2) * 0.25 + (size / 2) * 0.6 * t;
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = 4 + 4 * (1 - t);
      ctx.stroke();
      ctx.globalAlpha = 1;
      this.data = ctx.getImageData(0, 0, size, size)
        .data as unknown as Uint8ClampedArray<ArrayBuffer>;
      map.triggerRepaint();
      return true;
    },
  };
}

/** Épingle-goutte (64×80) avec pictogramme : "person" (départ) ou "flag"
 *  (arrivée). Ancre en bas de la pointe. */
export function makePin(kind: "person" | "flag", color: string): ImageData {
  const W = 64;
  const H = 80;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const cx = W / 2;
  const cy = 26;
  const R = 20;

  // Goutte : cercle + pointe, liseré blanc pour rester net sur tout fond.
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI * 0.8, Math.PI * 0.2);
  ctx.quadraticCurveTo(cx + 10, cy + R + 8, cx, H - 6);
  ctx.quadraticCurveTo(
    cx - 10,
    cy + R + 8,
    cx - R * Math.cos(Math.PI * 0.2),
    cy + R * Math.sin(Math.PI * 0.2),
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fill();

  // Fenêtre blanche.
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (kind === "person") {
    // Tête + buste — « quelqu'un attend ici ».
    ctx.beginPath();
    ctx.arc(cx, cy - 4.5, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 9, 7.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    // Drapeau — « on va là ».
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 8);
    ctx.lineTo(cx - 4, cy + 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 8);
    ctx.lineTo(cx + 9, cy - 4);
    ctx.lineTo(cx - 4, cy);
    ctx.closePath();
    ctx.fill();
  }
  return ctx.getImageData(0, 0, W, H);
}

export interface VehicleAnimation {
  /** Promesse résolue à l'arrivée (ou au cancel). */
  done: Promise<void>;
  cancel: () => void;
}

/**
 * Fait avancer un véhicule le long d'un itinéraire (paramétré distance,
 * cap suivi) pendant `durationMs`. `onFrame` reçoit position, cap et t —
 * l'appelant met à jour la couche véhicule et la progression du tracé.
 */
export function animateAlong(
  route: LonLat[],
  durationMs: number,
  onFrame: (position: LonLat, bearing: number, t: number) => void,
): VehicleAnimation {
  let raf = 0;
  let cancelled = false;
  const done = new Promise<void>((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      if (cancelled) return resolve();
      const t = Math.min(1, (now - start) / durationMs);
      // Départ/arrivée en douceur (ease in-out).
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const { position, bearing } = pointAlong(route, eased);
      onFrame(position, bearing, eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else resolve();
    };
    raf = requestAnimationFrame(tick);
  });
  return {
    done,
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    },
  };
}

/** Petite image-lettre (police système, aucun octet réseau) — utilisée en
 *  mode éco à la place des glyphes distants. */
export function makeLetterImage(lettre: string, color: string, size = 22): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `bold ${Math.round(size * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(lettre, size / 2, size / 2 + 1);
  return ctx.getImageData(0, 0, size, size);
}
