// Une course cash complète sur le seul banc fictif, avant de remettre les accès.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const local = resolve(root, ".local/alpha-remote");
const require = createRequire(resolve(root, "supabase/tests/e2e/package.json"));
const { createClient } = require("@supabase/supabase-js");
const config = JSON.parse(readFileSync(resolve(local, "alpha-admin.json"), "utf8"));
const accounts = JSON.parse(readFileSync(resolve(local, "accounts.json"), "utf8"));
const key = readFileSync(resolve(local, "anon-key"), "utf8").trim();
const api = "http://127.0.0.1:58421";
const origin = "https://alpha.tekomove.com";
assert.equal(config.origin, origin);
assert.equal(config.mobileClosed, true);
assert.equal(config.pool.length, 15);

async function signIn(role) {
  const account = [...config.pool, ...accounts].find((entry) => entry.role === role);
  const client = createClient(api, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.verifyOtp({ phone: "+" + account.phone, token: account.code, type: "sms" });
  assert.equal(result.error, null, role);
  return { client, session: result.data.session, id: result.data.user.id };
}

async function rpc(user, name, payload) {
  const result = await user.client.rpc(name, payload);
  assert.equal(result.error, null, name);
  return result.data;
}

const driver = await signIn("driver");
const passenger = await signIn("client");
const ops = await signIn("ops");
const finance = await signIn("finance");
const driverKey = { p_driver: driver.id };
const startBalance = Number(await rpc(driver, "driver_balance", driverKey));
assert.equal(startBalance, 0);

const proof = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=", "base64");
const from = { lon: 9.4544, lat: 0.4035 };
const to = { lon: 9.4671, lat: 0.4148 };
await rpc(driver, "driver_heartbeat", { p_point: `SRID=4326;POINT(${from.lon} ${from.lat})` });
try {
  const response = await fetch(origin + "/functions/v1/price-quote", {
    method: "POST",
    headers: { apikey: key, authorization: "Bearer " + passenger.session.access_token, "content-type": "application/json" },
    body: JSON.stringify({ category: "eco", origin: from, destination: to }),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200);
  const quote = await response.json();
  const ride = await rpc(passenger, "request_quoted_ride", { p_quote: quote.id });
  assert.equal(ride.payment_method, "cash");
  const rideKey = { p_ride: ride.id };
  await rpc(driver, "accept_ride", rideKey);
  await rpc(driver, "mark_arrived", rideKey);
  const pin = await rpc(passenger, "ride_pin", rideKey);
  assert.match(pin, /^\d{4}$/);
  const unauthorized = await driver.client.rpc("ride_pin", rideKey);
  assert.ok(unauthorized.error || unauthorized.data == null);
  assert.equal((await rpc(driver, "start_ride_checked", { ...rideKey, p_pin: pin })).ride.status, "started");
  const completed = await rpc(driver, "complete_ride", rideKey);
  assert.equal(completed.status, "completed");
  const gross = Number(completed.price_final);
  const commission = -(await rpc(driver, "driver_balance", driverKey));
  assert.equal(gross, Number(ride.price_est));
  assert.ok(commission > 0 && commission % 25 === 0);

  const path = `${ops.id}/simulation-${randomUUID()}.png`;
  const upload = await ops.client.storage.from("finance-proofs").upload(path, proof, { contentType: "image/png" });
  assert.equal(upload.error, null);
  const receipt = await rpc(ops, "prepare_manual_receipt", {
    p_driver: driver.id, p_kind: "settlement", p_amount: commission, p_method: "cash",
    p_reference: `SIM-${ride.id.slice(0, 8)}`, p_proof_path: path,
  });
  assert.equal(receipt.status, "pending");
  assert.equal(Number(await rpc(driver, "driver_balance", driverKey)), -commission);
  const receiptKey = { p_receipt: receipt.id };
  assert.equal((await ops.client.rpc("approve_manual_receipt", receiptKey)).error?.code, "42501");
  const approvals = await Promise.all([rpc(finance, "approve_manual_receipt", receiptKey), rpc(finance, "approve_manual_receipt", receiptKey)]);
  assert.ok(approvals[0].payment_id);
  assert.equal(approvals[0].payment_id, approvals[1].payment_id);
  const ledger = await finance.client.from("ledger").select("amount_signed").eq("payment_id", approvals[0].payment_id);
  assert.equal(ledger.error, null);
  assert.deepEqual(ledger.data.map((row) => Number(row.amount_signed)), [commission]);
  const balanceAfter = Number(await rpc(driver, "driver_balance", driverKey));
  assert.equal(balanceAfter, 0);
  console.log(JSON.stringify({ ride: ride.id.slice(0, 8).toUpperCase(), gross, commission, netDriver: gross - commission, balanceAfter }));
} finally {
  await rpc(driver, "driver_offline");
}
