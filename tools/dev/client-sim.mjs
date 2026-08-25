// Simulateur de client (dev) — joue le côté client d'une course réelle
// contre la stack locale pour vérifier l'app CHAUFFEUR sur appareil :
// connexion OTP de test, demande de course, affichage du PIN à saisir sur
// l'appareil chauffeur, suivi du statut jusqu'à la fin, notation.
// Usage : node tools/dev/client-sim.mjs   (compte +24107000001)

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const PHONE = "+24107000001";
const ORIGIN = { lon: 9.456, lat: 0.4015 };
const DEST = { lon: 9.468, lat: 0.392 };

const log = (m) => console.log(`[client] ${new Date().toISOString().slice(11, 19)} ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ewkt = (p) => `SRID=4326;POINT(${p.lon} ${p.lat})`;

const supabase = createClient(URL, ANON);

async function main() {
  await supabase.auth.signInWithOtp({ phone: PHONE });
  const { data: auth, error } = await supabase.auth.verifyOtp({
    phone: PHONE,
    token: "123456",
    type: "sms",
  });
  if (error) throw error;
  log(`connectée en tant que cliente ${auth.user.id.slice(0, 8)}`);

  const { data: price, error: priceError } = await supabase.rpc("estimate_price", {
    p_category: "eco",
    p_distance_m: 2600,
    p_duration_s: 540,
  });
  if (priceError) throw priceError;
  log(`estimation Éco : ${price} F`);

  const { data: ride, error: requestError } = await supabase.rpc("request_ride", {
    p_category: "eco",
    p_origin: ewkt(ORIGIN),
    p_dest: ewkt(DEST),
    p_distance_m: 2600,
    p_duration_s: 540,
    p_origin_hint: "Devant la pharmacie, gilet jaune",
    p_dest_hint: "Portail bleu après le carrefour",
    p_payment_method: "cash",
  });
  if (requestError) throw requestError;
  log(`course ${ride.id.slice(0, 8)} DEMANDÉE — offre envoyée aux chauffeurs proches…`);

  // Suivi du statut (poll 2 s) — le PIN s'affiche dès l'acceptation, comme
  // sur l'écran client C-11 : à saisir sur l'appareil chauffeur (D-12).
  let last = ride.status;
  let pinShown = false;
  let driverId = null;
  for (;;) {
    const { data: current, error: readError } = await supabase
      .from("rides")
      .select("status, pin_code, price_final, price_est, cancel_reason, driver_id")
      .eq("id", ride.id)
      .single();
    if (readError) throw readError;
    driverId = current.driver_id ?? driverId;
    if (current.status !== last) {
      last = current.status;
      log(`statut → ${current.status}`);
    }
    if (!pinShown && ["accepted", "enroute", "arrived"].includes(current.status)) {
      log(`>>> PIN à donner au chauffeur : ${current.pin_code} <<<`);
      pinShown = true;
    }
    if (current.status === "completed") {
      log(`course TERMINÉE — ${current.price_final ?? current.price_est} F.`);
      break;
    }
    if (["cancelled", "no_show"].includes(current.status)) {
      log(`course interrompue (${current.status}) : ${current.cancel_reason ?? "—"}`);
      process.exit(1);
    }
    await sleep(2000);
  }

  const { error: rateError } = await supabase.from("ratings").insert({
    ride_id: ride.id,
    from_user: auth.user.id,
    to_user: driverId,
    stars: 5,
  });
  log(rateError ? `notation KO : ${rateError.message}` : "chauffeur noté 5/5. Fin du simulateur.");
  process.exit(0);
}

main().catch((e) => {
  console.error("[client] échec :", e.message ?? e);
  process.exit(1);
});
