// Jour métier finance : la journée Teko court de 04 h 00 à 04 h 00
// (Africa/Libreville, UTC+1 sans heure d'été) — règles métier doc 02.

const DAY_START_HOUR = 4;
const LOCALES = ["fr-GA", "fr"];

/** `YYYY-MM-DD` du jour métier contenant `date` (bascule à 04 h 00 Libreville). */
export function businessDayOf(date: Date): string {
  const shifted = new Date(date.getTime() - DAY_START_HOUR * 3_600_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Libreville",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

/** « mardi 25 août » pour l'en-tête — entrée `YYYY-MM-DD`. */
export function businessDayLabel(businessDay: string): string {
  const date = new Date(`${businessDay}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return businessDay;
  return new Intl.DateTimeFormat(LOCALES, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/** « 25/08 14 h 47 » heure de Libreville — pour la liste des paiements. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALES, {
    timeZone: "Africa/Libreville",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
