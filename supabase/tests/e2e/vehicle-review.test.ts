import { beforeAll, expect, it } from "vitest";
import { type TestUser, createDriver, createUser, serviceSql } from "./helpers";
let driver: TestUser;
let ops: TestUser;
let finance: TestUser;
let vehicleId: string;
beforeAll(async () => {
  driver = await createDriver();
  ops = await createUser({ role: "admin", adminRole: "ops" });
  finance = await createUser({ role: "admin", adminRole: "finance" });
  const result = await serviceSql("insert into public.vehicles(driver_id,category,plate) values($1,'eco','LBV-TEST') returning id", [driver.id]);
  vehicleId = result.rows[0].id;
});

it("un chauffeur validé ne modifie, ne supprime et ne remplace pas le véhicule ni ses catégories", async () => {
  expect((await driver.client.from("vehicles").update({ plate: "FAUSSE" }).eq("id", vehicleId)).error?.code).toBe("42501");
  expect((await driver.client.from("vehicles").delete().eq("id", vehicleId)).error?.code).toBe("42501");
  expect((await driver.client.from("vehicles").insert({ driver_id: driver.id, category: "moto", plate: "FAUSSE" })).error?.code).toBe("42501");
  expect((await driver.client.from("drivers").update({ categories: ["moto"] }).eq("id", driver.id)).error?.code).toBe("42501");
  expect((await driver.client.from("drivers").update({ vehicle_locked_at: null }).eq("id", driver.id)).error?.code).toBe("42501");
  expect((await serviceSql("select plate from public.vehicles where id=$1", [vehicleId])).rows[0].plate).toBe("LBV-TEST");
});

it("seul Ops rouvre le dossier ; la remise en ligne attend une nouvelle vérification", async () => {
  expect((await finance.client.rpc("reopen_vehicle_review", { p_driver: driver.id, p_reason: "Changement véhicule" })).error?.code).toBe("42501");
  expect((await ops.client.from("vehicles").update({ plate: "NOUVEAU" }).eq("id", vehicleId)).error?.code).toBe("42501");
  const opened = await ops.client.rpc("reopen_vehicle_review", { p_driver: driver.id, p_reason: "Changement de véhicule attesté" });
  expect(opened.error).toBeNull();
  expect((await ops.client.from("vehicles").update({ plate: "NOUVEAU" }).eq("id", vehicleId)).error).toBeNull();
  expect((await driver.client.from("vehicles").update({ plate: "FAUSSE" }).eq("id", vehicleId)).error?.code).toBe("42501");
  const state = (await serviceSql("select is_active,kyc_status,physical_verified_at from public.drivers where id=$1", [driver.id])).rows[0];
  expect(state).toEqual({ is_active: false, kyc_status: "pending", physical_verified_at: null });
  expect((await driver.client.rpc("driver_heartbeat", { p_point: "SRID=4326;POINT(9.45 0.4)" })).error).not.toBeNull();
  expect((await ops.client.rpc("validate_kyc", { p_driver: driver.id, p_accept: true })).error?.code).toBe("22023");
  const audit = await serviceSql("select action from public.audit_log where entity_id=$1 and action='vehicle_review_reopened'", [driver.id]);
  expect(audit.rows).toHaveLength(1);
});

it("la correction Ops atomique met à jour plaque et catégories sans conserver une ancienne validation", async () => {
  const denied = await driver.client.rpc("update_reviewed_vehicle", { p_vehicle: vehicleId, p_category: "moto", p_plate: "LBV-NEW", p_reason: "Modification" });
  expect(denied.error?.code).toBe("42501");
  const corrected = await ops.client.rpc("update_reviewed_vehicle", { p_vehicle: vehicleId, p_category: "moto", p_plate: "lbv-new", p_reason: "Nouveau véhicule présenté" });
  expect(corrected.error).toBeNull();
  expect(corrected.data).toMatchObject({ category: "moto", plate: "LBV-NEW" });
  const actual = await serviceSql("select categories::text[] as categories,is_active,kyc_status,physical_verified_at from public.drivers where id=$1", [driver.id]);
  expect(actual.rows[0]).toMatchObject({ categories: ["moto"], is_active: false, kyc_status: "pending", physical_verified_at: null });
});
