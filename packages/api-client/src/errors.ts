// Mapper d'erreurs backend → codes stables (doc 10 §3). Le backend renvoie
// des messages français humains (« PIN incorrect ») et le code 42501 pour les
// privilèges ; l'UI ne fait JAMAIS de string-match : elle teste `error.code`.

export type TekoApiErrorCode =
  | "not_authorized"
  | "superadmin_only"
  | "participants_only"
  | "no_active_offer"
  | "offer_already_handled"
  | "offer_expired"
  | "pin_incorrect"
  | "ride_in_progress"
  | "role_change_forbidden"
  | "network"
  | "unknown";

export class TekoApiError extends Error {
  constructor(
    readonly code: TekoApiErrorCode,
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TekoApiError";
  }
}

/** [détecteur sur message normalisé, code stable] — ordre = priorité. */
const MESSAGE_RULES: [string, TekoApiErrorCode][] = [
  ["réservé au superadmin", "superadmin_only"],
  ["réservé aux participants", "participants_only"],
  ["aucune offre active", "no_active_offer"],
  ["offre déjà traitée", "offer_already_handled"],
  ["offre expirée", "offer_expired"],
  ["pin incorrect", "pin_incorrect"],
  ["course est en cours", "ride_in_progress"],
  ["rôle non autorisée", "role_change_forbidden"],
  ["failed to fetch", "network"],
  ["network request failed", "network"],
  ["fetch failed", "network"],
];

interface ErrorLike {
  code?: string;
  message?: string;
}

/** Toute erreur Supabase/PostgREST/réseau → TekoApiError à code stable. */
export function mapApiError(raw: unknown): TekoApiError {
  if (raw instanceof TekoApiError) return raw;
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as ErrorLike;
  const message = source.message ?? String(raw);
  const normalized = message.toLowerCase();

  for (const [needle, code] of MESSAGE_RULES) {
    if (normalized.includes(needle)) return new TekoApiError(code, message, raw);
  }
  if (source.code === "42501") return new TekoApiError("not_authorized", message, raw);
  return new TekoApiError("unknown", message, raw);
}

/** Déballe une réponse supabase-js `{ data, error }` en levant TekoApiError. */
export function unwrap<T>(response: { data: T | null; error: ErrorLike | null }): T {
  if (response.error) throw mapApiError(response.error);
  return response.data as T;
}
