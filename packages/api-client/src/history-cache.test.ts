import type { RideRow } from "@teko/types";
import { expect, it, vi } from "vitest";
import type { TekoClient } from "./client";
import { cachedRideHistory } from "./history-cache";

function client(result: unknown): TekoClient {
  const limit = vi.fn().mockResolvedValue(result);
  return {
    from: () => ({ select: () => ({ order: () => ({ limit }) }) }),
  } as unknown as TekoClient;
}
it("l'historique en cache exclut PIN et coordonnées, même si une réponse en contient", async () => {
  const row = {
    id: "ride",
    pin_code: "1234",
    origin_geom: "private",
    dest_geom: "private",
  } as RideRow;
  const cache = { read: vi.fn(), write: vi.fn().mockResolvedValue(undefined) };
  expect(await cachedRideHistory(client({ data: [row], error: null }), "owner", cache)).toEqual([
    row,
  ]);
  expect(cache.write).toHaveBeenCalledWith("owner", [
    { id: "ride", pin_code: null, origin_geom: null, dest_geom: null },
  ]);
  cache.write.mockRejectedValue(new Error("disque indisponible"));
  await expect(
    cachedRideHistory(client({ data: [row], error: null }), "owner", cache),
  ).resolves.toEqual([row]);
});
it("une panne réseau relit le seul compte demandé ; un refus serveur ne relit jamais le cache", async () => {
  const cache = { read: vi.fn().mockResolvedValue([{ id: "cached" }]), write: vi.fn() };
  await expect(
    cachedRideHistory(
      client({ data: null, error: { message: "Network request failed" } }),
      "owner",
      cache,
    ),
  ).resolves.toEqual([{ id: "cached" }]);
  expect(cache.read).toHaveBeenCalledWith("owner");
  cache.read.mockClear();
  await expect(
    cachedRideHistory(
      client({ data: null, error: { code: "42501", message: "Interdit" } }),
      "owner",
      cache,
    ),
  ).rejects.toMatchObject({ code: "not_authorized" });
  expect(cache.read).not.toHaveBeenCalled();
  cache.read.mockResolvedValue(null);
  await expect(
    cachedRideHistory(client({ data: null, error: { message: "fetch failed" } }), "new", cache),
  ).rejects.toMatchObject({ code: "network" });
});
