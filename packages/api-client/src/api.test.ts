// Tests unitaires des enveloppes RPC — client Supabase simulé. Le contrat
// réel est couvert par supabase/tests/e2e (52 tests) ; ici : mapping des
// arguments (EWKT, p_*), conversions numériques, propagation d'erreurs.

import { describe, expect, it, vi } from "vitest";
import {
  cancelAccountDeletion,
  getProfile,
  needsReverification,
  registerDevice,
  requestAccountDeletion,
  touchLastSeen,
  updateProfile,
} from "./account";
import type { TekoClient } from "./client";
import { createTekoClient } from "./client";
import { driverHeartbeat, listPendingOffers, offerDetails, respondOffer } from "./dispatch";
import { TekoApiError } from "./errors";
import {
  createSettlementPayment,
  driverBalance,
  invokeCollect,
  listMyLedger,
  listMyStatements,
} from "./finance";
import { listNotifications, markNotificationRead } from "./notifications";
import {
  cancelRide,
  completeRide,
  estimateCancellationFee,
  estimatePrice,
  findActiveRide,
  listMyRides,
  markArrived,
  rateRide,
  requestRide,
  rideDriverCard,
  startRide,
} from "./rides";
import { createTripShare, getSharedTrip, reportIncident } from "./safety";

function rpcClient(data: unknown, error: unknown = null): TekoClient {
  return { rpc: vi.fn().mockResolvedValue({ data, error }) } as unknown as TekoClient;
}

function lastRpcCall(client: TekoClient): [string, Record<string, unknown>] {
  const mock = (client.rpc as ReturnType<typeof vi.fn>).mock;
  return mock.calls[0] as [string, Record<string, unknown>];
}

const CHAIN_METHODS = [
  "from",
  "select",
  "in",
  "upsert",
  "insert",
  "update",
  "eq",
  "is",
  "order",
  "limit",
  "single",
] as const;

type TableClientMock = TekoClient &
  Record<(typeof CHAIN_METHODS)[number], ReturnType<typeof vi.fn>>;

/** Chaîne PostgREST simulée : chaque méthode rend la chaîne, `await` résout. */
function tableClient(data: unknown, error: unknown = null): TableClientMock {
  const chain: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    chain[method] = vi.fn(() => chain);
  }
  // biome-ignore lint/suspicious/noThenProperty: chaîne PostgREST simulée, résolue par await
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data, error });
  return chain as unknown as TableClientMock;
}

describe("createTekoClient", () => {
  it("construit un client Supabase typé", () => {
    const client = createTekoClient({ url: "http://127.0.0.1:54321", anonKey: "clef-anon" });
    expect(typeof client.rpc).toBe("function");
    expect(typeof client.auth.signInWithOtp).toBe("function");
  });
});

describe("rides", () => {
  it("estimatePrice : arguments p_* et conversion numeric→number", async () => {
    const client = rpcClient("1450");
    const price = await estimatePrice(client, { category: "eco", distanceM: 3190, durationS: 318 });
    expect(price).toBe(1450);
    expect(lastRpcCall(client)).toEqual([
      "estimate_price",
      { p_category: "eco", p_distance_m: 3190, p_duration_s: 318 },
    ]);
  });

  it("requestRide : géométries EWKT, options omises si absentes", async () => {
    const client = rpcClient({ id: "r1", status: "requested" });
    await requestRide(client, {
      category: "moto",
      origin: { lon: 9.4536, lat: 0.4032 },
      destination: { lon: 9.4677, lat: 0.3925 },
      distanceM: 3190,
      durationS: 318,
      originHint: "derrière le portail bleu",
    });
    const [name, args] = lastRpcCall(client);
    expect(name).toBe("request_ride");
    expect(args.p_origin).toBe("SRID=4326;POINT(9.4536 0.4032)");
    expect(args.p_dest).toBe("SRID=4326;POINT(9.4677 0.3925)");
    expect(args.p_origin_hint).toBe("derrière le portail bleu");
    expect("p_scheduled_at" in args).toBe(false);
    expect("p_payment_method" in args).toBe(false);
  });

  it("startRide transmet le PIN ; l'erreur backend devient un code stable", async () => {
    const ok = rpcClient({ id: "r1", status: "started" });
    await startRide(ok, "r1", "4729");
    expect(lastRpcCall(ok)).toEqual(["start_ride", { p_ride: "r1", p_pin: "4729" }]);

    const ko = rpcClient(null, { message: "PIN incorrect" });
    await expect(startRide(ko, "r1", "0000")).rejects.toMatchObject({ code: "pin_incorrect" });
  });

  it("estimateCancellationFee : montant serveur converti en number", async () => {
    const client = rpcClient("300");
    expect(await estimateCancellationFee(client, "r1")).toBe(300);
    expect(lastRpcCall(client)).toEqual(["estimate_cancellation_fee", { p_ride: "r1" }]);
  });

  it("cancelRide passe le motif quand il existe", async () => {
    const client = rpcClient({ id: "r1", status: "cancelled_client" });
    await cancelRide(client, "r1", "changement de plan");
    expect(lastRpcCall(client)).toEqual([
      "cancel_ride",
      { p_ride: "r1", p_reason: "changement de plan" },
    ]);
  });

  it("markArrived / completeRide (avec et sans prix final)", async () => {
    const arrived = rpcClient({ id: "r1", status: "arrived" });
    await markArrived(arrived, "r1");
    expect(lastRpcCall(arrived)).toEqual(["mark_arrived", { p_ride: "r1" }]);

    const done = rpcClient({ id: "r1", status: "completed" });
    await completeRide(done, "r1");
    expect(lastRpcCall(done)).toEqual(["complete_ride", { p_ride: "r1" }]);

    const donePrix = rpcClient({ id: "r1", status: "completed" });
    await completeRide(donePrix, "r1", 1300);
    expect(lastRpcCall(donePrix)).toEqual(["complete_ride", { p_ride: "r1", p_price_final: 1300 }]);
  });

  it("findActiveRide filtre les statuts actifs, null sans course", async () => {
    const some = tableClient([{ id: "r9", status: "arrived" }]);
    const active = await findActiveRide(some);
    expect(active?.id).toBe("r9");
    expect(some.in).toHaveBeenCalledWith("status", [
      "requested",
      "accepted",
      "enroute",
      "arrived",
      "started",
    ]);

    const none = tableClient([]);
    expect(await findActiveRide(none)).toBeNull();
  });

  it("rideDriverCard : fiche mappée, null sans chauffeur", async () => {
    const card = await rideDriverCard(
      rpcClient({ first_name: "Boris", rating: "4.8", plate: "GA-482-LBV", category: "eco" }),
      "r1",
    );
    expect(card).toEqual({ firstName: "Boris", rating: 4.8, plate: "GA-482-LBV", category: "eco" });
    expect(await rideDriverCard(rpcClient(null), "r1")).toBeNull();
  });

  it("rateRide insère sous RLS ; listMyRides interroge l'historique", async () => {
    const insert = tableClient({ id: "n1", stars: 5 });
    await rateRide(insert, { rideId: "r1", fromUser: "u1", toUser: "u2", stars: 5 });
    expect(insert.from).toHaveBeenCalledWith("ratings");

    const list = tableClient([{ id: "r1" }]);
    const rides = await listMyRides(list, 10);
    expect(rides).toHaveLength(1);
    expect(list.from).toHaveBeenCalledWith("rides");
  });
});

describe("dispatch", () => {
  it("driverHeartbeat arrondit la position (éco : 4 décimales)", async () => {
    const client = rpcClient(null);
    await driverHeartbeat(client, { lon: 9.4536789, lat: 0.4032111 }, { eco: true });
    expect(lastRpcCall(client)[1].p_point).toBe("SRID=4326;POINT(9.4537 0.4032)");
  });

  it("offerDetails : GeoJSON → LonLat, montants → number, destination absente", async () => {
    const client = rpcClient({
      offer_id: "o1",
      status: "pending",
      expires_at: "2026-08-25T10:00:12Z",
      category: "eco",
      origin: { type: "Point", coordinates: [9.4536, 0.4032] },
      origin_landmark: "Pharmacie du Gros-Bouquet",
      origin_hint: null,
      meeting_landmark: null,
      distance_est_m: 3190,
      duration_est_s: 318,
      price_est: "1200",
      commission: "180",
      net_driver: "1020",
      payment_method: "cash",
    });
    const offer = await offerDetails(client, "o1");
    expect(offer.origin).toEqual({ lon: 9.4536, lat: 0.4032 });
    expect(offer.priceEst).toBe(1200);
    expect(offer.commission).toBe(180);
    expect(offer.netDriver).toBe(1020);
    expect("destination" in offer).toBe(false);
  });

  it("respondOffer : refus → null ; replay → offer_already_handled", async () => {
    expect(await respondOffer(rpcClient(null), "o1", false)).toBeNull();
    await expect(
      respondOffer(rpcClient(null, { message: "Offre déjà traitée" }), "o1", true),
    ).rejects.toMatchObject({ code: "offer_already_handled" });
  });

  it("listPendingOffers filtre les offres en attente", async () => {
    const client = tableClient([{ id: "o1", status: "pending" }]);
    await listPendingOffers(client);
    expect(client.from).toHaveBeenCalledWith("ride_offers");
    expect(client.eq).toHaveBeenCalledWith("status", "pending");
  });
});

describe("compte", () => {
  it("touchLastSeen / cancelAccountDeletion appellent les RPC sans argument", async () => {
    const a = rpcClient(null);
    await touchLastSeen(a);
    expect(lastRpcCall(a)[0]).toBe("touch_last_seen");

    const b = rpcClient(null);
    await cancelAccountDeletion(b);
    expect(lastRpcCall(b)[0]).toBe("cancel_account_deletion");
  });

  it("needsReverification renvoie un booléen strict", async () => {
    expect(await needsReverification(rpcClient(true))).toBe(true);
    expect(await needsReverification(rpcClient(false))).toBe(false);
    expect(await needsReverification(rpcClient(null))).toBe(false);
  });

  it("updateProfile ne pousse que les champs fournis (colonnes snake_case)", async () => {
    const client = tableClient({ id: "u1", full_name: "Nadia O." });
    await updateProfile(client, "u1", { fullName: "Nadia O." });
    expect(client.update).toHaveBeenCalledWith({ full_name: "Nadia O." });
  });

  it("registerDevice upsert le jeton par (user, token)", async () => {
    const client = tableClient(null);
    await registerDevice(client, "u1", "fcm-token-1");
    expect(client.upsert).toHaveBeenCalledWith(
      { user_id: "u1", push_token: "fcm-token-1", platform: "android" },
      { onConflict: "user_id,push_token" },
    );
  });

  it("requestAccountDeletion renvoie la date de purge ; getProfile lit sous RLS", async () => {
    expect(await requestAccountDeletion(rpcClient("2026-09-24T00:00:00Z"))).toBe(
      "2026-09-24T00:00:00Z",
    );
    const client = tableClient({ id: "u1", role: "client" });
    await getProfile(client, "u1");
    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.eq).toHaveBeenCalledWith("id", "u1");
  });
});

describe("finance", () => {
  it("driverBalance convertit le numeric en number signé", async () => {
    expect(await driverBalance(rpcClient("-3000"), "d1")).toBe(-3000);
  });

  it("createSettlementPayment passe le montant", async () => {
    const client = rpcClient({ id: "p1", status: "initiated" });
    await createSettlementPayment(client, 3000);
    expect(lastRpcCall(client)).toEqual(["create_settlement_payment", { p_amount: 3000 }]);
  });

  it("invokeCollect relaie l'Edge Function et mappe les erreurs", async () => {
    const ok = {
      functions: { invoke: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    } as unknown as TekoClient;
    await invokeCollect(ok, "p1");
    expect(ok.functions.invoke).toHaveBeenCalledWith("airtel-collect", {
      body: { payment_id: "p1" },
    });

    const ko = {
      functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }) },
    } as unknown as TekoClient;
    await expect(invokeCollect(ko, "p1")).rejects.toBeInstanceOf(TekoApiError);
  });

  it("listMyLedger / listMyStatements lisent les vues RLS-scopées", async () => {
    const ledger = tableClient([{ id: "l1" }]);
    await listMyLedger(ledger);
    expect(ledger.from).toHaveBeenCalledWith("ledger");
    expect(ledger.order).toHaveBeenCalledWith("created_at", { ascending: false });

    const statements = tableClient([{ id: "s1" }]);
    await listMyStatements(statements, 7);
    expect(statements.from).toHaveBeenCalledWith("daily_statements");
    expect(statements.limit).toHaveBeenCalledWith(7);
  });
});

describe("sécurité & notifications", () => {
  it("getSharedTrip : jeton inconnu → null, sinon vue publique mappée", async () => {
    expect(await getSharedTrip(rpcClient(null), "jeton-inconnu")).toBeNull();
    const view = await getSharedTrip(
      rpcClient({
        status: "started",
        category: "eco",
        plate: "GA-482-LBV",
        driver_first_name: "Boris",
        dest_landmark: null,
        last_position: { type: "Point", coordinates: [9.45, 0.4] },
        updated_at: "2026-08-25T10:00:00Z",
      }),
      "jeton",
    );
    expect(view?.driverFirstName).toBe("Boris");
    expect(view?.plate).toBe("GA-482-LBV");
  });

  it("reportIncident : SOS avec course liée", async () => {
    const client = rpcClient({ id: "i1", kind: "sos" });
    await reportIncident(client, { kind: "sos", rideId: "r1" });
    expect(lastRpcCall(client)).toEqual(["report_incident", { p_kind: "sos", p_ride: "r1" }]);
  });

  it("variantes optionnelles : les deux côtés de chaque option sont couverts", async () => {
    // estimatePrice avec zone tarifaire.
    const est = rpcClient("900");
    await estimatePrice(est, { category: "eco", distanceM: 100, durationS: 60, zoneId: "z1" });
    expect(lastRpcCall(est)[1].p_zone).toBe("z1");

    // requestRide avec TOUTES les options.
    const full = rpcClient({ id: "r2" });
    await requestRide(full, {
      category: "confort",
      origin: { lon: 9.45, lat: 0.4 },
      destination: { lon: 9.46, lat: 0.39 },
      distanceM: 2000,
      durationS: 240,
      paymentMethod: "airtel",
      scheduledAt: "2026-08-26T08:00:00Z",
      originLandmarkId: "lm1",
      destinationLandmarkId: "lm2",
      originHint: "portail",
      destinationHint: "en face de l'école",
    });
    const args = lastRpcCall(full)[1];
    expect(args.p_payment_method).toBe("airtel");
    expect(args.p_scheduled_at).toBe("2026-08-26T08:00:00Z");
    expect(args.p_origin_landmark).toBe("lm1");
    expect(args.p_dest_landmark).toBe("lm2");
    expect(args.p_dest_hint).toBe("en face de l'école");

    // cancelRide sans motif.
    const cancel = rpcClient({ id: "r2", status: "cancelled_client" });
    await cancelRide(cancel, "r2");
    expect(lastRpcCall(cancel)).toEqual(["cancel_ride", { p_ride: "r2" }]);

    // rateRide avec commentaire.
    const rate = tableClient({ id: "n2" });
    await rateRide(rate, { rideId: "r2", fromUser: "u1", toUser: "u2", stars: 4, comment: "Top" });
    expect(rate.insert).toHaveBeenCalledWith(expect.objectContaining({ comment: "Top" }));

    // listMyRides avec la limite par défaut.
    const list = tableClient([]);
    await listMyRides(list);
    expect(list.limit).toHaveBeenCalledWith(30);

    // driverHeartbeat sans éco (arrondi 5 décimales).
    const hb = rpcClient(null);
    await driverHeartbeat(hb, { lon: 9.4536789, lat: 0.4032111 });
    expect(lastRpcCall(hb)[1].p_point).toBe("SRID=4326;POINT(9.45368 0.40321)");

    // updateProfile : effacement explicite (null) de l'e-mail et de la photo.
    const prof = tableClient({ id: "u1" });
    await updateProfile(prof, "u1", { email: null, photoUrl: null });
    expect(prof.update).toHaveBeenCalledWith({ email: null, photo_url: null });

    // getSharedTrip : champs absents → null.
    const shared = await getSharedTrip(rpcClient({ status: "started", category: "eco" }), "t");
    expect(shared).toMatchObject({ plate: null, driverFirstName: null, updatedAt: null });

    // reportIncident minimal (signalement hors course).
    const incident = rpcClient({ id: "i2", kind: "report" });
    await reportIncident(incident, { kind: "report" });
    expect(lastRpcCall(incident)).toEqual(["report_incident", { p_kind: "report" }]);
  });

  it("createTripShare passe la course au RPC", async () => {
    const client = rpcClient({ token: "a".repeat(32) });
    await createTripShare(client, "r1");
    expect(lastRpcCall(client)).toEqual(["create_trip_share", { p_ride: "r1" }]);
  });

  it("listNotifications : filtre non-lues optionnel ; markNotificationRead", async () => {
    const client = tableClient([{ id: "n1" }]);
    await listNotifications(client, { unreadOnly: true, limit: 10 });
    expect(client.is).toHaveBeenCalledWith("read_at", null);
    expect(client.limit).toHaveBeenCalledWith(10);

    const defaults = tableClient([]);
    await listNotifications(defaults);
    expect(defaults.is).not.toHaveBeenCalled();
    expect(defaults.limit).toHaveBeenCalledWith(50);

    const rpc = rpcClient(null);
    await markNotificationRead(rpc, "n1");
    expect(lastRpcCall(rpc)).toEqual(["mark_notification_read", { p_id: "n1" }]);
  });
});
