// Client Supabase "service role" (hors RLS) + utilitaires partagés.
// deno-lint-ignore no-import-prefix -- URL directe : le runtime Edge ne doit pas dépendre de la résolution d'import map
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Récupère le MSISDN concerné par un paiement (payeur côté collecte, bénéficiaire côté payout).
interface PaymentLike {
  kind: string;
  ride_id?: string | null;
  driver_id?: string | null;
}

export async function resolveMsisdn(db: SupabaseClient, pmt: PaymentLike): Promise<string | null> {
  let userId: string | null = null;
  if (pmt.kind === "ride_collection" && pmt.ride_id) {
    const { data } = await db.from("rides").select("client_id").eq("id", pmt.ride_id).single();
    userId = data?.client_id ?? null;
  } else {
    userId = pmt.driver_id ?? null;
  }
  if (!userId) return null;
  const { data } = await db.from("profiles").select("phone").eq("id", userId).single();
  // TODO: formater le MSISDN sans indicatif pays selon l'exigence Airtel.
  return data?.phone ?? null;
}
