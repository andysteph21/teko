// Données serveur de l'accueil D-09 : fiche chauffeur (suspension) + solde
// du jour signé (driver_balance). Rechargées à chaque focus — le retour de
// D-14 doit montrer le solde à jour.

import { driverBalance, getMyDriver } from "@teko/api-client";
import type { DriverRow } from "@teko/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";

export interface DriverHomeState {
  driver: DriverRow | null;
  /** Solde signé en XAF — < 0 : le chauffeur doit à Teko. Null : inconnu. */
  balance: number | null;
  suspended: boolean;
  reload: () => void;
}

export function useDriverHome(userId: string | undefined): DriverHomeState {
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [row, amount] = await Promise.all([
        getMyDriver(supabase, userId),
        driverBalance(supabase, userId),
      ]);
      setDriver(row);
      setBalance(amount);
    } catch {
      // Réseau : on garde les dernières valeurs connues, le focus suivant corrige.
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return {
    driver,
    balance,
    suspended: driver?.is_active === false,
    reload: () => void load(),
  };
}
