import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import type { TekoClient } from "./client";

export type SessionIdentity =
  | { status: "available"; userId: string | null }
  | { status: "unavailable" };

/** Une panne de renouvellement ne constitue pas une déconnexion. */
export async function getSessionIdentity(client: TekoClient): Promise<SessionIdentity> {
  const { data, error } = await client.auth.getSession();
  if (error && isAuthRetryableFetchError(error)) return { status: "unavailable" };
  return { status: "available", userId: error ? null : (data.session?.user.id ?? null) };
}
