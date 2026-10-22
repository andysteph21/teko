// Autorité du devis : identité vérifiée, métriques Valhalla côté serveur,
// prix calculé en base, devis propriétaire consommable une seule fois.
import { admin, json } from "../_shared/db.ts";

interface Point { lon: number; lat: number }
function validPoint(p: unknown): p is Point {
  if (!p || typeof p !== "object") return false;
  const v = p as Point;
  return Number.isFinite(v.lon) && Number.isFinite(v.lat)
    && Math.abs(v.lon) <= 180 && Math.abs(v.lat) <= 90;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "authentification requise" }, 401);
  const db = admin();
  const identity = await db.auth.getUser(token);
  if (identity.error || !identity.data.user) return json({ error: "session invalide" }, 401);
  try {
    const body = await req.json();
    const { origin, destination, category } = body;
    if (!validPoint(origin) || !validPoint(destination) || !["eco", "moto", "confort"].includes(category)) {
      return json({ error: "trajet invalide" }, 400);
    }
    const url = Deno.env.get("VALHALLA_URL");
    if (!url) return json({ error: "itinéraires non configurés" }, 503);
    const route = await fetch(`${url.replace(/\/$/, "")}/route`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [{ lon: origin.lon, lat: origin.lat }, { lon: destination.lon, lat: destination.lat }],
        costing: category === "moto" ? "motorcycle" : "auto", units: "kilometers",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!route.ok) return json({ error: "itinéraire indisponible" }, 503);
    const payload = await route.json();
    const summary = payload.trip?.summary;
    const shape = payload.trip?.legs?.[0]?.shape;
    if (!shape || !Number.isFinite(summary?.length) || !Number.isFinite(summary?.time)) {
      return json({ error: "itinéraire invalide" }, 503);
    }
    const { data, error } = await db.rpc("create_ride_quote", {
      p_client: identity.data.user.id, p_category: category,
      p_origin: `SRID=4326;POINT(${origin.lon} ${origin.lat})`,
      p_dest: `SRID=4326;POINT(${destination.lon} ${destination.lat})`,
      p_distance_m: Math.round(summary.length * 1000), p_duration_s: Math.round(summary.time), p_shape: shape,
    });
    if (error) return json({ error: error.code === "42501" ? "compte non autorisé" : "devis impossible pour ce trajet" }, error.code === "42501" ? 403 : 422);
    return json(data);
  } catch {
    return json({ error: "service de devis indisponible" }, 503);
  }
});
