// Solde journalier : course cash → dette de commission → clôture 04:00 →
// règlement Airtel → solde soldé et chauffeur réactivable.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestUser,
  completeCashRide,
  createDriver,
  createUser,
  serviceSql,
  allOffline,
} from "./helpers";

let nadia: TestUser;
let boris: TestUser;
let superadmin: TestUser;

beforeAll(async () => {
  nadia = await createUser();
  boris = await createDriver(["eco"]);
  superadmin = await createUser({ role: "admin", adminRole: "superadmin" });
});

afterAll(allOffline);

describe("moteur de solde", () => {
  let due: number;

  it("après une course cash, driver_balance = -commission", async () => {
    const ride = await completeCashRide(nadia, boris);
    expect(Number(ride.price_final)).toBe(1600);
    due = 250; // 15 % = 240 bruts, arrondis au multiple de 25.
    const { data, error } = await boris.client.rpc("driver_balance", {
      p_driver: boris.id,
    });
    expect(error).toBeNull();
    expect(Number(data)).toBe(-due);
  });

  it("daily_close (admin) génère le relevé du jour pour Boris", async () => {
    const { error } = await superadmin.client.rpc("daily_close", {});
    expect(error).toBeNull();
    const st = await serviceSql(
      `select status, closing, total_commission from public.daily_statements
        where driver_id = $1 order by business_day desc limit 1`,
      [boris.id],
    );
    expect(st.rows).toHaveLength(1);
    expect(["open", "overdue"]).toContain(st.rows[0].status);
    expect(Math.abs(Number(st.rows[0].total_commission))).toBe(due);
    expect(Number(st.rows[0].closing)).toBe(-due);
  });

  it("le règlement Airtel confirmé ramène le solde à zéro", async () => {
    const { data: payment, error } = await boris.client.rpc(
      "create_settlement_payment",
      { p_amount: due },
    );
    expect(error).toBeNull();

    // Confirmation normalement faite par l'Edge Function airtel-callback ;
    // ici en contexte service, comme le ferait le webhook.
    await serviceSql(`select public.confirm_payment($1)`, [
      typeof payment === "object" ? payment.id : payment,
    ]);

    const { data: balance } = await boris.client.rpc("driver_balance", {
      p_driver: boris.id,
    });
    expect(Number(balance)).toBe(0);

    const drv = await serviceSql(
      `select is_active from public.drivers where id = $1`,
      [boris.id],
    );
    expect(drv.rows[0].is_active).toBe(true);
  });

  it("confirm_payment est idempotent : rejouer le callback ne double pas le crédit", async () => {
    const pay = await serviceSql(
      `select id from public.payments where driver_id = $1 and kind = 'driver_settlement' order by created_at desc limit 1`,
      [boris.id],
    );
    await serviceSql(`select public.confirm_payment($1)`, [pay.rows[0].id]);
    const { data: balance } = await boris.client.rpc("driver_balance", {
      p_driver: boris.id,
    });
    expect(Number(balance)).toBe(0);
  });
});
