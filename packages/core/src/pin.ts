// PIN de démarrage de course : 4 chiffres, affiché côté client (C-13),
// transmis de vive voix, saisi côté chauffeur (D-12). La VALIDATION réelle
// est faite par `start_ride(pin)` côté backend — ici, seul le format.

export const PIN_LENGTH = 4;

/** Le texte saisi a-t-il le format d'un PIN (exactement 4 chiffres) ? */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
