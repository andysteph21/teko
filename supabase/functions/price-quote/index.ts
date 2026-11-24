// Valhalla calcule le trajet et Postgres fige le prix. Aucun point GPS en journal.
import { admin, json } from "../_shared/db.ts";
import { changeQuote } from "./change.ts";
import { tripQuote } from "./trip.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "méthode non autorisée" }, 405);
  }
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: "authentification requise" }, 401);
  const db = admin();
  const identity = await db.auth.getUser(token);
  if (identity.error || !identity.data.user) {
    return json({ error: "session invalide" }, 401);
  }
  const actor = identity.data.user.id;
  const requestId = crypto.randomUUID();
  const fail = (code: string, status: number) => {
    console.warn(
      JSON.stringify({
        event: "quote_rejected",
        requestId,
        actor,
        code,
        status,
      }),
    );
    return json({ code, request_id: requestId }, status);
  };

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("INVALID_TRIP", 400);
  const change = typeof body.ride_id === "string";
  try {
    const outcome = change
      ? await changeQuote(db, actor, body)
      : await tripQuote(db, actor, body);
    if ("code" in outcome) return fail(outcome.code, outcome.status);
    console.info(
      JSON.stringify({
        event: change ? "route_change_quoted" : "quote_created",
        requestId,
        actor,
      }),
    );
    return json(outcome.data);
  } catch {
    return fail("QUOTE_UNAVAILABLE", 503);
  }
});
