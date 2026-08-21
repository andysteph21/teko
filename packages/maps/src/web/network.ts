// Détection réseau navigateur pour le mode « auto » (C-25).
// Écoute navigator.connection quand il existe (Chrome/Android — notre cible),
// et se dégrade proprement ailleurs (mode complet).

import { type MapModePreference, type NetworkHint, type ResolvedMapMode, resolveMapMode } from "../mode.js";

interface NavigatorConnection extends EventTarget {
  effectiveType?: string;
  saveData?: boolean;
}

function connection(): NavigatorConnection | undefined {
  return (navigator as unknown as { connection?: NavigatorConnection }).connection;
}

export function currentNetworkHint(): NetworkHint {
  const c = connection();
  return c ? { effectiveType: c.effectiveType, saveData: c.saveData } : {};
}

/**
 * Résout le régime carte pour une préférence donnée et rappelle `onChange`
 * à chaque évolution du réseau (préférence « auto »). Retourne l'état
 * initial et une fonction d'arrêt.
 */
export function watchMapMode(
  pref: MapModePreference,
  onChange: (r: ResolvedMapMode) => void,
): { initial: ResolvedMapMode; stop: () => void } {
  const compute = () => resolveMapMode(pref, currentNetworkHint());
  const initial = compute();
  const c = connection();
  if (pref !== "auto" || !c) return { initial, stop: () => {} };
  let last = initial.mode;
  const handler = () => {
    const next = compute();
    if (next.mode !== last) {
      last = next.mode;
      onChange(next);
    }
  };
  c.addEventListener("change", handler);
  return { initial, stop: () => c.removeEventListener("change", handler) };
}
