import { describe, expect, it, vi } from "vitest";
import type { TekoClient } from "./client";
import { getPayment, listPaymentsForRide } from "./finance";
import { listMyLandmarkProposals, listSavedPlaces, searchLandmarksByName } from "./places";
import { getRide } from "./rides";

const CHAIN = ["from", "select", "eq", "ilike", "order", "limit", "single"] as const;
type Mock = TekoClient & Record<(typeof CHAIN)[number], ReturnType<typeof vi.fn>>;

function tableClient(data: unknown): Mock {
  const chain: Record<string, unknown> = {};
  for (const m of CHAIN) chain[m] = vi.fn(() => chain);
  // biome-ignore lint/suspicious/noThenProperty: chaîne PostgREST simulée, résolue par await
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data, error: null });
  return chain as unknown as Mock;
}

describe("places & lectures directes", () => {
  it("searchLandmarksByName : RPC search_landmarks ; requête courte → []", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "lm1" }], error: null });
    const client = { rpc } as unknown as TekoClient;
    await searchLandmarksByName(client, "  pharma ", 5);
    expect(rpc).toHaveBeenCalledWith("search_landmarks", { p_query: "pharma", p_limit: 5 });

    const untouched = { rpc: vi.fn() } as unknown as TekoClient;
    expect(await searchLandmarksByName(untouched, "p")).toEqual([]);
    expect(untouched.rpc).not.toHaveBeenCalled();
  });

  it("listSavedPlaces / listMyLandmarkProposals lisent sous RLS", async () => {
    const saved = tableClient([{ id: "sp1" }]);
    await listSavedPlaces(saved);
    expect(saved.from).toHaveBeenCalledWith("saved_places");

    const proposals = tableClient([{ id: "lp1" }]);
    await listMyLandmarkProposals(proposals);
    expect(proposals.from).toHaveBeenCalledWith("landmark_proposals");
  });

  it("getRide / getPayment lisent par id (single)", async () => {
    const ride = tableClient({ id: "r1", pin_code: "4729" });
    expect((await getRide(ride, "r1")).pin_code).toBe("4729");
    expect(ride.eq).toHaveBeenCalledWith("id", "r1");

    const payment = tableClient({ id: "p1", status: "success" });
    expect((await getPayment(payment, "p1")).status).toBe("success");
    expect(payment.from).toHaveBeenCalledWith("payments");
  });

  it("listPaymentsForRide filtre par course", async () => {
    const client = tableClient([{ id: "p1" }]);
    await listPaymentsForRide(client, "r1");
    expect(client.eq).toHaveBeenCalledWith("ride_id", "r1");
  });
});
