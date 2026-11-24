// Enveloppes des lots R3 à R5 : formes d'appel et de retour, sans réseau.
import { describe, expect, it, vi } from "vitest";
import type { TekoClient } from "./client";
import {
  completeDelivery,
  deliveryCode,
  deliveryProofPath,
  getRideParcel,
  requestDelivery,
  setDeliveryEnabled,
  uploadDeliveryProof,
} from "./deliveries";
import { TekoApiError } from "./errors";
import { getRideQuote } from "./quotes";
import {
  acceptedRouteChange,
  arriveStop,
  getRouteChangeQuote,
  latestRouteChange,
  leaveStop,
  listRideStops,
  type RouteChange,
  requestRouteChange,
  respondRouteChange,
  routeChangeRoute,
} from "./route-changes";
import { serviceAvailability, setSharedRides, sharedTripProgress } from "./shared-rides";

const rpcClient = (data: unknown) => {
  const rpc = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { rpc } as unknown as TekoClient, rpc };
};
const invokeClient = (result: object) => {
  const invoke = vi.fn().mockResolvedValue(result);
  return { client: { functions: { invoke } } as unknown as TekoClient, invoke };
};
const refusal = (code: string) => ({
  data: null,
  error: { message: "refus" },
  response: { status: 422, json: async () => ({ code, request_id: "r1" }) },
});

describe("modification de trajet", () => {
  it("le devis envoie la course, la destination et les arrêts, jamais de prix", async () => {
    const { client, invoke } = invokeClient({ data: { id: "c1" }, error: null });
    await getRouteChangeQuote(client, {
      rideId: "ride",
      destination: { position: { lon: 9.48, lat: 0.42 }, hint: "portail" },
      stops: [{ position: { lon: 9.46, lat: 0.41 }, landmarkId: "lm" }],
    });
    expect(invoke).toHaveBeenCalledWith("price-quote", {
      body: {
        ride_id: "ride",
        destination: { lon: 9.48, lat: 0.42, hint: "portail" },
        stops: [{ lon: 9.46, lat: 0.41, landmark_id: "lm" }],
      },
    });
  });

  it.each([
    ["TOO_MANY_STOPS", "route_too_many_stops"],
    ["TOO_MANY_CHANGES", "route_too_many_changes"],
    ["RIDE_NOT_EDITABLE", "route_not_editable"],
  ])("le refus %s devient le code stable %s", async (code, expected) => {
    const { client } = invokeClient(refusal(code));
    const error = await getRouteChangeQuote(client, {
      rideId: "ride",
      destination: { position: { lon: 9.48, lat: 0.42 } },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(TekoApiError);
    expect(error.code).toBe(expected);
  });

  it("le tracé accepte un tronçon seul ou plusieurs tronçons joints", () => {
    const one = { route_shape: "_izlhA~rlgdF", remaining_m: 10, remaining_s: 5 } as RouteChange;
    expect(routeChangeRoute(one).coordinates).toHaveLength(1);
    const two = { ...one, route_shape: '["_izlhA~rlgdF","_izlhA~rlgdF"]' } as RouteChange;
    expect(routeChangeRoute(two)).toMatchObject({ distanceM: 10, durationS: 5 });
    expect(routeChangeRoute(two).coordinates).toHaveLength(2);
  });

  it("le départ d'un arrêt rapporte l'attente facturée en nombre", async () => {
    const { client } = rpcClient({
      id: "s1",
      seq: 1,
      geom: { type: "Point", coordinates: [9.46, 0.41] },
      landmark_id: null,
      hint: null,
      arrived_at: "a",
      left_at: "b",
      wait_charged: "75.00",
    });
    expect(await leaveStop(client, "s1")).toMatchObject({
      waitCharged: 75,
      position: { lon: 9.46, lat: 0.41 },
    });
  });
});

describe("covoiturage", () => {
  it("le devis transmet les places et traduit un service fermé", async () => {
    const open = invokeClient({ data: { id: "q" }, error: null });
    await getRideQuote(open.client, {
      category: "covoiturage",
      origin: { lon: 9.45, lat: 0.4 },
      destination: { lon: 9.47, lat: 0.4 },
      seats: 2,
    });
    expect(open.invoke.mock.calls[0]?.[1].body.seats).toBe(2);
    const closed = invokeClient(refusal("SERVICE_CLOSED"));
    const error = await getRideQuote(closed.client, {
      category: "covoiturage",
      origin: { lon: 9.45, lat: 0.4 },
      destination: { lon: 9.47, lat: 0.4 },
    }).catch((e) => e);
    expect(error.code).toBe("service_closed");
  });

  it("la progression n'expose que l'ordre des arrêts", async () => {
    const { client } = rpcClient({
      seats_taken: 3,
      seats_total: 3,
      stops: [{ kind: "pickup", mine: true, done: false }],
    });
    expect(await sharedTripProgress(client, "ride")).toEqual({
      seatsTaken: 3,
      seatsTotal: 3,
      stops: [{ kind: "pickup", mine: true, done: false }],
    });
  });
});

describe("livraison", () => {
  it("la commande envoie le colis au format du serveur", async () => {
    const { client, rpc } = rpcClient({ id: "ride" });
    await requestDelivery(client, {
      quoteId: "q",
      parcel: {
        description: "Clés",
        size: "small",
        recipientName: "Awa",
        recipientPhone: "07112233",
      },
      destinationHint: "2e étage",
    });
    expect(rpc).toHaveBeenCalledWith("request_delivery", {
      p_quote: "q",
      p_parcel: {
        description: "Clés",
        size: "small",
        recipient_name: "Awa",
        recipient_phone: "07112233",
      },
      p_dest_hint: "2e étage",
    });
  });

  it("la remise distingue le succès, le code faux et le blocage", async () => {
    const input = { rideId: "ride", code: "1234", photoPath: deliveryProofPath("ride") };
    expect(await completeDelivery(rpcClient({ ride: { id: "ride" } }).client, input)).toEqual({
      ok: true,
      ride: { id: "ride" },
    });
    expect(
      await completeDelivery(
        rpcClient({ error: "code_incorrect", attempts_remaining: 3, retry_after_s: 0 }).client,
        input,
      ),
    ).toEqual({ ok: false, error: "code_incorrect", attemptsRemaining: 3, retryAfterS: 0 });
    expect(
      (
        await completeDelivery(
          rpcClient({ error: "code_blocked", attempts_remaining: 0, retry_after_s: 300 }).client,
          input,
        )
      ).ok,
    ).toBe(false);
    expect(input.photoPath).toBe("ride/remise.jpg");
  });
});

/** Requête PostgREST chaînable qui se résout sur `rows`. */
function tableClient(rows: unknown[]) {
  const calls: unknown[][] = [];
  const query: Record<string, unknown> = {};
  for (const name of ["select", "eq", "neq", "order", "limit"]) {
    query[name] = (...args: unknown[]) => {
      calls.push([name, ...args]);
      return query;
    };
  }
  // biome-ignore lint/suspicious/noThenProperty: imite le thenable de PostgREST
  query.then = (resolve: (value: unknown) => void) => resolve({ data: rows, error: null });
  return { client: { from: () => query } as unknown as TekoClient, calls };
}
const STOP = {
  id: "s1",
  seq: 1,
  geom: { type: "Point", coordinates: [9.46, 0.41] },
  landmark_id: "lm",
  hint: "pharmacie",
  arrived_at: null,
  left_at: null,
  wait_charged: 0,
};

describe("enveloppes simples des lots R3 à R5", () => {
  it("confirmation et réponse à une modification", async () => {
    const asked = rpcClient({ id: "c1", status: "pending" });
    expect((await requestRouteChange(asked.client, "c1")).status).toBe("pending");
    expect(asked.rpc).toHaveBeenCalledWith("request_route_change", { p_change: "c1" });
    const answered = rpcClient({ id: "c1", status: "refused" });
    await respondRouteChange(answered.client, "c1", false);
    expect(answered.rpc).toHaveBeenCalledWith("respond_route_change", {
      p_change: "c1",
      p_accept: false,
    });
  });

  it("dernière modification : jamais un simple devis, null s'il n'y en a pas", async () => {
    const some = tableClient([{ id: "c1" }]);
    expect(await latestRouteChange(some.client, "ride")).toEqual({ id: "c1" });
    expect(some.calls).toContainEqual(["neq", "status", "quoted"]);
    expect(await latestRouteChange(tableClient([]).client, "ride")).toBeNull();
  });

  it("arrêts listés dans l'ordre et convertis", async () => {
    const { client, calls } = tableClient([STOP]);
    expect(await listRideStops(client, "ride")).toEqual([
      {
        id: "s1",
        seq: 1,
        position: { lon: 9.46, lat: 0.41 },
        landmarkId: "lm",
        hint: "pharmacie",
        arrivedAt: null,
        leftAt: null,
        waitCharged: 0,
      },
    ]);
    expect(calls).toContainEqual(["order", "seq"]);
    const arrived = rpcClient({ ...STOP, arrived_at: "t" });
    expect((await arriveStop(arrived.client, "s1")).arrivedAt).toBe("t");
  });

  it("options chauffeur : covoiturage et livraison", async () => {
    const shared = rpcClient(false);
    expect(await setSharedRides(shared.client, false)).toBe(false);
    expect(shared.rpc).toHaveBeenCalledWith("set_shared_rides", { p_enabled: false });
    const delivery = rpcClient(true);
    expect(await setDeliveryEnabled(delivery.client, true)).toBe(true);
    expect(delivery.rpc).toHaveBeenCalledWith("set_delivery_enabled", { p_enabled: true });
  });

  it("progression sans total : trois places par défaut", async () => {
    const { client } = rpcClient({ seats_taken: 1, stops: [] });
    expect((await sharedTripProgress(client, "ride")).seatsTotal).toBe(3);
  });

  it("code de remise et colis", async () => {
    expect(await deliveryCode(rpcClient("0420").client, "ride")).toBe("0420");
    expect(await getRideParcel(tableClient([{ ride_id: "ride" }]).client, "ride")).toEqual({
      ride_id: "ride",
    });
    expect(await getRideParcel(tableClient([]).client, "ride")).toBeNull();
  });

  it("la photo de remise part dans le dossier de la course ; un refus remonte en erreur", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const client = { storage: { from: () => ({ upload }) } } as unknown as TekoClient;
    const path = await uploadDeliveryProof(client, "ride", new ArrayBuffer(4));
    expect(path).toMatch(/^ride\/remise-\d+\.jpg$/);
    expect(upload.mock.calls[0]?.[2]).toEqual({ contentType: "image/jpeg" });
    upload.mockResolvedValue({ error: { message: "refusé" } });
    await expect(uploadDeliveryProof(client, "ride", new ArrayBuffer(4))).rejects.toBeInstanceOf(
      TekoApiError,
    );
  });

  it("commande de livraison avec repères et précisions ; remise sans détail d'erreur", async () => {
    const { client, rpc } = rpcClient({ id: "ride" });
    await requestDelivery(client, {
      quoteId: "q",
      parcel: { description: "Clés", size: "small", recipientName: "Awa", recipientPhone: "1" },
      originHint: "portail",
      originLandmarkId: "a",
      destinationLandmarkId: "b",
    });
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({
      p_origin_hint: "portail",
      p_origin_landmark: "a",
      p_dest_landmark: "b",
    });
    expect(
      await completeDelivery(rpcClient({}).client, { rideId: "r", code: "1", photoPath: "r/x" }),
    ).toEqual({ ok: false, error: "code_incorrect", attemptsRemaining: 0, retryAfterS: 0 });
  });

  it("un échec de devis de modification hors refus métier reste une erreur", async () => {
    const { client } = invokeClient(refusal("AUTRE"));
    await expect(
      getRouteChangeQuote(client, { rideId: "r", destination: { position: { lon: 9, lat: 0 } } }),
    ).rejects.toBeInstanceOf(TekoApiError);
  });

  it("modification acceptée en vigueur et ouverture des services", async () => {
    const accepted = tableClient([{ id: "c2" }]);
    expect(await acceptedRouteChange(accepted.client, "ride")).toEqual({ id: "c2" });
    expect(accepted.calls).toContainEqual(["eq", "status", "accepted"]);
    expect(await acceptedRouteChange(tableClient([]).client, "ride")).toBeNull();
    expect(await serviceAvailability(rpcClient({ delivery: true }).client)).toEqual({
      sharedRide: false,
      delivery: true,
    });
  });
});
