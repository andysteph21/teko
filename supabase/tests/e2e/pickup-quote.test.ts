import { afterAll, expect, it } from "vitest";
import { admin, createUser, db, DEST, serviceSql } from "./helpers";

afterAll(async () => { await db.end(); });
async function landmark() {
  const result = await serviceSql(`select id,
    extensions.st_asewkt(geom) as exact,
    extensions.st_asewkt(extensions.st_translate(geom,0.00002,0)) as displaced
    from public.landmarks where status='validated' order by id limit 1`);
  if (!result.rows[0]) throw new Error("Repère seed requis");
  return result.rows[0] as { id: string; exact: string; displaced: string };
}
async function quote(clientId: string, origin: string, distance = 3200) {
  const result = await admin.rpc("create_ride_quote", {
    p_client: clientId, p_category: "eco", p_origin: origin, p_dest: DEST,
    p_distance_m: distance, p_duration_s: 720, p_shape: "fixture-shape",
  });
  if (result.error) throw result.error;
  return result.data;
}
function pickupArgs(quoteId: string, meeting: string | null) {
  return { p_quote: quoteId, p_origin_hint: null, p_dest_hint: null,
    p_dest_landmark: null, p_meeting_landmark: meeting };
}

it("garder la position ne rattache aucun repère proche et conserve exactement le départ du devis", async () => {
  const owner = await createUser(); const point = await landmark();
  const q = await quote(owner.id, point.displaced);
  const result = await owner.client.rpc("request_quoted_ride", { p_quote: q.id });
  expect(result.error).toBeNull();
  expect(result.data.meeting_landmark_id).toBeNull();
  const stored = await serviceSql(`select extensions.st_equals(r.origin_geom,q.origin_geom) as same
    from public.rides r join public.ride_quotes q on q.ride_id=r.id where r.id=$1`, [result.data.id]);
  expect(stored.rows[0].same).toBe(true);
});

it("un départ déplacé de deux mètres exige un nouveau devis avant de confirmer le repère", async () => {
  const owner = await createUser(); const point = await landmark();
  const previous = await quote(owner.id, point.displaced);
  const forged = await owner.client.rpc("request_quoted_pickup", pickupArgs(previous.id, point.id));
  expect(forged.error?.code).toBe("22023");
  expect((await serviceSql("select ride_id from public.ride_quotes where id=$1", [previous.id])).rows[0].ride_id).toBeNull();
  const next = await quote(owner.id, point.exact, 5100);
  expect(Number(next.price)).not.toBe(Number(previous.price));
  const result = await owner.client.rpc("request_quoted_pickup", pickupArgs(next.id, point.id));
  expect(result.error).toBeNull();
  expect(result.data.meeting_landmark_id).toBe(point.id);
  expect(Number(result.data.price_est)).toBe(Number(next.price));
  const again = await owner.client.rpc("request_quoted_pickup", pickupArgs(next.id, point.id));
  expect(again.error).toBeNull(); expect(again.data.id).toBe(result.data.id);
  expect((await serviceSql("select count(*)::int as n from public.rides where client_id=$1", [owner.id])).rows[0].n).toBe(1);
});

it("ni le libellé de départ ni celui de destination ne peuvent désigner un autre point que le devis", async () => {
  const owner = await createUser(); const point = await landmark();
  const q = await quote(owner.id, point.displaced);
  const origin = await owner.client.rpc("request_quoted_ride", { p_quote: q.id, p_origin_landmark: point.id });
  expect(origin.error?.code).toBe("22023");
  const destination = await owner.client.rpc("request_quoted_ride", { p_quote: q.id, p_dest_landmark: point.id });
  expect(destination.error?.code).toBe("22023");
  expect((await serviceSql("select count(*)::int as n from public.rides where client_id=$1", [owner.id])).rows[0].n).toBe(0);
});

it("un devis de rencontre reste nominatif et la nouvelle signature conserve le contrôle d'invitation", async () => {
  const owner = await createUser(); const outsider = await createUser();
  const point = await landmark(); const q = await quote(owner.id, point.exact);
  const steal = await outsider.client.rpc("request_quoted_pickup", pickupArgs(q.id, point.id));
  expect(steal.error?.code).toBe("42501");
  const missing = await owner.client.rpc("request_quoted_pickup", pickupArgs(q.id, null));
  expect(missing.error?.code).toBe("22023");
  await serviceSql("update public.alpha_invites set is_active=false where phone=(select phone from auth.users where id=$1)", [owner.id]);
  const removed = await owner.client.rpc("request_quoted_pickup", pickupArgs(q.id, point.id));
  expect(removed.error?.code).toBe("42501");
});
