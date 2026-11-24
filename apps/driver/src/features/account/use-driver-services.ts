// Services reçus par le chauffeur (D-19) : covoiturage à la place (activé
// par défaut, colonne drivers.shared_enabled — lot R4) et livraison (à
// activer, drivers.delivery_enabled — lot R5). La fiche chauffeur fait foi ;
// la bascule est optimiste et revient en arrière si le serveur refuse.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyDriver,
  setDeliveryEnabled,
  setSharedRides,
  TekoApiError,
  type TekoClient,
} from "@teko/api-client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useSession } from "../auth/use-session";

export interface ServiceToggle {
  enabled: boolean;
  ready: boolean;
  onToggle: (next: boolean) => void;
}

export interface DriverServices {
  shared: ServiceToggle;
  delivery: ServiceToggle;
  /** Moto seule : le covoiturage est réservé aux voitures. */
  sharedUnavailable: boolean;
}

type Setter = (client: TekoClient, enabled: boolean) => Promise<boolean>;

function useServiceToggle(current: boolean | undefined, setter: Setter, title: string) {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [override, setOverride] = useState<boolean | null>(null);
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (next: boolean) => setter(supabase, next),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["my-driver", userId] }),
    onError: (error) => {
      setOverride(null);
      const closed = error instanceof TekoApiError && error.code === "service_closed";
      Alert.alert(title, t(closed ? "account:parametres.serviceFerme" : "erreurs.generique"));
    },
  });

  return {
    enabled: override ?? current ?? false,
    ready: current !== undefined && !mutation.isPending,
    onToggle: (next: boolean) => {
      setOverride(next);
      mutation.mutate(next);
    },
  };
}

export function useDriverServices(): DriverServices {
  const { session } = useSession();
  const userId = session?.user.id;
  const { t } = useTranslation();
  const driver = useQuery({
    queryKey: ["my-driver", userId],
    enabled: Boolean(userId),
    queryFn: () => getMyDriver(supabase, userId as string),
  });
  const row = driver.data;
  const categories = row?.categories ?? [];

  return {
    shared: useServiceToggle(
      row?.shared_enabled,
      setSharedRides,
      t("account:parametres.covoitTitre"),
    ),
    delivery: useServiceToggle(
      row?.delivery_enabled,
      setDeliveryEnabled,
      t("account:parametres.livraisonTitre"),
    ),
    sharedUnavailable: categories.length > 0 && categories.every((c) => c === "moto"),
  };
}
