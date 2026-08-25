// Formatage des montants XAF — convention des maquettes : chasse fixe côté
// UI, séparateur de milliers insécable, « − » typographique (U+2212) pour les
// soldes débiteurs (D-15), jamais de décimales (le XAF n'en a pas).

const NBSP = " ";
const MINUS = "−";

export type XafUnit = "F" | "FCFA" | "none";

/** `formatXaf(1200)` → `"1 200 F"` · `formatXaf(-3000)` → `"−3 000 F"`. */
export function formatXaf(amount: number, unit: XafUnit = "F"): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? MINUS : "";
  const grouped = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return unit === "none" ? `${sign}${grouped}` : `${sign}${grouped}${NBSP}${unit}`;
}
