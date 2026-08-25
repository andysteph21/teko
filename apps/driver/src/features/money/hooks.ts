// Données serveur du parcours I — solde signé, fiche chauffeur (is_active),
// grand livre, relevés, et flux de règlement Airtel. La confirmation Airtel
// arrive en asynchrone : poll de `getPayment` toutes les 3 s (la table
// payments n'est pas dans la publication Realtime).

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createSettlementPayment,
  driverBalance,
  getMyDriver,
  getPayment,
  invokeCollect,
  listMyLedger,
  listMyStatements,
} from "@teko/api-client";
import type { TableRow } from "@teko/types";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSession } from "../auth/use-session";

export type PaymentRow = TableRow<"payments">;

const POLL_MS = 3_000;

export function enAttente(p: Pick<PaymentRow, "status">): boolean {
  return p.status === "initiated" || p.status === "pending" || p.status === "ambiguous";
}

/** Solde signé du compte courant : < 0 = le chauffeur doit à Teko. */
export function useDriverBalance() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["driver-balance", userId],
    enabled: Boolean(userId),
    queryFn: () => driverBalance(supabase, userId as string),
  });
}

/** Fiche chauffeur (is_active pour l'état suspendu, payout_msisdn pour D-16). */
export function useMyDriver() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["my-driver", userId],
    enabled: Boolean(userId),
    queryFn: () => getMyDriver(supabase, userId as string),
  });
}

/** Grand livre récent (le filtre « du jour » est fait par lignesDuJour). */
export function useMyLedger() {
  return useQuery({ queryKey: ["my-ledger"], queryFn: () => listMyLedger(supabase, 50) });
}

/** Relevés quotidiens archivés (D-17). */
export function useMyStatements() {
  return useQuery({ queryKey: ["my-statements"], queryFn: () => listMyStatements(supabase) });
}

/** Horloge de l'écran — alimente le compte à rebours de clôture (D-15). */
export function useNowTick(intervalMs = 1_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export type SettlementPhase = "saisie" | "attente" | "succes" | "echec";

/** D-16 : créer l'intention de règlement, déclencher le push USSD, puis
 *  suivre le paiement par poll jusqu'à success/failed. `renvoyer` relance
 *  le push sur le même paiement (échec ou push perdu). */
export function useSettlementFlow() {
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const demarrer = useMutation({
    mutationFn: async (montantXaf: number) => {
      const payment = await createSettlementPayment(supabase, montantXaf);
      await invokeCollect(supabase, payment.id);
      return payment;
    },
    onSuccess: (payment) => setPaymentId(payment.id),
  });

  const suivi = useQuery({
    queryKey: ["settlement-payment", paymentId],
    enabled: paymentId !== null,
    queryFn: () => getPayment(supabase, paymentId as string),
    refetchInterval: (q) => (q.state.data && !enAttente(q.state.data) ? false : POLL_MS),
  });

  const renvoyer = useMutation({
    mutationFn: () => invokeCollect(supabase, paymentId as string),
    onSettled: () => void suivi.refetch(),
  });

  const payment = suivi.data ?? demarrer.data ?? null;
  const phase: SettlementPhase =
    payment?.status === "success"
      ? "succes"
      : payment?.status === "failed"
        ? "echec"
        : paymentId !== null
          ? "attente"
          : "saisie";

  return { demarrer, renvoyer, payment, phase };
}
