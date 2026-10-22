import { expect, it, vi } from "vitest";
import type { TekoClient } from "./client";
import { reopenVehicleReview, updateReviewedVehicle } from "./vehicle-review";

it("la correction et la réouverture utilisent les RPC contrôlées avec leur motif", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { plate: "LBV-NEW" }, error: null });
  const client = { rpc } as unknown as TekoClient;
  await reopenVehicleReview(client, "driver", "Changement de véhicule");
  expect(rpc).toHaveBeenLastCalledWith("reopen_vehicle_review", {
    p_driver: "driver",
    p_reason: "Changement de véhicule",
  });
  expect(
    await updateReviewedVehicle(client, {
      vehicleId: "vehicle",
      category: "moto",
      plate: "LBV-NEW",
      reason: "Vérification à refaire",
    }),
  ).toEqual({ plate: "LBV-NEW" });
  expect(rpc).toHaveBeenLastCalledWith("update_reviewed_vehicle", {
    p_vehicle: "vehicle",
    p_category: "moto",
    p_plate: "LBV-NEW",
    p_reason: "Vérification à refaire",
  });
  rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "Refusé" } });
  await expect(
    updateReviewedVehicle(client, {
      vehicleId: "vehicle",
      category: "moto",
      plate: "FAUX",
      reason: "Refus",
    }),
  ).rejects.toMatchObject({ code: "not_authorized" });
});
