import { getNotification, getRide } from "@teko/api-client";
import { pushTarget } from "@teko/core";
import type { Href, useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

import { emitPushOffer, emitPushRouteChange } from "./push-events";
import { supabase } from "./supabase";

interface RoutingOptions {
  userId: string;
  router: Router;
  tapped: boolean;
  active: () => boolean;
}
async function resolveTarget(data: Record<string, unknown>, userId: string) {
  const candidate = pushTarget(data);
  if (!candidate) return null;
  const row = await getNotification(supabase, candidate.notificationId);
  const current = await supabase.auth.getSession();
  if (current.data.session?.user.id !== userId) return null;
  const target = pushTarget({
    notification_id: row.id,
    type: row.type,
    payload: JSON.stringify(row.payload),
  });
  return target ? { ...target, type: row.type } : null;
}

/** Aucune URL reçue ni action automatique ; les données se relisent sous JWT. */
export async function routePush(
  data: Record<string, unknown>,
  options: RoutingOptions,
): Promise<void> {
  try {
    const target = await resolveTarget(data, options.userId);
    if (!target || !options.active()) return;
    if (target.offerId) {
      if (options.tapped) options.router.push("/(main)/home" as Href);
      emitPushOffer(target.offerId);
      return;
    }
    // La demande de modification réveille la lecture sous JWT de l'écran de
    // course ; elle n'accepte jamais rien.
    if (target.rideId && target.type === "route_change_request") emitPushRouteChange(target.rideId);
    if (!options.tapped) return;
    if (!target.rideId) {
      options.router.push("/(main)/home" as Href);
      return;
    }
    await getRide(supabase, target.rideId);
    const current = await supabase.auth.getSession();
    if (options.active() && current.data.session?.user.id === options.userId) {
      options.router.push(`/(main)/ride/${target.rideId}` as Href);
    }
  } catch {
    /* Notification étrangère, course inaccessible ou réseau indisponible. */
  }
}
