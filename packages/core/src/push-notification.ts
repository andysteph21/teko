export interface PushTarget {
  notificationId: string;
  offerId?: string;
  rideId?: string;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Une notification n'impose jamais d'URL ni de commande métier à l'app. */
export function pushTarget(data: Record<string, unknown>, now = Date.now()): PushTarget | null {
  if (typeof data.notification_id !== "string" || !UUID.test(data.notification_id)) return null;
  let payload: Record<string, unknown>;
  try {
    const parsed = typeof data.payload === "string" ? JSON.parse(data.payload) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    payload = parsed;
  } catch {
    return null;
  }
  if (data.type === "ride_offer") {
    if (
      typeof payload.offer_id !== "string" ||
      !UUID.test(payload.offer_id) ||
      typeof payload.expires_at !== "string" ||
      !(Date.parse(payload.expires_at) > now)
    )
      return null;
    return { notificationId: data.notification_id, offerId: payload.offer_id };
  }
  return {
    notificationId: data.notification_id,
    ...(typeof payload.ride_id === "string" && UUID.test(payload.ride_id)
      ? { rideId: payload.ride_id }
      : {}),
  };
}
