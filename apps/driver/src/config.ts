// Points d'accès de l'app — surchargés par variables EXPO_PUBLIC_* (staging,
// prod). En dev : stack locale via adb reverse. Le repli MapTiler (CL-04)
// se branchera ici : changer l'URL de tuiles, zéro rebuild (ADR-10).

export const TILES_URL = process.env.EXPO_PUBLIC_TILES_URL ?? "http://127.0.0.1:3333/gabon";
export const VALHALLA_URL = process.env.EXPO_PUBLIC_VALHALLA_URL ?? "http://127.0.0.1:8002";

/** Centre par défaut : Libreville (lancement mono-ville, n° 25). */
export const DEFAULT_CENTER = { lon: 9.4536, lat: 0.4032 };

/** Emprise approximative du Gabon — hors de cette zone, l'app recadre sur
 *  Libreville (lancement mono-ville ; la couverture réelle par zones arrive
 *  avec la question n° 13). Indispensable en dev : le GPS de l'appareil
 *  n'est pas au Gabon, Valhalla ne route que l'extrait gabonais. */
export function withinGabon(p: { lon: number; lat: number }): boolean {
  return p.lon >= 8.3 && p.lon <= 14.6 && p.lat >= -4.1 && p.lat <= 2.4;
}
