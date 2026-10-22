import type { admin } from "../_shared/db.ts";
import { messageForType, type PushProvider } from "../_shared/push/index.ts";
import { safePushPayload } from "../_shared/push/payload.ts";
import { expoReceipts } from "../_shared/push/receipts.ts";

type Database = ReturnType<typeof admin>;
interface Delivery {
  id: string;
  device_id: string;
  push_token: string;
  notification_id: string;
  type: string;
  payload: Record<string, unknown>;
  expires_at: string;
}

async function sendOne(
  db: Database,
  provider: PushProvider,
  row: Delivery,
): Promise<boolean> {
  const expiresAt = Date.parse(row.expires_at);
  if (expiresAt <= Date.now()) {
    await db.from("push_deliveries").update({ status: "expired" }).eq(
      "id",
      row.id,
    );
    return false;
  }
  const message = messageForType(row.type, row.payload);
  try {
    const result = await provider.send({
      token: row.push_token,
      title: message.title,
      body: message.body,
      data: {
        type: row.type,
        notification_id: row.notification_id,
        payload: JSON.stringify(safePushPayload(row.payload)),
      },
      expiresAt,
      ttl: `${Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))}s`,
    });
    if (result.invalidToken) {
      await db.from("devices").delete().eq("id", row.device_id).eq(
        "push_token",
        row.push_token,
      );
      return false;
    }
    const update = await db.from("push_deliveries").update({
      status: result.ok ? result.receiptId ? "ticket" : "accepted" : "pending",
      ticket_id: result.receiptId ?? null,
      detail: result.ok ? null : "provider_error",
      next_attempt_at: new Date(Date.now() + (result.ok ? 15 * 60000 : 3000))
        .toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (update.error) throw update.error;
    return result.ok;
  } catch {
    await db.from("push_deliveries").update({
      detail: "transport_error",
      next_attempt_at: new Date(Date.now() + 3000).toISOString(),
    }).eq("id", row.id);
    return false;
  }
}

export async function deliverPending(
  db: Database,
  provider: PushProvider,
  notificationId: string | null,
): Promise<number> {
  const claimed = await db.rpc("claim_push_deliveries", {
    p_notification: notificationId,
  });
  if (claimed.error) throw new Error("Lecture de la file push impossible");
  let sent = 0;
  for (const row of (claimed.data ?? []) as Delivery[]) {
    if (await sendOne(db, provider, row)) sent++;
  }
  return sent;
}

export async function collectReceipts(db: Database): Promise<void> {
  const pending = await db.from("push_deliveries").select(
    "id,device_id,ticket_id,updated_at",
  )
    .eq("status", "ticket").lte("next_attempt_at", new Date().toISOString())
    .limit(100);
  if (pending.error) throw new Error("Lecture des reçus en attente impossible");
  const rows = pending.data ?? [];
  if (rows.length === 0) return;
  const receipts = await expoReceipts(
    rows.map((r) => r.ticket_id),
    Deno.env.get("EXPO_ACCESS_TOKEN"),
  );
  for (const row of rows) {
    const receipt = receipts[row.ticket_id];
    const tooOld = Date.parse(row.updated_at) < Date.now() - 24 * 3600000;
    if (!receipt && !tooOld) {
      await db.from("push_deliveries").update({
        next_attempt_at: new Date(Date.now() + 5 * 60000).toISOString(),
      }).eq("id", row.id);
      continue;
    }
    if (receipt?.details?.error === "DeviceNotRegistered") {
      await db.from("devices").delete().eq("id", row.device_id);
    } else {
      await db.from("push_deliveries").update({
        status: receipt?.status === "ok" ? "accepted" : "error",
        detail: receipt?.status === "ok"
          ? null
          : tooOld && !receipt
          ? "receipt_timeout"
          : "receipt_error",
      }).eq("id", row.id);
    }
  }
}
