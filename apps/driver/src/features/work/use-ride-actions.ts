// Actions RPC du parcours course (D-11 → D-14) : je suis arrivé, PIN,
// terminer, passager absent. Erreurs par code TekoApiError, jamais de
// string-match (doc 10 §3).

import { cancelRide, completeRide, markArrived, startRide, TekoApiError } from "@teko/api-client";
import { isValidPinFormat } from "@teko/core";
import type { RideRow } from "@teko/types";
import { type Href, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { useWorkStore } from "./store";

export interface RideActions {
  busy: boolean;
  pinError: string | null;
  pinFails: number;
  clearPinError: () => void;
  arrive: () => void;
  start: (pin: string) => void;
  complete: () => void;
  noShow: () => void;
  /** D-14 espèces : « J'ai encaissé » → retour accueil, toast solde. */
  cashDone: () => void;
}

export function useRideActions(
  rideId: string | undefined,
  applyRide: (row: RideRow) => void,
): RideActions {
  const [busy, setBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinFails, setPinFails] = useState(0);
  const router = useRouter();
  const { t } = useTranslation();
  const showToast = useWorkStore((s) => s.showToast);

  const run = useCallback(
    async (rpc: (id: string) => Promise<RideRow>) => {
      if (!rideId) return;
      setBusy(true);
      try {
        applyRide(await rpc(rideId));
      } catch {
        showToast(t("erreurs.generique"));
      } finally {
        setBusy(false);
      }
    },
    [rideId, applyRide, showToast, t],
  );

  const start = useCallback(
    async (pin: string) => {
      if (!rideId || !isValidPinFormat(pin)) return;
      setBusy(true);
      setPinError(null);
      try {
        applyRide(await startRide(supabase, rideId, pin));
      } catch (e) {
        if (e instanceof TekoApiError && e.code === "pin_incorrect") {
          setPinFails((n) => n + 1);
          setPinError(t("work:pin.incorrect"));
        } else {
          setPinError(t("erreurs.generique"));
        }
      } finally {
        setBusy(false);
      }
    },
    [rideId, applyRide, t],
  );

  // Statut dédié `no_show` : le backend applique le frais de non-présentation
  // (part chauffeur créditée au grand livre) et les stats distinguent les
  // non-présentations des annulations chauffeur.
  const noShow = useCallback(async () => {
    if (!rideId) return;
    setBusy(true);
    try {
      await cancelRide(supabase, rideId, "passager absent", "no_show");
      showToast(t("work:course.annuleeAbsent"));
      router.replace("/(main)/home" as Href);
    } catch {
      showToast(t("erreurs.generique"));
      setBusy(false);
    }
  }, [rideId, router, showToast, t]);

  const cashDone = useCallback(() => {
    showToast(t("work:fin.soldeMisAJour"));
    router.replace("/(main)/home" as Href);
  }, [router, showToast, t]);

  return {
    busy,
    pinError,
    pinFails,
    clearPinError: () => setPinError(null),
    arrive: () => void run((id) => markArrived(supabase, id)),
    start: (pin) => void start(pin),
    complete: () => void run((id) => completeRide(supabase, id)),
    noShow: () => void noShow(),
    cashDone,
  };
}
