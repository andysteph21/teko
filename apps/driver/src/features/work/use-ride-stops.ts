// Arrêts de la course (lot R3) : liste lue après une modification acceptée,
// « Arrivé à l'arrêt » puis « Repartir » dans l'ordre imposé par le serveur.
// Au départ, le serveur ajoute l'attente facturée au prix : la course est
// relue pour afficher le nouveau montant.

import {
  arriveStop,
  landmarkNames,
  leaveStop,
  listRideStops,
  type RideStop,
} from "@teko/api-client";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { currentStop, nextStop, replaceStop } from "./stops";
import { useWorkStore } from "./store";

export interface RideStops {
  stops: RideStop[];
  /** Noms des repères d'arrêt par identifiant de repère. */
  names: Record<string, string>;
  /** Arrivé, pas reparti : la course ne peut pas être terminée. */
  current: RideStop | null;
  next: RideStop | null;
  busy: boolean;
  arrive: () => void;
  leave: () => void;
  reload: () => void;
}

async function fetchStops(rideId: string) {
  const stops = await listRideStops(supabase, rideId);
  const ids = stops.map((stop) => stop.landmarkId).filter((id): id is string => Boolean(id));
  const names = await landmarkNames(supabase, ids).catch(() => ({}) as Record<string, string>);
  return { stops, names };
}

export function useRideStops(
  rideId: string | undefined,
  enabled: boolean,
  onPriceChanged: () => void,
): RideStops {
  const [stops, setStops] = useState<RideStop[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { t } = useTranslation();
  const showToast = useWorkStore((s) => s.showToast);

  const reload = useCallback(() => {
    if (!rideId || !enabled) return;
    fetchStops(rideId)
      .then((result) => {
        setStops(result.stops);
        setNames(result.names);
      })
      .catch(() => {
        // Réseau : la liste connue reste affichée.
      });
  }, [rideId, enabled]);

  useEffect(() => reload(), [reload]);

  const current = currentStop(stops);
  const next = nextStop(stops);

  const run = useCallback(
    async (rpc: () => Promise<RideStop>, priced: boolean) => {
      setBusy(true);
      try {
        const updated = await rpc();
        setStops((list) => replaceStop(list, updated));
        if (priced) onPriceChanged();
      } catch {
        showToast(t("erreurs.generique"));
        reload();
      } finally {
        setBusy(false);
      }
    },
    [onPriceChanged, reload, showToast, t],
  );

  return {
    stops,
    names,
    current,
    next,
    busy,
    arrive: () => {
      if (next) void run(() => arriveStop(supabase, next.id), false);
    },
    leave: () => {
      if (current) void run(() => leaveStop(supabase, current.id), true);
    },
    reload,
  };
}
