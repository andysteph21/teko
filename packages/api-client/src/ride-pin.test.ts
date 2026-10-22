import { expect, it, vi } from "vitest";
import type { TekoClient } from "./client";
import { getRidePin } from "./ride-pin";

it("le code privé passe par la RPC réservée au passager", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: "4729", error: null });
  expect(await getRidePin({ rpc } as unknown as TekoClient, "r1")).toBe("4729");
  expect(rpc).toHaveBeenCalledWith("ride_pin", { p_ride: "r1" });
});

it("un refus serveur reste un refus, sans repli sur la ligne publique", async () => {
  const rpc = vi.fn().mockResolvedValue({
    data: null,
    error: { code: "42501", message: "Code réservé au passager" },
  });
  await expect(getRidePin({ rpc } as unknown as TekoClient, "r1")).rejects.toMatchObject({
    code: "not_authorized",
  });
});
