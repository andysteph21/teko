import { afterEach, describe, expect, it, vi } from "vitest";
import { costingForCategory, fetchRoute } from "./routing";

const SHAPE_AB = "_seupB_kkbI_ibE_ibE"; // 2 segments simples précision 6

describe("costingForCategory", () => {
  it("moto → motorcycle, le reste → auto", () => {
    expect(costingForCategory("moto")).toBe("motorcycle");
    expect(costingForCategory("eco")).toBe("auto");
    expect(costingForCategory("confort")).toBe("auto");
  });
});

describe("fetchRoute", () => {
  afterEach(() => vi.restoreAllMocks());

  it("POSTe les deux points et décode la réponse", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          trip: { legs: [{ shape: SHAPE_AB }], summary: { length: 3.19, time: 318 } },
        }),
      ),
    );
    const route = await fetchRoute(
      "http://127.0.0.1:8002/",
      { lon: 9.45, lat: 0.4 },
      { lon: 9.47, lat: 0.39 },
      "motorcycle",
    );
    expect(route.distanceM).toBe(3190);
    expect(route.durationS).toBe(318);
    expect(route.coordinates.length).toBeGreaterThan(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:8002/route");
    const body = JSON.parse(init.body as string);
    expect(body.costing).toBe("motorcycle");
    expect(body.locations).toHaveLength(2);
  });

  it("lève sur statut HTTP non-2xx et sur réponse sans itinéraire", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 500 }));
    await expect(fetchRoute("http://x", { lon: 0, lat: 0 }, { lon: 1, lat: 1 })).rejects.toThrow(
      "500",
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({})));
    await expect(fetchRoute("http://x", { lon: 0, lat: 0 }, { lon: 1, lat: 1 })).rejects.toThrow(
      "sans itinéraire",
    );
  });
});
