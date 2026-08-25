// Types de véhicule offerts selon les catégories exercées (D-06) : un
// chauffeur moto uniquement démarre sur Moto, la carte Voiture est grisée.

import { useQuery } from "@tanstack/react-query";
import { getMyDriver } from "@teko/api-client";
import type { VehicleCategory } from "@teko/types";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { VehicleType } from "./vehicle-type-cards";

export interface AllowedVehicleTypes {
  categories: readonly VehicleCategory[];
  carAllowed: boolean;
  motoAllowed: boolean;
}

export function useAllowedVehicleTypes(
  userId: string | undefined,
  setType: (type: VehicleType) => void,
): AllowedVehicleTypes {
  const driver = useQuery({
    queryKey: ["my-driver", userId],
    queryFn: () => getMyDriver(supabase, userId as string),
    enabled: Boolean(userId),
  });
  const categories = driver.data?.categories ?? [];
  const carAllowed = categories.length === 0 || categories.some((c) => c !== "moto");
  const motoAllowed = categories.length === 0 || categories.includes("moto");

  useEffect(() => {
    if (!carAllowed && motoAllowed) setType("moto");
  }, [carAllowed, motoAllowed, setType]);

  return { categories, carAllowed, motoAllowed };
}
