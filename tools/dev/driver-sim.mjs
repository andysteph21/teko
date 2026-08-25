// Simulateur de chauffeur (dev) — joue le côté chauffeur d'une course réelle
// contre la stack locale pour vérifier l'app CLIENT sur appareil : connexion
// OTP de test, heartbeat, acceptation de l'offre, arrivée, saisie du PIN
// (stdin), course avec positions, fin de course.
// Usage : node tools/dev/driver-sim.mjs   (préparer via setup-driver.sh)

import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const PHONE = "+24107000002";
const BASE = { lon: 9.456, lat: 0.401 };

const log = (m) => console.log(`[sim] ${new Date().toISOString().slice(11, 19)} ${m}`);
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
  log(`connecté en tant que chauffeur ${auth.user.id.slice(0, 8)}`);

  await supabase.rpc("driver_heartbeat", { p_point: ewkt(BASE) });
  log("heartbeat envoyé — en ligne, en attente d'une offre…");
  // ATTENTION supabase-js : un builder ne s'exécute QUE s'il est attendu
  // (thenable) — `void rpc(...)` n'envoie RIEN (vécu : présence expirée).
  const heartbeat = setInterval(() => {
    supabase
      .rpc("driver_heartbeat", { p_point: ewkt(BASE) })
      .then(({ error: e }) => e && log(`heartbeat KO : ${e.message}`));
  }, 15_000);

  // Attente d'une offre (poll 2 s).
  let offer = null;
  while (!offer) {
    const { data } = await supabase
      .from("ride_offers")
      .select("*")
      .eq("status", "pending")
      .order("offered_at", { ascending: false })
      .limit(1);
    offer = data?.[0] ?? null;
    if (!offer) await sleep(2000);
  }
  const { data: details } = await supabase.rpc("offer_details", { p_offer: offer.id });
  log(
    `OFFRE ${offer.id.slice(0, 8)} — net chauffeur ${details?.net_driver} F (destination cachée ✓)`,
  );

  const { data: ride, error: acceptError } = await supabase.rpc("respond_offer", {
    p_offer: offer.id,
    p_accept: true,
  });
  if (acceptError) throw acceptError;
  log(`course ${ride.id.slice(0, 8)} ACCEPTÉE — approche du client (8 s)…`);

  for (let i = 0; i < 4; i++) {
    await supabase.from("ride_locations").insert({
      ride_id: ride.id,
      driver_id: auth.user.id,
      geom: ewkt({ lon: BASE.lon - 0.001 * (3 - i), lat: BASE.lat + 0.0005 * (3 - i) }),
    });
    await sleep(2000);
  }

  await supabase.rpc("mark_arrived", { p_ride: ride.id });
  log("ARRIVÉ au point de rencontre — le client voit son PIN en grand.");

  const rl = createInterface({ input: process.stdin });
  process.stdout.write("[sim] Saisir le PIN affiché sur l'écran client : ");
  const pin = await new Promise((resolve) => rl.once("line", resolve));
  rl.close();

  const { error: startError } = await supabase.rpc("start_ride", {
    p_ride: ride.id,
    p_pin: pin.trim(),
  });
  if (startError) throw startError;
  log("COURSE DÉMARRÉE — trajet 20 s avec positions…");

  for (let i = 1; i <= 10; i++) {
    await supabase.from("ride_locations").insert({
      ride_id: ride.id,
      driver_id: auth.user.id,
      geom: ewkt({ lon: BASE.lon + 0.0012 * i, lat: BASE.lat - 0.0009 * i }),
    });
    await sleep(2000);
  }

  const { data: done, error: completeError } = await supabase.rpc("complete_ride", {
    p_ride: ride.id,
  });
  if (completeError) throw completeError;
  log(`COURSE TERMINÉE — prix final ${done.price_final ?? done.price_est} F. Fin du simulateur.`);
  clearInterval(heartbeat);
  process.exit(0);
}

main().catch((e) => {
  console.error("[sim] échec :", e.message ?? e);
  process.exit(1);
});
