// Authentification par téléphone (C-03/C-04, D-03) — OTP SMS Supabase.
// En local : numéros de test de supabase/config.toml (code fixe 123456).

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

export async function signOut(client: TekoClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw mapApiError(error);
}
