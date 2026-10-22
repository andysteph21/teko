import { expect, it, vi } from "vitest";
import { recordPhysicalVerification } from "./admin";
import { listAlphaInvites, setAlphaInvite } from "./alpha-invites";
import type { TekoClient } from "./client";
import { driverOffline } from "./dispatch";

it("invitation et retrait utilisent le rôle choisi et la confirmation serveur", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { is_active: true }, error: null });
  const client = { rpc } as unknown as TekoClient;
  await setAlphaInvite(client, { phone: "+24107000001", role: "client", active: true });
  expect(rpc).toHaveBeenLastCalledWith("invite_alpha", {
    p_phone: "+24107000001",
    p_role: "client",
    p_active: true,
  });
  rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "Non autorisé" } });
  await expect(
    setAlphaInvite(client, { phone: "+24107000001", role: "client", active: false }),
  ).rejects.toMatchObject({ code: "not_authorized" });
});
it("la liste reste sous RLS et ordonnée ; la mise hors ligne et l'attestation physique passent par RPC", async () => {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  query.select.mockReturnValue(query);
  query.order.mockReturnValue(query);
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  const client = { from: vi.fn().mockReturnValue(query), rpc } as unknown as TekoClient;
  expect(await listAlphaInvites(client)).toEqual([]);
  expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
  await driverOffline(client);
  expect(rpc).toHaveBeenLastCalledWith("driver_offline");
  await recordPhysicalVerification(client, "driver", "Contrôle effectué");
  expect(rpc).toHaveBeenLastCalledWith("record_physical_verification", {
    p_driver: "driver",
    p_note: "Contrôle effectué",
  });
});
