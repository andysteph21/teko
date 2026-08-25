// Créneaux C-18 — génération pure, sans dépendance de sélecteur natif.
// TODO(UI) : remplacer la liste par un vrai sélecteur « roue » (aucune
// dépendance nouvelle autorisée sur ce lot).

const SLOT_STEP_MIN = 15;
const MIN_LEAD_MIN = 30;
/** Premier créneau proposé un jour futur (début de service). */
const FIRST_SLOT_HOUR = 5;
/** Dernier créneau proposé (22 h 00 inclus). */
const LAST_SLOT_HOUR = 22;

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Les `count` prochains jours (minuit local), aujourd'hui inclus. */
export function dayOptions(now: Date, count = 7): Date[] {
  return Array.from(
    { length: count },
    (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i),
  );
}

/** Créneaux d'un jour : pas de 15 min, 05 h 00 → 22 h 00 ; aujourd'hui à
 *  partir de maintenant + 30 min, arrondi au quart d'heure supérieur.
 *  Vide si plus aucun créneau (fin de journée). */
export function timeSlots(day: Date, now: Date): Date[] {
  const step = SLOT_STEP_MIN * 60_000;
  let start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), FIRST_SLOT_HOUR).getTime();
  if (sameDay(day, now)) {
    // Les fuseaux étant des multiples de 15 min, l'arrondi epoch reste
    // aligné sur les quarts d'heure locaux.
    const lead = now.getTime() + MIN_LEAD_MIN * 60_000;
    start = Math.max(start, Math.ceil(lead / step) * step);
  }
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), LAST_SLOT_HOUR).getTime();
  const slots: Date[] = [];
  for (let t = start; t <= end; t += step) slots.push(new Date(t));
  return slots;
}
