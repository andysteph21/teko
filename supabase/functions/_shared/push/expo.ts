import type { PushMessage, PushProvider, PushResult } from "./provider.ts";

interface ExpoTicket {
  status: string;
  id?: string;
  details?: { error?: string };
}
/** Un ticket accepté est un accusé du relais, jamais une preuve de réception sur le téléphone. */
export function expoProvider(
  accessToken: string | undefined,
  request: typeof fetch = fetch,
): PushProvider {
  return {
    name: "expo",
    async send(message: PushMessage): Promise<PushResult> {
      if (
        !/^(ExpoPushToken|ExponentPushToken)\[[\w-]+\]$/.test(message.token)
      ) {
        return {
          ok: false,
          invalidToken: true,
          detail: "format de jeton Expo invalide",
        };
      }
      const ttl = message.ttl ? Number.parseInt(message.ttl, 10) : undefined;
      const response = await request("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          to: message.token,
          title: message.title,
          body: message.body,
          data: message.data,
          sound: "default",
          priority: "high",
          channelId: "teko-alerts",
          ...(message.expiresAt
            ? { expiration: Math.floor(message.expiresAt / 1000) }
            : {}),
          ...(ttl !== undefined ? { ttl: Math.max(0, ttl) } : {}),
        }),
      });
      if (!response.ok) {
        return { ok: false, detail: `Expo HTTP ${response.status}` };
      }
      const body = await response.json() as { data?: ExpoTicket };
      if (body.data?.status === "ok" && body.data.id) {
        return { ok: true, receiptId: body.data.id };
      }
      return {
        ok: false,
        invalidToken: body.data?.details?.error === "DeviceNotRegistered",
        detail: body.data?.details?.error ?? "ticket Expo invalide",
      };
    },
  };
}
