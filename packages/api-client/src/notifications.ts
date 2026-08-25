// Notifications in-app (C-22) — lecture/pointage sous RLS propriétaire.
// L'envoi est exclusivement côté serveur (enqueue_notification, service_role).

import type { NotificationRow } from "@teko/types";
import type { TekoClient } from "./client.js";
import { unwrap } from "./errors.js";

export async function listNotifications(
  client: TekoClient,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<NotificationRow[]> {
  let query = client
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);
  if (options.unreadOnly) query = query.is("read_at", null);
  return unwrap(await query);
}

export async function markNotificationRead(client: TekoClient, id: string): Promise<void> {
  unwrap(await client.rpc("mark_notification_read", { p_id: id }));
}
