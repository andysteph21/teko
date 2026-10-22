// Régression « payé mais toujours suspendu » (vécue en validation D-16, sept. 2026) :
// airtel-collect pré-positionnait payments.status='success' AVANT d'appeler
// confirm_payment ; la garde d'idempotence du RPC court-circuitait alors
// l'écriture grand livre (settlement) ET maybe_reactivate_driver. Ce spec joue
// le chemin complet à travers l'Edge Function réelle (provider mock), sans
// toucher à l'état partagé du dispatch (pas de goOnline/daily_close : dette
// posée via post_ledger, suspension posée comme le job d'échéance).
//
// TEKO_FUNCTIONS_URL permet de viser un runtime de fonctions alternatif
// (p. ex. le code d'un worktree servi localement) ; par défaut, le runtime
// de la stack Supabase locale.

import { beforeAll, describe, expect, it } from "vitest";
import { API_URL, ANON_KEY, type TestUser, createDriver, serviceSql } from "./helpers";

const FUNCTIONS_URL = process.env.TEKO_FUNCTIONS_URL ?? `${API_URL}/functions/v1`;
const DEBT = 500;

let driver: TestUser;
let paymentId: string;

async function invokeCollect(user: TestUser, payment_id: string) {
  const { data } = await user.client.auth.getSession();
  const res = await fetch(`${FUNCTIONS_URL}/airtel-collect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token}`,
      apikey: ANON_KEY ?? "",
      "x-teko-sandbox-secret": process.env.TEKO_SANDBOX_SECRET ?? "",
    },
    body: JSON.stringify({ payment_id }),
  });
  return { status: res.status, body: await res.json() };
}

beforeAll(async () => {
  driver = await createDriver(["eco"]);
  // MSISDN requis par la fonction (D-07) — unique par chauffeur.
  await serviceSql(
    `update public.drivers set payout_msisdn = $2 where id = $1`,
    [driver.id, `074${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`],
  );
  // Dette de commission (comme après une course cash) puis suspension,
  // comme le job d'échéance : solde -500, chauffeur désactivé.
  await serviceSql(`select public.post_ledger($1, 'commission_due', $2)`, [driver.id, -DEBT]);
  await serviceSql(
    `update public.drivers set is_active = false, deactivated_reason = 'overdue_balance' where id = $1`,
    [driver.id],
  );
});

describe("règlement via l'Edge Function airtel-collect (mock)", () => {
  it("état initial : chauffeur suspendu, solde -500", async () => {
    const { data } = await driver.client.rpc("driver_balance", { p_driver: driver.id });
    expect(Number(data)).toBe(-DEBT);
  });

  it("mock succès : paiement confirmé, ledger posté, chauffeur réactivé", async () => {
    const { data: payment, error } = await driver.client.rpc("create_settlement_payment", {
      p_amount: DEBT,
    });
    expect(error).toBeNull();
    paymentId = payment.id;

    const r = await invokeCollect(driver, paymentId);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("success");

    // Statut posé par confirm_payment (pas par la fonction) + trace fournisseur.
    const pmt = await serviceSql(
      `select status, provider_txn_id from public.payments where id = $1`,
      [paymentId],
    );
    expect(pmt.rows[0].status).toBe("success");
    expect(pmt.rows[0].provider_txn_id).toMatch(/^MOCK-settle-/);

    // Le cœur de la régression : l'écriture settlement DOIT exister…
    const ledger = await serviceSql(
      `select kind, amount_signed from public.ledger where payment_id = $1`,
      [paymentId],
    );
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0].kind).toBe("settlement");
    expect(Number(ledger.rows[0].amount_signed)).toBe(DEBT);

    // …le solde revenir à zéro…
    const { data: balance } = await driver.client.rpc("driver_balance", { p_driver: driver.id });
    expect(Number(balance)).toBe(0);

    // …et le chauffeur être réactivé : plus jamais « payé mais toujours suspendu ».
    const drv = await serviceSql(
      `select is_active, deactivated_reason from public.drivers where id = $1`,
      [driver.id],
    );
    expect(drv.rows[0].is_active).toBe(true);
    expect(drv.rows[0].deactivated_reason).toBeNull();
  });

  it("rejouer l'encaissement ne double ni le ledger ni le crédit", async () => {
    const r = await invokeCollect(driver, paymentId);
    expect(r.body.status).toBe("success");

    const n = await serviceSql(
      `select count(*)::int as n from public.ledger where payment_id = $1`,
      [paymentId],
    );
    expect(n.rows[0].n).toBe(1);
    const { data: balance } = await driver.client.rpc("driver_balance", { p_driver: driver.id });
    expect(Number(balance)).toBe(0);
  });
});
