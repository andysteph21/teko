export interface PushReceipt {
  status: string;
  details?: { error?: string };
}

/** Un reçu « ok » indique l'acceptation par FCM/APNs, pas la réception terminal. */
export async function expoReceipts(
  ids: string[],
  accessToken: string | undefined,
  request: typeof fetch = fetch,
): Promise<Record<string, PushReceipt>> {
  if (ids.length === 0) return {};
  const response = await request(
    "https://exp.host/--/api/v2/push/getReceipts",
    {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ ids }),
    },
  );
  if (!response.ok) throw new Error(`Expo receipts HTTP ${response.status}`);
  const body = await response.json() as { data?: Record<string, PushReceipt> };
  if (!body.data) throw new Error("Reçus Expo absents");
  return body.data;
}
