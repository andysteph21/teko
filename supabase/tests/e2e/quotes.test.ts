import { afterAll, expect, it } from "vitest";
import { API_URL, ANON_KEY, admin, db, createUser, serviceSql, ORIGIN, DEST } from "./helpers";

afterAll(async () => { await db.end(); });

async function quoteFixture(clientId: string, distance = 3200) {
  const r = await admin.rpc("create_ride_quote", {
    p_client: clientId, p_category: "eco", p_origin: ORIGIN, p_dest: DEST,
    p_distance_m: distance, p_duration_s: 720, p_shape: "fixture-shape",
  });
  if (r.error) throw r.error;
  return r.data;
}

it("le nouveau devis arrondi au pas de 25 reste le prix ferme consommé", async () => {
  const owner = await createUser();
  const q = await quoteFixture(owner.id,1612);
  expect(Number(q.price)).toBe(1200);
  const created = await owner.client.rpc("request_quoted_ride", { p_quote: q.id });
  expect(created.error).toBeNull();
  expect(Number(created.data.price_est)).toBe(1200);
  const retry = await owner.client.rpc("request_quoted_ride", { p_quote: q.id });
  expect(retry.error).toBeNull();
  expect(retry.data.id).toBe(created.data.id);
});

it("un devis appartient à son passager, pas à un autre utilisateur", async () => {
  const owner = await createUser();
  const stranger = await createUser();
  const q = await quoteFixture(owner.id);
  const read = await stranger.client.from("ride_quotes").select("*").eq("id", q.id);
  expect(read.error).toBeNull();
  expect(read.data).toEqual([]);
  const use = await stranger.client.rpc("request_quoted_ride", { p_quote: q.id });
  expect(use.error?.code).toBe("42501");
});

it("deux consommations concurrentes du même devis créent une seule course", async () => {
  const owner = await createUser();
  const q = await quoteFixture(owner.id);
  const results = await Promise.all([
    owner.client.rpc("request_quoted_ride", { p_quote: q.id }),
    owner.client.rpc("request_quoted_ride", { p_quote: q.id }),
  ]);
  expect(results.map((r) => r.error)).toEqual([null, null]);
  expect(results[0].data.id).toBe(results[1].data.id);
  expect(Number(results[0].data.price_est)).toBe(1600);
  expect(results[0].data.payment_method).toBe("cash");
  const rides = await serviceSql("select id from public.rides where client_id=$1", [owner.id]);
  expect(rides.rows).toHaveLength(1);
  const events = await serviceSql("select id from public.ride_events where ride_id=$1 and type='requested'", [results[0].data.id]);
  expect(events.rows).toHaveLength(1);
});

it("un devis expiré ne crée rien et demande une nouvelle confirmation", async () => {
  const owner = await createUser();
  const q = await quoteFixture(owner.id);
  expect(Date.parse(q.expires_at) - Date.parse(q.created_at)).toBe(300_000);
  await serviceSql("update public.ride_quotes set expires_at=now()-interval '1 second' where id=$1", [q.id]);
  const r = await owner.client.rpc("request_quoted_ride", { p_quote: q.id });
  expect(r.error?.code).toBe("22023");
  expect(r.error?.message).toBe("Devis expiré");
  const rides = await serviceSql("select id from public.rides where client_id=$1", [owner.id]);
  expect(rides.rows).toHaveLength(0);
});

it("l’utilisateur ne peut ni fabriquer un devis ni appeler l’ancien contrat", async () => {
  const owner = await createUser();
  const forged = await owner.client.rpc("create_ride_quote", {
    p_client: owner.id, p_category: "eco", p_origin: ORIGIN, p_dest: DEST,
    p_distance_m: 1, p_duration_s: 1, p_shape: "forged",
  });
  expect(forged.error?.code).toBe("42501");
  const old = await owner.client.rpc("request_ride", {
    p_category: "eco", p_origin: ORIGIN, p_dest: DEST,
    p_distance_m: 1, p_duration_s: 1, p_payment_method: "airtel",
    p_scheduled_at: new Date(Date.now()+86_400_000).toISOString(),
  });
  expect(old.error?.code).toBe("42501");
});

it("le devis HTTP réel utilise Valhalla côté serveur et ignore le prix proposé", async () => {
  const owner = await createUser();
  const session = await owner.client.auth.getSession();
  const response = await fetch(`${API_URL}/functions/v1/price-quote`, {
    method: "POST", headers: {
      "Content-Type": "application/json", apikey: ANON_KEY!,
      Authorization: `Bearer ${session.data.session!.access_token}`,
    },
    body: JSON.stringify({ category: "eco", origin: { lon: 9.4536, lat: 0.4032 },
      destination: { lon: 9.4671, lat: 0.4148 }, distance_m: 1, price: 1 }),
  });
  const q = await response.json();
  expect(response.status, JSON.stringify(q)).toBe(200);
  expect(q.client_id).toBe(owner.id);
  expect(q.distance_m).toBeGreaterThan(100);
  expect(Number(q.price)).toBeGreaterThan(1);
  expect(q.route_shape.length).toBeGreaterThan(10);
});
