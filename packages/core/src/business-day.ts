// Journée métier Teko : de 04:00 à 04:00, heure de Libreville (UTC+1, sans
// heure d'été). Miroir d'affichage de `business_day()` côté backend — la
// clôture réelle est faite par `daily_close` (pg_cron), jamais par l'app.

/** Libreville est en UTC+1 toute l'année. */
const LIBREVILLE_OFFSET_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Date « métier » (YYYY-MM-DD) d'un instant : bascule à 04:00 Libreville. */
export function businessDay(at: Date, cutoffHour = 4): string {
  const shifted = new Date(at.getTime() + LIBREVILLE_OFFSET_MS - cutoffHour * 3_600_000);
  return shifted.toISOString().slice(0, 10);
}

/** Instant (UTC) de la prochaine clôture de 04:00 Libreville. */
export function nextCutoff(at: Date, cutoffHour = 4): Date {
  const local = at.getTime() + LIBREVILLE_OFFSET_MS;
  const startOfLocalDay = Math.floor(local / DAY_MS) * DAY_MS;
  const cutoffLocal = startOfLocalDay + cutoffHour * 3_600_000;
  const next = cutoffLocal > local ? cutoffLocal : cutoffLocal + DAY_MS;
  return new Date(next - LIBREVILLE_OFFSET_MS);
}

export function msUntilCutoff(at: Date, cutoffHour = 4): number {
  return nextCutoff(at, cutoffHour).getTime() - at.getTime();
}

/** État d'urgence du solde (D-15) : débiteur ET clôture à moins de
 *  `urgencyHours` heures (défaut 4 h — décision client n° 5). */
export function isBalanceUrgent(
  balanceXaf: number,
  at: Date,
  opts: { urgencyHours?: number; cutoffHour?: number } = {},
): boolean {
  if (balanceXaf >= 0) return false;
  const hours = opts.urgencyHours ?? 4;
  return msUntilCutoff(at, opts.cutoffHour ?? 4) <= hours * 3_600_000;
}
