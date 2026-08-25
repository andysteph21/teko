// Points d'accès de la console — surchargés par NEXT_PUBLIC_* (staging,
// prod). En dev : stack carto locale (tuiles + Valhalla).

export const TILES_URL = process.env.NEXT_PUBLIC_TILES_URL ?? "http://127.0.0.1:3333/gabon";
export const VALHALLA_URL = process.env.NEXT_PUBLIC_VALHALLA_URL ?? "http://127.0.0.1:8002";

/** Centre par défaut : Libreville (lancement mono-ville, n° 25). */
export const DEFAULT_CENTER = { lon: 9.4536, lat: 0.4032 };
