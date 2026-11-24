// Retour de la connexion Google : le navigateur rouvre l'app sur
// `<schéma>://auth?code=…`. Ce lien n'est pas un écran : il est réécrit vers
// l'écran qui échange le code contre la session.

const RETURN = /(?:^|\/)auth\/?\?(.+)$/;

/** Chemin interne pour un lien de retour, ou null si ce n'en est pas un. */
export function googleReturnPath(path: string): string | null {
  const query = RETURN.exec(path.split("#")[0] ?? "")?.[1];
  if (!query) return null;
  const params = new URLSearchParams(query);
  if (!params.get("code") && !params.get("error")) return null;
  return `/(auth)/google-return?${query}`;
}

/** Lien de retour reconstruit pour l'échange, à partir des paramètres reçus. */
export function googleReturnUrl(params: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const key of ["code", "error", "error_code", "error_description"]) {
    const value = params[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  return `app://auth?${query.toString()}`;
}
