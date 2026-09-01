// Client Supabase "service role" (hors RLS) + ré-exports des utilitaires
// partagés. Seul module à charger supabase-js : les handlers testables
// importent les modules purs (http.ts, msisdn.ts, db_types.ts) et reçoivent
// le client par injection depuis leur index.ts.
// deno-lint-ignore no-import-prefix -- URL directe : le runtime Edge ne doit pas dépendre de la résolution d'import map
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export { json } from "./http.ts";
export { resolveMsisdn } from "./msisdn.ts";
