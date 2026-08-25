// Cycle de vie du compte : présence, re-vérification douce (numéros
// recyclés), suppression avec rétractation 30 j (parcours E/F).

import type { ProfileRow } from "@teko/types";
import type { TekoClient } from "./client";
import { unwrap } from "./errors";

/** À appeler à chaque ouverture d'app (fenêtre d'inactivité d'un mois). */
export async function touchLastSeen(client: TekoClient): Promise<void> {
  unwrap(await client.rpc("touch_last_seen"));
}

/** true → forcer une re-vérification OTP avant de rouvrir l'historique
 *  (protection numéros prépayés recyclés, état supplémentaire de C-04). */
export async function needsReverification(client: TekoClient): Promise<boolean> {
  return unwrap(await client.rpc("needs_reverification")) === true;
}

/** Demande de suppression (C-28) — refusée si course active ou solde
 *  chauffeur non nul ; renvoie la date de purge (fin des 30 jours). */
export async function requestAccountDeletion(client: TekoClient): Promise<string> {
  return unwrap(await client.rpc("request_account_deletion")) as string;
}

/** Rétractation pendant la fenêtre de 30 jours — tout est restauré. */
export async function cancelAccountDeletion(client: TekoClient): Promise<void> {
  unwrap(await client.rpc("cancel_account_deletion"));
}

/** Enregistre le jeton push de l'appareil (FCM) — la livraison des offres
 *  et notifications passe par lui (spike doc 11 : Realtime ≠ arrière-plan). */
export async function registerDevice(
  client: TekoClient,
  userId: string,
  pushToken: string,
): Promise<void> {
  unwrap(
    await client.from("devices").upsert(
      { user_id: userId, push_token: pushToken, platform: "android" },
      {
        onConflict: "user_id,push_token",
      },
    ),
  );
}

/** Profil d'un utilisateur (le sien, sous RLS). */
export async function getProfile(client: TekoClient, userId: string): Promise<ProfileRow> {
  return unwrap(await client.from("profiles").select("*").eq("id", userId).single());
}

export interface UpdateProfileInput {
  fullName?: string;
  email?: string | null;
  photoUrl?: string | null;
}

/** Édition du profil (C-24) — champs non sensibles uniquement (le rôle et
 *  les champs chauffeur sont gardés par trigger côté backend). */
export async function updateProfile(
  client: TekoClient,
  userId: string,
  input: UpdateProfileInput,
): Promise<ProfileRow> {
  return unwrap(
    await client
      .from("profiles")
      .update({
        ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.photoUrl !== undefined ? { photo_url: input.photoUrl } : {}),
      })
      .eq("id", userId)
      .select()
      .single(),
  );
}
