import { expect, it, vi } from "vitest";
import type { TekoClient } from "./client";
import {
  approveManualReceipt,
  getFinanceProofUrl,
  listCancellationClaims,
  listManualReceipts,
  listPayoutRequests,
  prepareManualReceipt,
  preparePayoutReceipt,
  rejectManualReceipt,
  reviseManualReceipt,
  uploadFinanceProof,
} from "./manual-receipts";

it("les listes restent limitées aux lignes autorisées par le serveur et aux dossiers en attente", async () => {
  const query = { select: vi.fn(), order: vi.fn(), limit: vi.fn(), eq: vi.fn() };
  for (const key of ["select", "order", "eq"] as const) query[key].mockReturnValue(query);
  query.limit.mockResolvedValue({ data: [{ id: "receipt" }], error: null });
  const from = vi.fn().mockReturnValue(query);
  const client = { from } as unknown as TekoClient;
  expect(await listManualReceipts(client)).toEqual([{ id: "receipt" }]);
  expect(from).toHaveBeenLastCalledWith("manual_receipts");
  expect(query.limit).toHaveBeenCalledWith(100);
  query.order.mockResolvedValue({ data: [], error: null });
  expect(await listCancellationClaims(client)).toEqual([]);
  expect(from).toHaveBeenLastCalledWith("cancellation_claims");
  expect(await listPayoutRequests(client)).toEqual([]);
  expect(from).toHaveBeenLastCalledWith("payout_requests");
  expect(query.eq).toHaveBeenCalledWith("status", "pending");
});

it("la préparation et la validation utilisent les RPC, sans écrire dans le ledger", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { id: "receipt" }, error: null });
  const client = { rpc } as unknown as TekoClient;
  const input = {
    driverId: "driver",
    kind: "settlement" as const,
    amount: 240,
    method: "cash" as const,
    reference: "CASH-1",
    proofPath: "ops/proof",
  };
  await prepareManualReceipt(client, input);
  expect(rpc).toHaveBeenLastCalledWith("prepare_manual_receipt", {
    p_driver: "driver",
    p_kind: "settlement",
    p_amount: 240,
    p_method: "cash",
    p_reference: "CASH-1",
    p_proof_path: "ops/proof",
  });
  await prepareManualReceipt(client, { ...input, kind: "cancellation_fee", claimId: "claim" });
  expect(rpc.mock.lastCall?.[1].p_claim).toBe("claim");
  await preparePayoutReceipt(client, {
    requestId: "request",
    method: "external_transfer",
    reference: "REF-1",
    proofPath: "ops/payout",
  });
  expect(rpc).toHaveBeenLastCalledWith("prepare_payout_receipt", {
    p_request: "request",
    p_method: "external_transfer",
    p_reference: "REF-1",
    p_proof_path: "ops/payout",
  });
  await approveManualReceipt(client, "receipt");
  expect(rpc).toHaveBeenLastCalledWith("approve_manual_receipt", { p_receipt: "receipt" });
  await rejectManualReceipt(client, "receipt", "Reçu illisible");
  expect(rpc).toHaveBeenLastCalledWith("reject_manual_receipt", {
    p_receipt: "receipt",
    p_reason: "Reçu illisible",
  });
  await reviseManualReceipt(client, {
    receiptId: "receipt",
    amount: 300,
    method: "cash",
    proofPath: "ops/new-proof",
  });
  expect(rpc).toHaveBeenLastCalledWith("revise_manual_receipt", {
    p_receipt: "receipt",
    p_amount: 300,
    p_method: "cash",
    p_proof_path: "ops/new-proof",
  });
});

it("les preuves restent dans le bucket privé, sans écrasement et avec une URL courte", async () => {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const createSignedUrl = vi
    .fn()
    .mockResolvedValue({ data: { signedUrl: "https://private.example/proof" }, error: null });
  const from = vi.fn().mockReturnValue({ upload, createSignedUrl });
  const client = { storage: { from } } as unknown as TekoClient;
  const data = new ArrayBuffer(8);
  await uploadFinanceProof(client, { path: "ops/proof", data, contentType: "image/png" });
  expect(from).toHaveBeenCalledWith("finance-proofs");
  expect(upload).toHaveBeenCalledWith("ops/proof", data, {
    contentType: "image/png",
    upsert: false,
  });
  expect(await getFinanceProofUrl(client, "ops/proof")).toBe("https://private.example/proof");
  expect(createSignedUrl).toHaveBeenCalledWith("ops/proof", 300);
  upload.mockResolvedValue({ error: { code: "42501", message: "Interdit" } });
  await expect(
    uploadFinanceProof(client, { path: "bad", data, contentType: "image/png" }),
  ).rejects.toMatchObject({ code: "not_authorized" });
  createSignedUrl.mockResolvedValue({ data: null, error: { code: "42501", message: "Interdit" } });
  await expect(getFinanceProofUrl(client, "bad")).rejects.toMatchObject({ code: "not_authorized" });
});
