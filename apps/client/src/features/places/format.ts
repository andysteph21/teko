// Formats purs du parcours repères (C-08/C-31) — testés unitairement.
// Même précédent que relativeDayLabel (use-recent-destinations) : les
// libellés de dates relatives vivent avec la fonction pure.

const DAY_MS = 86_400_000;

/** Distance affichée à droite d'un résultat (C-08) : « 350 m », « 1,2 km ». */
export function formatDistanceText(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "";
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Date d'une proposition (C-31) : « aujourd'hui », « hier », « le 15 août ». */
export function formatProposalDate(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - Date.parse(iso)) / DAY_MS);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  const date = new Date(iso);
  return `le ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

/** Applique une puce-préfixe à l'indication (C-09) : remplace un éventuel
 *  préfixe existant, conserve le reste du texte saisi. */
export function applyHintPrefix(
  current: string,
  prefix: string,
  allPrefixes: readonly string[],
): string {
  let rest = current;
  for (const p of allPrefixes) {
    if (rest.toLowerCase().startsWith(p.toLowerCase())) {
      rest = rest.slice(p.length);
      break;
    }
  }
  rest = rest.trimStart();
  return rest ? `${prefix} ${rest}` : `${prefix} `;
}

/** Puce actuellement « active » : celle dont le libellé préfixe le texte. */
export function activeHintPrefix(
  current: string,
  allPrefixes: readonly string[],
): string | null {
  const lower = current.toLowerCase();
  return allPrefixes.find((p) => lower.startsWith(p.toLowerCase())) ?? null;
}

/** Découpe un nom autour de la requête (surlignage magenta du C-08).
 *  Insensible à la casse ; sans correspondance → tout dans `before`. */
export function splitOnQuery(
  name: string,
  query: string,
): { before: string; match: string; after: string } {
  const q = query.trim();
  if (q.length === 0) return { before: name, match: "", after: "" };
  const index = name.toLowerCase().indexOf(q.toLowerCase());
  if (index < 0) return { before: name, match: "", after: "" };
  return {
    before: name.slice(0, index),
    match: name.slice(index, index + q.length),
    after: name.slice(index + q.length),
  };
}
