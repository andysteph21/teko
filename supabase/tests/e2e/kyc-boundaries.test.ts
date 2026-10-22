import { randomUUID } from "node:crypto";
import { beforeAll, expect, it } from "vitest";
import { type TestUser, createUser, createDriver, serviceSql } from "./helpers";

let driver: TestUser;
let ops: TestUser;
let finance: TestUser;
let carto: TestUser;
let path: string;
const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=", "base64");
beforeAll(async () => {
  driver = await createDriver();
  ops = await createUser({ role: "admin", adminRole: "ops" });
  finance = await createUser({ role: "admin", adminRole: "finance" });
  carto = await createUser({ role: "admin", adminRole: "carto" });
  path = `${driver.id}/${randomUUID()}.png`;
  const upload = await driver.client.storage.from("kyc").upload(path, image, { contentType: "image/png" });
  expect(upload.error).toBeNull();
});

it("un chauffeur ne peut pas fabriquer une pièce déjà validée", async () => {
  const result = await driver.client.from("driver_documents").insert({ driver_id: driver.id,
    type: "license", storage_path: path, status: "validated", reviewed_by: ops.id });
  expect(result.error).not.toBeNull();
});

it("Finance et Carto ne lisent pas les pièces KYC, même avec un chemin connu", async () => {
  const document = await driver.client.from("driver_documents").insert({ driver_id: driver.id,
    type: "id_card", storage_path: path }).select().single();
  expect(document.error).toBeNull();
  for (const user of [finance, carto]) {
    const read = await user.client.from("driver_documents").select("id").eq("driver_id", driver.id);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);
    const file = await user.client.storage.from("kyc").download(path);
    expect(file.error).not.toBeNull();
    const review = await user.client.from("driver_documents").update({ status: "validated" }).eq("id", document.data.id);
    expect(review.error !== null || review.data == null).toBe(true);
  }
  const opsRead = await ops.client.storage.from("kyc").download(path);
  expect(opsRead.error).toBeNull();
});

it("les preuves KYC ne peuvent pas être remplacées après dépôt", async () => {
  const update = await driver.client.storage.from("kyc").update(path, image, { contentType: "image/png" });
  expect(update.error).not.toBeNull();
});

it("un admin Carto ne peut pas modifier un statut KYC ou un solde en cache", async () => {
  const change = await carto.client.from("drivers").update({ kyc_status: "rejected", current_balance_cache: 999999 }).eq("id", driver.id);
  expect(change.error).not.toBeNull();
  const state = await serviceSql("select kyc_status,current_balance_cache from public.drivers where id=$1", [driver.id]);
  expect(state.rows[0].kyc_status).toBe("validated");
  expect(Number(state.rows[0].current_balance_cache)).toBe(0);
});
