// Dates de la console — Intl « fr-GA » avec repli « fr » (règle CLAUDE.md).

const LOCALES = ["fr-GA", "fr"];

/** « 12 août 2026 » — dates d'inscription, d'expiration. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALES, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** « 18 août 15:07:44 » — horodatages du journal d'audit. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALES, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

/** « il y a 5 min » / « il y a 3 h » / date longue au-delà de 24 h. */
export function formatRelative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return formatDate(iso);
}

/** Initiales d'avatar : « Serge O. » → « SO ». */
export function initials(fullName: string | null): string {
  if (!fullName) return "–";
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
