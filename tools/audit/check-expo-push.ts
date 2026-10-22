// Essai réel Expo limité aux comptes synthétiques du banc USB, sans clé privée.
import { admin } from "../../supabase/functions/_shared/db.ts";
import { expoProvider } from "../../supabase/functions/_shared/push/expo.ts";
import { expoReceipts } from "../../supabase/functions/_shared/push/receipts.ts";
import { deliverPending } from "../../supabase/functions/notify-push/delivery.ts";

if (
  Deno.env.get("SUPABASE_URL") !== "http://127.0.0.1:58321" ||
  Deno.env.get("TEKO_E2E_DISPOSABLE") !== "teko-alpha-audit"
) {
  throw new Error("Banc USB isolé requis");
}
const db = admin();
const [app, notificationId] = Deno.args;
if (!["client", "driver"].includes(app)) throw new Error("Application attendue");
const fixture = app === "client" ? "Passager banc USB" : "Chauffeur banc USB";
const expectedPhone = app === "client" ? "24107000001" : "24107000002";
const profile = await db.from("profiles").select("id,phone").eq("full_name", fixture).single();
if (profile.error || profile.data.phone.replace(/\D/g, "") !== expectedPhone) {
  throw new Error("Compte synthétique introuvable");
}
const devices = await db.from("devices").select("id").eq("user_id", profile.data.id);
if (devices.error || devices.data.length !== 1) throw new Error("Un seul téléphone Expo attendu");
if (notificationId === "auth-check") {
  const device = await db
    .from("devices")
    .select("push_token")
    .eq("id", devices.data[0].id)
    .single();
  if (device.error) throw new Error("Jeton synthétique introuvable");
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      to: device.data.push_token,
      title: "Test protection alpha",
      body: "Cet envoi doit être refusé.",
    }),
  });
  const body = await response.json();
  const denied =
    Array.isArray(body.errors) &&
    body.errors.some((e: { code: string }) => e.code === "UNAUTHORIZED");
  console.info(JSON.stringify({ app, unauthenticatedRejected: denied, http: response.status }));
  if (!denied)
    throw new Error("La protection Expo ne refuse pas encore l'envoi sans jeton serveur");
  Deno.exit(0);
}
let id = notificationId;
if (!id) {
  const result = await db
    .from("notifications")
    .insert({
      user_id: profile.data.id,
      type: "alpha_push_test",
      payload: {},
    })
    .select("id")
    .single();
  if (result.error) throw new Error("Création notification impossible");
  id = result.data.id;
  const sent = await deliverPending(db, expoProvider(Deno.env.get("EXPO_ACCESS_TOKEN")), id);
  console.info(JSON.stringify({ app, notificationId: id, sent, provider: "expo" }));
}
const delivery = await db
  .from("push_deliveries")
  .select("status,ticket_id,detail")
  .eq("notification_id", id)
  .eq("device_id", devices.data[0].id)
  .single();
if (delivery.error) throw new Error("Preuve de livraison introuvable");
const row = delivery.data;
if (row.ticket_id) {
  const receipts = await expoReceipts([row.ticket_id], Deno.env.get("EXPO_ACCESS_TOKEN"));
  const receipt = receipts[row.ticket_id];
  console.info(
    JSON.stringify({
      app,
      notificationId: id,
      queue: row.status,
      receipt: receipt?.status ?? "pending",
      error: receipt?.details?.error ?? null,
      meaning: "Un reçu ok prouve l’acceptation FCM/APNs ; vérifier aussi le téléphone.",
    }),
  );
} else {
  console.info(JSON.stringify({ app, notificationId: id, queue: row.status, error: row.detail }));
}
