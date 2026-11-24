// Authentification (C-03/C-04, D-03). Décision du 23 novembre 2026 : le code
// par e-mail est mis en avant ; le code par SMS reste disponible pour le jour
// où un prestataire sera activé, et pour les comptes de test du banc
// (numéros de supabase/config.toml, code fixe 123456).

import type { Session } from "@supabase/supabase-js";
import type { TekoClient } from "./client";
import { mapApiError } from "./errors";

export type { Session };

/** Envoie le code OTP au numéro (E.164, ex. « +24107000001 »). */
export async function signInWithPhoneOtp(client: TekoClient, phone: string): Promise<void> {
  const { error } = await client.auth.signInWithOtp({ phone });
  if (error) throw mapApiError(error);
}

/** Vérifie le code reçu — crée le compte au premier passage (le serveur
 *  distingue nouveau/existant, jamais l'utilisateur). */
export async function verifyPhoneOtp(
  client: TekoClient,
  phone: string,
  token: string,
): Promise<Session> {
  const { data, error } = await client.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw mapApiError(error);
  if (!data.session) throw mapApiError({ message: "Session absente après vérification OTP" });
  return data.session;
}

/** Adresse normalisée comme la base la compare : sans espaces, en minuscules. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Envoie un code à 6 chiffres à l'adresse. Le serveur refuse la création
 *  d'un compte dont l'adresse n'est pas invitée. */
export async function signInWithEmailOtp(client: TekoClient, email: string): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true },
  });
  if (error) throw mapApiError(error);
}

/** Vérifie le code reçu par e-mail — crée le compte au premier passage. */
export async function verifyEmailOtp(
  client: TekoClient,
  email: string,
  token: string,
): Promise<Session> {
  const { data, error } = await client.auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: "email",
  });
  if (error) throw mapApiError(error);
  if (!data.session) throw mapApiError({ message: "Session absente après vérification du code" });
  return data.session;
}

export async function signOut(client: TekoClient): Promise<void> {
  // Avant la révocation du JWT, retirer les jetons de cette session seulement.
  // Si le serveur est injoignable, garder la session pour permettre de réessayer.
  const devices = await client.rpc("unregister_session_devices");
  if (devices.error) throw mapApiError(devices.error);
  const { error } = await client.auth.signOut();
  if (error) throw mapApiError(error);
}

/** Adresse de connexion Google à ouvrir dans le navigateur du téléphone.
 *  Le serveur refuse la création d'un compte dont l'adresse n'est pas invitée. */
export async function googleSignInUrl(client: TekoClient, redirectTo: string): Promise<string> {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw mapApiError(error);
  if (!data.url) throw mapApiError({ message: "Connexion Google indisponible" });
  return data.url;
}

/** Retour du navigateur vers l'app : échange le code à usage unique contre
 *  une session. Retourne null si le lien n'est pas un retour de connexion. */
export async function completeOAuthSignIn(
  client: TekoClient,
  returnUrl: string,
): Promise<Session | null> {
  const query = returnUrl.split("#")[0]?.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const refusal = params.get("error_description") ?? params.get("error");
  if (refusal) throw mapApiError({ message: refusal, code: params.get("error_code") ?? undefined });
  const code = params.get("code");
  if (!code) return null;
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) throw mapApiError(error);
  return data.session;
}
