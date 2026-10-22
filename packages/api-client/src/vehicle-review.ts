import type { TableRow, VehicleCategory } from "@teko/types";
import type { TekoClient } from "./client";
import { unwrap } from "./errors";
export async function reopenVehicleReview(
  client: TekoClient,
  driverId: string,
  reason: string,
): Promise<void> {
  unwrap(await client.rpc("reopen_vehicle_review", { p_driver: driverId, p_reason: reason }));
}
export async function updateReviewedVehicle(
  client: TekoClient,
  input: {
    vehicleId: string;
    category: VehicleCategory;
    plate: string;
    reason: string;
  },
): Promise<TableRow<"vehicles">> {
  return unwrap(
    await client.rpc("update_reviewed_vehicle", {
      p_vehicle: input.vehicleId,
      p_category: input.category,
      p_plate: input.plate,
      p_reason: input.reason,
    }),
  );
}
