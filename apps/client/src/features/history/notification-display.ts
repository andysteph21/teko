// Présentation des notifications (C-22) — mapping type → clés i18n, accès
// défensif au payload JSON. Formes réelles des payloads : voir les appels
// enqueue_notification dans supabase/migrations (ride_id, fee, price, name).

import { formatXaf } from "@teko/core";
import type { NotificationRow } from "@teko/types";
import { dayLabel, type DayLabel, type TranslateFn } from "./ride-display";

const LABEL_KEYS: Record<string, string> = {
  ride_accepted: "history:notifs.typeRideAccepted",
  driver_arrived: "history:notifs.typeDriverArrived",
  ride_completed: "history:notifs.typeRideCompleted",
  cancellation_fee: "history:notifs.typeCancellationFee",
  no_driver_found: "history:notifs.typeNoDriverFound",
  landmark_accepted: "history:notifs.typeLandmarkAccepted",
  landmark_rejected: "history:notifs.typeLandmarkRejected",
  settlement_reminder: "history:notifs.typeSettlementReminder",
  deletion_requested: "history:notifs.typeDeletionRequested",
};

/** Clé i18n du libellé, ou null (défaut produit : type brut à l'écran). */
export function notificationLabelKey(type: string): string | null {
  return LABEL_KEYS[type] ?? null;
}

export type NotificationIconKind = "ride" | "landmark" | "calendar" | "fee" | "default";

const RIDE_TYPES = new Set(["ride_accepted", "driver_arrived", "ride_completed", "no_driver_found"]);

export function notificationIconKind(type: string): NotificationIconKind {
  if (RIDE_TYPES.has(type)) return "ride";
  if (type.startsWith("landmark_")) return "landmark";
  if (type === "settlement_reminder") return "calendar";
  if (type === "cancellation_fee") return "fee";
  return "default";
}

export interface NotificationPayload {
  rideId: string | null;
  /** `fee` ou `price` selon le type — les numériques arrivent en chaînes. */
  amount: number | null;
  name: string | null;
}

/** Payload Json → champs sûrs. */
export function notificationPayload(n: NotificationRow): NotificationPayload {
  const raw = n.payload;
  const p = (
    typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {}
  ) as Record<string, unknown>;
  const amountRaw = p.fee ?? p.price;
  return {
    rideId: typeof p.ride_id === "string" ? p.ride_id : null,
    amount:
      typeof amountRaw === "number" || typeof amountRaw === "string" ? Number(amountRaw) : null,
    name: typeof p.name === "string" ? p.name : null,
  };
}

/** Titre C-22 — libellé français ; « Course terminée — 1 500 FCFA ». */
export function notificationTitle(n: NotificationRow, t: TranslateFn): string {
  const key = notificationLabelKey(n.type);
  const title = key ? t(key) : n.type;
  const { amount } = notificationPayload(n);
  if (n.type === "ride_completed" && amount !== null) {
    return `${title} — ${formatXaf(amount, "FCFA")}`;
  }
  return title;
}

/** Corps optionnel C-22 (repères, frais, reçu) — null si rien à dire. */
export function notificationDetail(n: NotificationRow, t: TranslateFn): string | null {
  const { amount, name } = notificationPayload(n);
  if (n.type === "ride_completed") return t("history:notifs.detailRideCompleted");
  if (n.type === "cancellation_fee" && amount !== null)
    return t("history:notifs.detailCancellationFee", { montant: formatXaf(amount, "FCFA") });
  if (n.type === "landmark_accepted" && name)
    return t("history:notifs.detailLandmarkAccepted", { nom: name });
  if (n.type === "landmark_rejected" && name)
    return t("history:notifs.detailLandmarkRejected", { nom: name });
  return null;
}

export interface NotificationSection {
  key: string;
  label: DayLabel;
  items: NotificationRow[];
}

/** Sections par jour (Aujourd'hui / Hier / date) — entrée déjà triée desc. */
export function groupNotifications(items: NotificationRow[], now: Date): NotificationSection[] {
  const sections: NotificationSection[] = [];
  for (const item of items) {
    const label = dayLabel(new Date(item.created_at), now);
    const key = label.kind === "date" ? label.label : label.kind;
    const existing = sections.find((s) => s.key === key);
    if (existing) existing.items.push(item);
    else sections.push({ key, label, items: [item] });
  }
  return sections;
}
