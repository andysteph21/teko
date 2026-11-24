// Liens entrants : le retour de la connexion Google est envoyé à l'écran
// d'échange ; tout autre lien suit le routage habituel.
import { googleReturnPath } from "../src/features/auth/google-return";

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return googleReturnPath(path) ?? path;
}
