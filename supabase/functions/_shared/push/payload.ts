/** Les données précises se relisent sous JWT dans l'app, jamais sur l'écran verrouillé. */
export function safePushPayload(
  payload: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    ["offer_id", "ride_id", "incident_id", "payment_id", "expires_at"]
      .flatMap((key) =>
        typeof payload[key] === "string" ? [[key, payload[key] as string]] : []
      ),
  );
}
