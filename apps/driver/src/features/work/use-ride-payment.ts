// Encaissement Airtel de la course (D-14b) — la table payments n'est pas
// dans la publication Realtime : interrogation toutes les 3 s jusqu'à un
// état final (success / failed).

import { getPayment, listPaymentsForRide } from "@teko/api-client";
import type { TableRow } from "@teko/types";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export type PaymentRow = TableRow<"payments">;

const POLL_MS = 3_000;

export function isPaymentPending(p: Pick<PaymentRow, "status">): boolean {
  return p.status === "initiated" || p.status === "pending" || p.status === "ambiguous";
}

export function useRidePayment(rideId: string | undefined, enabled: boolean): PaymentRow | null {
  const [payment, setPayment] = useState<PaymentRow | null>(null);

  useEffect(() => {
    if (!rideId || !enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const check = async () => {
      try {
        const rows = await listPaymentsForRide(supabase, rideId);
        const collection = rows.find((p) => p.kind === "ride_collection");
        if (!collection || cancelled) return;
        const fresh = await getPayment(supabase, collection.id).catch(() => collection);
        if (cancelled) return;
        setPayment(fresh);
        if (!isPaymentPending(fresh)) stop();
      } catch {
        // Réseau : le tick suivant réessaie.
      }
    };
    void check();
    timer = setInterval(() => void check(), POLL_MS);
    return () => {
      cancelled = true;
      stop();
    };
  }, [rideId, enabled]);

  return payment;
}
