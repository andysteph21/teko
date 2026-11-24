// Fautes injectées des lots du 23 novembre 2026 : frais dus, modification de
// trajet, covoiturage, livraison. `sql` exécute une requête sur le banc jetable.
export function serviceMutants(sql) {
  const originalRouteChange = sql(
    "select pg_get_functiondef('public.create_route_change_quote(uuid,uuid,jsonb,jsonb,jsonb)'::regprocedure);",
  );
  return [
    {
      name: "frais-dus-contournes",
      file: "frais-dus.test.ts",
      test: "bloquent la commande",
      inject:
        "create or replace function private.fees_due(p_user uuid) returns boolean language sql stable security definer set search_path=public as $$ select false $$;",
      restore: sql("select pg_get_functiondef('private.fees_due(uuid)'::regprocedure);"),
    },
    {
      name: "modification-prix-en-baisse",
      file: "modification-trajet.test.ts",
      test: "le nouveau prix n'est jamais inférieur",
      inject: originalRouteChange.replace("greatest(r.price_est,", "least(r.price_est,"),
      restore: originalRouteChange,
    },
    {
      name: "covoiturage-places-illimitees",
      file: "covoiturage.test.ts",
      test: "jamais plus de trois places",
      inject:
        "create or replace function private.shared_seats_taken(p_driver uuid, p_except uuid) returns integer language sql stable security definer set search_path=public as $$ select 0 $$;",
      restore: sql(
        "select pg_get_functiondef('private.shared_seats_taken(uuid,uuid)'::regprocedure);",
      ),
    },
    {
      name: "livraison-sans-preuve",
      file: "livraison.test.ts",
      test: "remise : photo et code exigés",
      inject: "drop trigger rides_delivery_proof on public.rides;",
      restore:
        "create trigger rides_delivery_proof before update of status on public.rides for each row execute function private.require_delivery_proof();",
    },
  ];
}
