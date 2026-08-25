// Points d'accès de l'app — surchargés par variables EXPO_PUBLIC_* (staging,
// prod). En dev : stack locale via adb reverse. Le repli MapTiler (CL-04)
// se branchera ici : changer l'URL de tuiles, zéro rebuild (ADR-10).

export const TILES_URL = process.env.EXPO_PUBLIC_TILES_URL ?? "http://127.0.0.1:3333/gabon";
export const VALHALLA_URL = process.env.EXPO_PUBLIC_VALHALLA_URL ?? "http://127.0.0.1:8002";

/** Centre par défaut : Libreville (lancement mono-ville, n° 25). */
export const DEFAULT_CENTER = { lon: 9.4536, lat: 0.4032 };
