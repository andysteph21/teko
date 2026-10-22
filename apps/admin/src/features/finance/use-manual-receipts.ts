"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveManualReceipt,
  getFinanceProofUrl,
  listCancellationClaims,
  listManualReceipts,
  listPayoutRequests,
  listProfiles,
  prepareManualReceipt,
  preparePayoutReceipt,
  rejectManualReceipt,
  reviseManualReceipt,
  uploadFinanceProof,
} from "@teko/api-client";
import { supabase } from "../../lib/supabase";

export interface ReceiptDraft {
  source: string;
  driverId: string;
  amount: number;
  method: "cash" | "external_transfer";
  reference: string;
  file: File;
}

export function useManualReceipts(userId: string) {
  const cache = useQueryClient();
  const data = useQuery({
    queryKey: ["finance", "manual"],
    queryFn: async () => {
      const [receipts, claims, payouts, drivers] = await Promise.all([
        listManualReceipts(supabase),
        listCancellationClaims(supabase),
        listPayoutRequests(supabase),
        listProfiles(supabase, { role: "driver", limit: 100 }),
      ]);
      return { receipts, claims, payouts, drivers };
    },
  });
  const refresh = () => cache.invalidateQueries({ queryKey: ["finance"] });
  const prepare = useMutation({
    mutationFn: async (draft: ReceiptDraft) => {
      const path = `${userId}/${crypto.randomUUID()}`;
      await uploadFinanceProof(supabase, { path, data: draft.file, contentType: draft.file.type });
      const common = { method: draft.method, reference: draft.reference, proofPath: path };
      if (draft.source.startsWith("revision:")) {
        return reviseManualReceipt(supabase, {
          ...common,
          receiptId: draft.source.slice(9),
          amount: draft.amount,
        });
      }
      if (draft.source.startsWith("payout:")) {
        return preparePayoutReceipt(supabase, { ...common, requestId: draft.source.slice(7) });
      }
      const claim = data.data?.claims.find((row) => draft.source === `claim:${row.id}`);
      return prepareManualReceipt(supabase, {
        ...common,
        driverId: claim?.driver_id ?? draft.driverId,
        amount: claim ? Number(claim.amount) : draft.amount,
        kind: claim ? "cancellation_fee" : "settlement",
        claimId: claim?.id,
      });
    },
    onSuccess: refresh,
  });
  const approve = useMutation({
    mutationFn: (id: string) => approveManualReceipt(supabase, id),
    onSuccess: refresh,
  });
  const proof = useMutation({ mutationFn: (path: string) => getFinanceProofUrl(supabase, path) });
  const reject = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      rejectManualReceipt(supabase, input.id, input.reason),
    onSuccess: refresh,
  });
  return { data, prepare, approve, reject, proof };
}
