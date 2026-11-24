// Entrée « Envoyer un colis » de l'accueil (R5). Le service est fermé par
// défaut côté serveur : l'ouverture est lue au moment du choix, et un service
// fermé affiche « Service bientôt disponible » au lieu d'ouvrir le parcours.

import { serviceAvailability } from "@teko/api-client";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useBookingStore } from "./store";

/** Faux en cas de panne : le vrai devis tranchera et expliquera le refus. */
export async function isDeliveryClosed(): Promise<boolean> {
  try {
    return !(await serviceAvailability(supabase)).delivery;
  } catch {
    return false;
  }
}

export type DeliveryEntryState = "idle" | "checking" | "closed";

export function useDeliveryEntry() {
  const router = useRouter();
  const [state, setState] = useState<DeliveryEntryState>("idle");

  const open = async () => {
    if (state !== "idle") return;
    setState("checking");
    if (await isDeliveryClosed()) {
      setState("closed");
      return;
    }
    setState("idle");
    useBookingStore.getState().setService("delivery");
    router.push("/(main)/search" as Href);
  };

  return { state, open };
}
