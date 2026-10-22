import { describe, expect, it, vi } from "vitest";
import type { TekoClient } from "./client";
import {
  createDriverProfile,
  getMyDriver,
  listMyDocuments,
  listMyVehicles,
  setGpsConsent,
  setPayoutMsisdn,
  uploadKycDocument,
  upsertVehicle,
} from "./driver";
import { subscribeNotifications } from "./notifications";

const CHAIN = [
  "from",
  "select",
  "insert",
  "update",
  "upsert",
  "eq",
  "order",
  "limit",
  "single",
] as const;
type Mock = TekoClient & Record<(typeof CHAIN)[number], ReturnType<typeof vi.fn>>;

function tableClient(data: unknown): Mock {
  const chain: Record<string, unknown> = {};
  for (const m of CHAIN) chain[m] = vi.fn(() => chain);
  // biome-ignore lint/suspicious/noThenProperty: chaîne PostgREST simulée, résolue par await
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data, error: null });
  return chain as unknown as Mock;
}

describe("dossier chauffeur", () => {
  it("liste seulement les véhicules du chauffeur et conserve l'erreur d'un upload KYC", async () => {
    const client = tableClient([]);
    await listMyVehicles(client, "d1");
    expect(client.eq).toHaveBeenCalledWith("driver_id", "d1");
    await setPayoutMsisdn(client, "d1", "+24107000002");
    expect(client.update).toHaveBeenCalledWith({ payout_msisdn: "+24107000002" });
    const upload = vi
      .fn()
      .mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    (client as unknown as { storage: unknown }).storage = { from: () => ({ upload }) };
    await expect(
      uploadKycDocument(client, {
        userId: "d1",
        type: "license",
        data: new ArrayBuffer(1),
        contentType: "image/png",
      }),
    ).rejects.toMatchObject({ code: "not_authorized" });
    expect(client.insert).not.toHaveBeenCalled();
  });
  it("createDriverProfile : upsert par id avec catégories", async () => {
    const client = tableClient(null);
    await createDriverProfile(client, "d1", ["eco", "moto"]);
    expect(client.upsert).toHaveBeenCalledWith(
      { id: "d1", categories: ["eco", "moto"] },
      { onConflict: "id" },
    );
  });

  it("getMyDriver : null sans fiche", async () => {
    expect(await getMyDriver(tableClient([]), "d1")).toBeNull();
    const found = await getMyDriver(tableClient([{ id: "d1", kyc_status: "pending" }]), "d1");
    expect(found?.kyc_status).toBe("pending");
  });

  it("uploadKycDocument : upload bucket kyc puis ligne dossier", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const chain = tableClient({ id: "doc1", type: "license" });
    (chain as unknown as { storage: unknown }).storage = { from: vi.fn(() => ({ upload })) };
    const doc = await uploadKycDocument(chain, {
      userId: "d1",
      type: "license",
      data: new ArrayBuffer(8),
      contentType: "image/jpeg",
    });
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^d1\/license-[0-9]+-[a-z0-9]+\.jpg$/),
      expect.any(ArrayBuffer),
      {
        contentType: "image/jpeg",
        upsert: false,
      },
    );
    expect(doc.id).toBe("doc1");
  });

  it("upsertVehicle et setGpsConsent écrivent sous RLS", async () => {
    const vehicle = tableClient({ id: "v1", plate: "GA-482-LBV" });
    await upsertVehicle(vehicle, { driverId: "d1", category: "eco", plate: "GA-482-LBV" });
    expect(vehicle.from).toHaveBeenCalledWith("vehicles");

    const consent = tableClient(null);
    await setGpsConsent(consent, "d1", true);
    expect(consent.update).toHaveBeenCalledWith({ gps_consent: true });
  });

  it("listMyDocuments trie par date", async () => {
    const client = tableClient([{ id: "doc1" }]);
    await listMyDocuments(client);
    expect(client.from).toHaveBeenCalledWith("driver_documents");
  });
});

describe("subscribeNotifications", () => {
  it("filtre par user_id et relaie les insertions", async () => {
    let handler: ((p: { new: unknown }) => void) | undefined;
    let statusHandler: ((status: string) => void) | undefined;
    const channel = {
      on: vi.fn((_e: string, filter: unknown, h: (p: { new: unknown }) => void) => {
        handler = h;
        expect(filter).toMatchObject({ table: "notifications", filter: "user_id=eq.u1" });
        return channel;
      }),
      subscribe: vi.fn((callback: (status: string) => void) => {
        statusHandler = callback;
        return channel;
      }),
    };
    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue(undefined),
    } as unknown as TekoClient;

    const seen: unknown[] = [];
    const ready = vi.fn();
    const unsubscribe = subscribeNotifications(client, "u1", (n) => seen.push(n), ready);
    statusHandler?.("CHANNEL_ERROR");
    expect(ready).not.toHaveBeenCalled();
    statusHandler?.("SUBSCRIBED");
    statusHandler?.("SUBSCRIBED");
    expect(ready).toHaveBeenCalledTimes(2);
    handler?.({ new: { id: "n1", type: "ride_offer" } });
    expect(seen).toEqual([{ id: "n1", type: "ride_offer" }]);
    await unsubscribe();
    expect(client.removeChannel).toHaveBeenCalled();
  });
});
