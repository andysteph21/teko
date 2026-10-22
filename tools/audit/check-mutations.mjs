// Injecte des fautes seulement dans la stack jetable, puis restaure les gardes.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const container = "supabase_db_teko-alpha-audit";
const evidence = resolve(root, ".local/alpha-evidence/mutations");
mkdirSync(evidence, { recursive: true, mode: 0o700 });
const sql = (input) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-X",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
const originalPrice = sql(
  "select pg_get_functiondef('public.complete_ride(uuid,numeric)'::regprocedure);",
);
const originalCommission = sql(
  "select pg_get_functiondef('public.commission_amount(numeric)'::regprocedure);",
);
const originalEstimate = sql(
  "select pg_get_functiondef('public.estimate_price(public.vehicle_category,integer,integer,uuid)'::regprocedure);",
);
const originalCancel = sql(
  "select pg_get_functiondef('public.cancel_ride(uuid,text,public.ride_status)'::regprocedure);",
);
const originalShare = sql(
  "select pg_get_functiondef('public.cancellation_driver_share(numeric,jsonb)'::regprocedure);",
);
const originalPrepare = sql(
  "select pg_get_functiondef('public.prepare_manual_receipt(uuid,text,numeric,text,text,text,uuid)'::regprocedure);",
);
const originalPin = sql("select pg_get_functiondef('public.ride_pin(uuid)'::regprocedure);");
const originalPickup = sql(
  "select pg_get_functiondef('private.request_quoted_ride(uuid,text,text,uuid,uuid,uuid)'::regprocedure);",
);
const gpsCheck = sql(
  "select pg_get_expr(polwithcheck,polrelid) from pg_policy where polrelid='public.ride_locations'::regclass and polname='ride_locations_insert_driver';",
).trim();
const originalApproval = sql(
  "select pg_get_functiondef('public.approve_manual_receipt(uuid)'::regprocedure);",
);
const originalApprovalInternal = sql(
  "select pg_get_functiondef('public._approve_manual_receipt_v1(uuid)'::regprocedure);",
);
const originalPinLimit = sql(
  "select pg_get_functiondef('public.start_ride_checked(uuid,text)'::regprocedure);",
);
const kycTablePolicy = sql(
  "select pg_get_expr(polqual,polrelid) from pg_policy where polrelid='public.driver_documents'::regclass and polname='documents_select_owner_or_admin'",
).trim();
const kycFilePolicy = sql(
  "select pg_get_expr(polqual,polrelid) from pg_policy where polrelid='storage.objects'::regclass and polname='kyc_select_own_or_admin'",
).trim();
const mutants = [
  {
    name: "reglement-sans-pas25",
    file: "receipt-cash-step.test.ts",
    test: "refuse un nouveau justificatif hors pas de 25",
    inject: originalPrepare.replace(" or mod(p_amount,25)<>0", ""),
    restore: originalPrepare,
    expected: "expected undefined to be '22023'",
  },
  {
    name: "reglement-arrondi-cache",
    file: "receipt-cash-step.test.ts",
    test: "refuse un nouveau justificatif hors pas de 25",
    inject: originalPrepare.replace("mod(p_amount,25)", "mod(round(p_amount,2),25)"),
    restore: originalPrepare,
    expected: "expected undefined to be '22023'",
  },
  {
    name: "commission-sans-pas25",
    test: "la commission des nouvelles courses cash",
    inject: originalCommission.replace(
      "private.round_cash_amount(p_price * cval / 100.0)",
      "round(p_price * cval / 100.0,2)",
    ),
    restore: originalCommission,
    expected: "expected -180.45 to be -175",
  },
  {
    name: "devis-sans-pas25",
    file: "quotes.test.ts",
    test: "le nouveau devis arrondi au pas de 25",
    inject: originalEstimate.replace("private.round_cash_amount(v)", "round(v)"),
    restore: originalEstimate,
    expected: "expected 1203 to be 1200",
  },
  {
    name: "frais-sans-pas25",
    file: "manual-receipts.test.ts",
    test: "crédite exactement la part figée",
    inject: originalCancel.replace("fee:=private.round_cash_amount(fee); ", ""),
    restore: originalCancel,
    expected: "expected 320 to be 325",
  },
  {
    name: "part-chauffeur-sans-pas25",
    file: "manual-receipts.test.ts",
    test: "crédite exactement la part figée",
    inject: originalShare.replace("private.round_cash_amount(", "round("),
    restore: originalShare,
    expected: "expected 228 to be 225",
  },
  {
    name: "devis-depart-deplace",
    file: "pickup-quote.test.ts",
    test: "un départ déplacé de deux mètres",
    inject: originalPickup.replaceAll("geography,0.1)", "geography,300)"),
    restore: originalPickup,
  },
  {
    name: "repere-impose-au-gps",
    file: "pickup-quote.test.ts",
    test: "garder la position ne rattache aucun repère",
    inject: originalPickup.replace(
      "p_origin_landmark,p_dest_landmark,p_origin_hint,p_dest_hint,p_meeting_landmark,",
      `p_origin_landmark,p_dest_landmark,p_origin_hint,p_dest_hint,
      coalesce(p_meeting_landmark,(select id from public.landmarks where status='validated'
        and st_dwithin(geom::geography,q.origin_geom::geography,300) order by id limit 1)),`,
    ),
    restore: originalPickup,
  },
  {
    name: "invitation-heartbeat-contournee",
    file: "alpha-invitations.test.ts",
    test: "une invitation chauffeur retirée",
    inject:
      "create or replace function public.is_alpha_invited(p_role text) returns boolean language sql stable security definer set search_path=public as $$ select true $$;",
    restore: sql("select pg_get_functiondef('public.is_alpha_invited(text)'::regprocedure);"),
  },
  {
    name: "gps-retention-visible",
    file: "gps-retention.test.ts",
    test: "cache les points de plus de 7 jours",
    inject: "alter policy ride_locations_retention_read on public.ride_locations using(true);",
    restore: `alter policy ride_locations_retention_read on public.ride_locations using (${sql("select pg_get_expr(polqual,polrelid) from pg_policy where polrelid='public.ride_locations'::regclass and polname='ride_locations_retention_read'").trim()});`,
  },
  {
    name: "push-file-publique",
    file: "push-delivery.test.ts",
    test: "deux workers concurrents",
    inject: "grant execute on function public.claim_push_deliveries(uuid) to authenticated;",
    restore: "revoke execute on function public.claim_push_deliveries(uuid) from authenticated;",
  },
  {
    name: "push-offre-expiree",
    file: "push-delivery.test.ts",
    test: "une offre expirée",
    inject: sql(
      "select pg_get_functiondef('public.claim_push_deliveries(uuid)'::regprocedure);",
    ).replace(/q\.expires_at\s*>\s*now\(\)/g, "true"),
    restore: sql("select pg_get_functiondef('public.claim_push_deliveries(uuid)'::regprocedure);"),
  },
  {
    name: "validation-finance-ops",
    file: "manual-receipts.test.ts",
    test: "Ops prépare sans crédit",
    inject: `${[originalApproval, originalApprovalInternal]
      .map((definition) =>
        definition.replaceAll(
          "public.has_admin_role('finance')",
          "(public.has_admin_role('finance') or public.has_admin_role('ops'))",
        ),
      )
      .join(";\n")};`,
    restore: `${originalApproval};\n${originalApprovalInternal};`,
  },
  {
    name: "kyc-table-finance",
    file: "kyc-boundaries.test.ts",
    test: "Finance et Carto ne lisent pas",
    inject:
      "alter policy documents_select_owner_or_admin on public.driver_documents using (driver_id=auth.uid() or public.is_admin());",
    restore: `alter policy documents_select_owner_or_admin on public.driver_documents using (${kycTablePolicy});`,
  },
  {
    name: "kyc-fichier-finance",
    file: "kyc-boundaries.test.ts",
    test: "Finance et Carto ne lisent pas",
    inject:
      "alter policy kyc_select_own_or_admin on storage.objects using (bucket_id='kyc' and public.is_admin());",
    restore: `alter policy kyc_select_own_or_admin on storage.objects using (${kycFilePolicy});`,
  },
  {
    name: "pin-compteur-non-persistant",
    file: "pin-attempts.test.ts",
    test: "cinq échecs persistent",
    inject: originalPinLimit.replace(
      "failed_attempts=attempts,blocked_until=blocked",
      "failed_attempts=0,blocked_until=null",
    ),
    restore: originalPinLimit,
  },
  {
    name: "ecriture-directe",
    test: "le passager ne peut pas terminer directement",
    inject: "grant update on public.rides to authenticated;",
    restore: "revoke update on public.rides from authenticated;",
  },
  {
    name: "transition-interne",
    test: "un utilisateur ne peut pas appeler la transition interne",
    inject:
      "grant execute on function public._driver_transition(uuid,public.ride_status[],public.ride_status,text) to authenticated;",
    restore:
      "revoke execute on function public._driver_transition(uuid,public.ride_status[],public.ride_status,text) from authenticated;",
  },
  {
    name: "gps-usurpe",
    test: "un tiers ne peut pas injecter sa position",
    inject:
      "alter policy ride_locations_insert_driver on public.ride_locations with check (driver_id=auth.uid());",
    restore: `alter policy ride_locations_insert_driver on public.ride_locations with check (${gpsCheck});`,
  },
  {
    name: "pin-chauffeur",
    test: "seul le passager récupère le PIN privé",
    inject: originalPin.replace(
      "client_id = auth.uid()",
      "(client_id = auth.uid() or driver_id = auth.uid())",
    ),
    restore: originalPin,
  },
  {
    name: "prix-falsifie",
    test: "un prix final falsifié est refusé",
    inject: originalPrice
      .replace(/ {2}if p_price_final is not null[\s\S]*? {2}end if;\n/, "")
      .replace(
        "public._complete_ride(p_ride, null)",
        "public._complete_ride(p_ride, p_price_final)",
      ),
    restore: originalPrice,
  },
];
const results = [];
for (const mutant of mutants) {
  if (mutant.inject === mutant.restore) throw new Error(`Mutation sans effet : ${mutant.name}`);
  try {
    sql(mutant.inject);
    const result = spawnSync(
      process.execPath,
      [
        "tools/audit/run-bench.mjs",
        process.execPath,
        "node_modules/vitest/vitest.mjs",
        "run",
        "--pool=forks",
        "--maxWorkers=1",
        "--no-file-parallelism",
        mutant.file ?? "security-alpha.test.ts",
        "-t",
        mutant.test,
      ],
      { cwd: root, encoding: "utf8" },
    );
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    writeFileSync(`${evidence}/${mutant.name}.log`, output);
    // Une erreur d'infrastructure n'est pas une détection de la faute.
    const killed =
      result.status === 1 &&
      /AssertionError/.test(output) &&
      /1 failed/.test(output) &&
      (!mutant.expected || output.includes(mutant.expected));
    results.push({ mutation: mutant.name, detected: killed });
    console.info(`${mutant.name} : ${killed ? "DÉTECTÉE" : "NON DÉMONTRÉE"}`);
  } finally {
    sql(mutant.restore);
  }
}
writeFileSync(`${evidence}/results.json`, `${JSON.stringify(results, null, 2)}\n`);
if (results.some((r) => !r.detected)) process.exitCode = 1;
