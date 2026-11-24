import type { OfferDetails } from "@teko/api-client";
import { fetchRoute } from "@teko/maps";
import { useEffect, useState } from "react";
import { VALHALLA_URL } from "../../config";
import { fetchDevicePosition } from "./use-device-position";

/** ETA de prise en charge (position → point de rencontre), meilleure volonté. */
export function usePickupEta(offer: OfferDetails): number | null {
  const [etaMin, setEtaMin] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const from = await fetchDevicePosition();
      if (!from) return;
      const route = await fetchRoute(VALHALLA_URL, from, offer.origin).catch(() => null);
      if (route && !cancelled) setEtaMin(Math.max(1, Math.round(route.durationS / 60)));
    })();
    return () => {
      cancelled = true;
    };
  }, [offer]);
  return etaMin;
}
