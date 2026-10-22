import { expect, it, vi } from "vitest";
import type { TekoClient } from "./client";
import { getRideQuote, quoteRoute, type RideQuote, requestQuotedRide } from "./quotes";

it("le devis demande au serveur le trajet et la catégorie, sans prix ni métriques client", async () => {
  const invoke = vi.fn().mockResolvedValue({ data: { id: "quote" }, error: null });
  const input = {
    category: "moto" as const,
    origin: { lon: 9.45, lat: 0.4 },
    destination: { lon: 9.47, lat: 0.41 },
  };
  expect(await getRideQuote({ functions: { invoke } } as unknown as TekoClient, input)).toEqual({
    id: "quote",
  });
  expect(invoke).toHaveBeenCalledWith("price-quote", { body: input });
});

it("une commande ne transmet que l'identifiant du devis et les indications de rendez-vous", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { id: "ride" }, error: null });
  const client = { rpc } as unknown as TekoClient;
  await requestQuotedRide(client, { quoteId: "quote" });
  expect(rpc).toHaveBeenLastCalledWith("request_quoted_ride", { p_quote: "quote" });
  await requestQuotedRide(client, {
    quoteId: "quote",
    originHint: "portail",
    destinationHint: "école",
    originLandmarkId: "a",
    destinationLandmarkId: "b",
    meetingLandmarkId: "a",
  });
  expect(rpc).toHaveBeenLastCalledWith("request_quoted_pickup", {
    p_quote: "quote",
    p_origin_hint: "portail",
    p_dest_hint: "école",
    p_dest_landmark: "b",
    p_meeting_landmark: "a",
  });
  await requestQuotedRide(client, { quoteId: "quote", originLandmarkId: "manual" });
  expect(rpc).toHaveBeenLastCalledWith("request_quoted_ride", {
    p_quote: "quote",
    p_origin_landmark: "manual",
  });
});

it("le refus d'un devis expiré est remonté pour obtenir une nouvelle confirmation", async () => {
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: null, error: { code: "22023", message: "Devis expiré" } });
  await expect(
    requestQuotedRide({ rpc } as unknown as TekoClient, { quoteId: "old" }),
  ).rejects.toMatchObject({ code: "quote_expired" });
});

it("le tracé affiché provient du devis de la catégorie sélectionnée", () => {
  const route = quoteRoute({
    route_shape: "_izlhA~rlgdF_{geC~ywl@_kwzCn`{nI",
    distance_m: 3200,
    duration_s: 720,
  } as RideQuote);
  expect(route.distanceM).toBe(3200);
  expect(route.durationS).toBe(720);
  expect(route.coordinates).toHaveLength(3);
  expect(route.coordinates[0]).toEqual({ lon: -120.2, lat: 38.5 });
});
