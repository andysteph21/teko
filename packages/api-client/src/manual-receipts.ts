import type { TableRow } from "@teko/types";
import type { TekoClient } from "./client";
import { mapApiError, unwrap } from "./errors";

export async function listManualReceipts(
  client: TekoClient,
): Promise<TableRow<"manual_receipts">[]> {
  return unwrap(
    await client
      .from("manual_receipts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  );
}

export async function listCancellationClaims(
  client: TekoClient,
): Promise<TableRow<"cancellation_claims">[]> {
  return unwrap(
    await client
      .from("cancellation_claims")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  );
}

export async function listPayoutRequests(
  client: TekoClient,
): Promise<TableRow<"payout_requests">[]> {
  return unwrap(
    await client
      .from("payout_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  );
}

/** Nouveau chemin à chaque dépôt : aucune preuve ne peut être remplacée. */
export async function uploadFinanceProof(
  client: TekoClient,
  input: {
    path: string;
    data: Blob | ArrayBuffer;
    contentType: string;
  },
): Promise<void> {
  const result = await client.storage.from("finance-proofs").upload(input.path, input.data, {
    contentType: input.contentType,
    upsert: false,
  });
  if (result.error) throw mapApiError(result.error);
}

export interface ManualReceiptInput {
  driverId: string;
  kind: "settlement" | "cancellation_fee" | "payout";
  amount: number;
  method: "cash" | "external_transfer";
  reference: string;
  proofPath: string;
  claimId?: string;
}

export async function prepareManualReceipt(
  client: TekoClient,
  input: ManualReceiptInput,
): Promise<TableRow<"manual_receipts">> {
  return unwrap(
    await client.rpc("prepare_manual_receipt", {
      p_driver: input.driverId,
      p_kind: input.kind,
      p_amount: input.amount,
      p_method: input.method,
      p_reference: input.reference,
      p_proof_path: input.proofPath,
      ...(input.claimId ? { p_claim: input.claimId } : {}),
    }),
  );
}

export async function preparePayoutReceipt(
  client: TekoClient,
  input: {
    requestId: string;
    method: "cash" | "external_transfer";
    reference: string;
    proofPath: string;
  },
): Promise<TableRow<"manual_receipts">> {
  return unwrap(
    await client.rpc("prepare_payout_receipt", {
      p_request: input.requestId,
      p_method: input.method,
      p_reference: input.reference,
      p_proof_path: input.proofPath,
    }),
  );
}

export async function approveManualReceipt(
  client: TekoClient,
  receiptId: string,
): Promise<TableRow<"manual_receipts">> {
  return unwrap(await client.rpc("approve_manual_receipt", { p_receipt: receiptId }));
}

export async function rejectManualReceipt(
  client: TekoClient,
  receiptId: string,
  reason: string,
): Promise<TableRow<"manual_receipts">> {
  return unwrap(
    await client.rpc("reject_manual_receipt", { p_receipt: receiptId, p_reason: reason }),
  );
}

export async function reviseManualReceipt(
  client: TekoClient,
  input: {
    receiptId: string;
    amount: number;
    method: "cash" | "external_transfer";
    proofPath: string;
  },
): Promise<TableRow<"manual_receipts">> {
  return unwrap(
    await client.rpc("revise_manual_receipt", {
      p_receipt: input.receiptId,
      p_amount: input.amount,
      p_method: input.method,
      p_proof_path: input.proofPath,
    }),
  );
}

export async function getFinanceProofUrl(client: TekoClient, path: string): Promise<string> {
  const result = await client.storage.from("finance-proofs").createSignedUrl(path, 300);
  if (result.error) throw mapApiError(result.error);
  return result.data.signedUrl;
}
