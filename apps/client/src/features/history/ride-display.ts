// Présentation des courses (C-19 historique / C-20 détail) — helpers purs,
// testés sans rendu. Les numériques Postgres arrivent en CHAÎNES via
// supabase-js : Number() systématique avant tout calcul ou formatage.

import { formatXaf } from "@teko/core";
import type { RideRow, RideStatus } from "@teko/types";
import type { StatusChipTone } from "@teko/ui/native";
import { historyFr } from "./strings";

/** Signature minimale de `t` (react-i18next) utilisée par les helpers. */
export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export type RideFilter = "toutes" | "aVenir" | "terminees" | "annulees";

const CANCELLED_STATUSES: readonly RideStatus[] = [
  "cancelled_client",
  "cancelled_driver",
  "no_show",
  "no_answer",
  "failed",
];

/** Statuts depuis lesquels cancel_ride accepte une annulation (backend). */
export const CANCELLABLE_STATUSES: readonly RideStatus[] = [
  "requested",
  "accepted",
  "enroute",
  "arrived",
];

/** À venir : planifiée dans le futur et pas encore attribuée. */
export function isUpcoming(ride: RideRow, now: Date): boolean {
  return (
    ride.status === "requested" &&
    ride.scheduled_at !== null &&
    new Date(ride.scheduled_at).getTime() > now.getTime()
  );
}

export interface RideChipSpec {
  tone: StatusChipTone;
  labelKey: string;
}

/** Puce d'état C-19 — l'état est porté par le libellé, la couleur l'appuie. */
export function rideChip(ride: RideRow, now: Date): RideChipSpec {
  if (ride.status === "completed") return { tone: "ok", labelKey: "history:liste.statutTerminee" };
  if (CANCELLED_STATUSES.includes(ride.status))
    return { tone: "cancel", labelKey: "history:liste.statutAnnulee" };
  if (isUpcoming(ride, now))
    return { tone: "scheduled", labelKey: "history:liste.statutPlanifiee" };
  return { tone: "pending", labelKey: "history:liste.statutEnCours" };
}

export function matchesFilter(ride: RideRow, filter: RideFilter, now: Date): boolean {
  switch (filter) {
    case "toutes":
      return true;
    case "aVenir":
      return isUpcoming(ride, now);
    case "terminees":
      return ride.status === "completed";
    case "annulees":
      return CANCELLED_STATUSES.includes(ride.status);
  }
}

/** « 08 h 00 » — convention horaire des maquettes. */
export function formatTimeFr(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h} h ${m}`;
}

/** « 5,2 km » à partir des mètres estimés. */
export function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

export type DayLabel =
  | { kind: "today" | "yesterday" | "tomorrow" }
  | { kind: "date"; label: string };

export type SectionLabel = DayLabel | { kind: "upcoming" };

const DAY_MS = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Aujourd'hui / Hier / Demain / « Lundi 11 août ». */
export function dayLabel(date: Date, now: Date): DayLabel {
  const diff = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
  if (diff === 0) return { kind: "today" };
  if (diff === -1) return { kind: "yesterday" };
  if (diff === 1) return { kind: "tomorrow" };
  const { jours, mois } = historyFr.calendrier;
  return {
    kind: "date",
    label: `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]}`,
  };
}

export function dayLabelText(label: SectionLabel, t: TranslateFn): string {
  switch (label.kind) {
    case "upcoming":
      return t("history:jours.aVenir");
    case "today":
      return t("history:jours.aujourdhui");
    case "yesterday":
      return t("history:jours.hier");
    case "tomorrow":
      return t("history:jours.demain");
    case "date":
      return label.label;
  }
}

/** Date de référence d'un trajet : heure planifiée, sinon demande. */
export function rideDate(ride: RideRow): Date {
  return new Date(ride.scheduled_at ?? ride.created_at);
}

export interface RideSection {
  key: string;
  label: SectionLabel;
  rides: RideRow[];
}

/** Sections C-19 : « À venir » d'abord (heure croissante), puis par jour
 *  de demande (l'entrée est déjà triée du plus récent au plus ancien). */
export function groupRides(rides: RideRow[], now: Date): RideSection[] {
  const upcoming = rides
    .filter((r) => isUpcoming(r, now))
    .sort((a, b) => rideDate(a).getTime() - rideDate(b).getTime());
  const sections: RideSection[] =
    upcoming.length > 0 ? [{ key: "upcoming", label: { kind: "upcoming" }, rides: upcoming }] : [];
  for (const ride of rides.filter((r) => !isUpcoming(r, now))) {
    const label = dayLabel(new Date(ride.created_at), now);
    const key = label.kind === "date" ? label.label : label.kind;
    const existing = sections.find((s) => s.key === key);
    if (existing) existing.rides.push(ride);
    else sections.push({ key, label, rides: [ride] });
  }
  return sections;
}

/** Titre C-19 : « départ → arrivée » si les deux indications existent,
 *  sinon null (l'écran affiche « Course {catégorie} »). */
export function rideTitle(ride: RideRow): string | null {
  return ride.origin_hint && ride.dest_hint ? `${ride.origin_hint} → ${ride.dest_hint}` : null;
}

/** Sous-titre C-19 : jour (si à venir) · heure · catégorie. */
export function rideHint(ride: RideRow, now: Date, t: TranslateFn): string {
  const d = rideDate(ride);
  const cat = t(`history:categorie.${ride.category}`);
  if (isUpcoming(ride, now)) {
    return `${dayLabelText(dayLabel(d, now), t)} · ${formatTimeFr(d)} · ${cat}`;
  }
  return `${formatTimeFr(d)} · ${cat}`;
}

/** Montant C-19/C-20 : final sinon ≈ estimation ; annulée sans final = 0. */
export function rideAmountText(ride: RideRow): string {
  if (ride.price_final !== null) return formatXaf(Number(ride.price_final), "FCFA");
  if (CANCELLED_STATUSES.includes(ride.status)) return formatXaf(0, "FCFA");
  if (ride.price_est !== null) return `≈${formatXaf(Number(ride.price_est), "FCFA")}`;
  return "—";
}

/** Ligne « quand » C-20 : jour · heure(s) · distance. */
export function describeWhen(ride: RideRow, now: Date, t: TranslateFn): string {
  const base = new Date(ride.completed_at ?? ride.started_at ?? ride.scheduled_at ?? ride.created_at);
  const times =
    ride.started_at && ride.completed_at
      ? `${formatTimeFr(new Date(ride.started_at))} → ${formatTimeFr(new Date(ride.completed_at))}`
      : formatTimeFr(base);
  const parts = [dayLabelText(dayLabel(base, now), t), times];
  if (ride.distance_est_m !== null) parts.push(formatKm(Number(ride.distance_est_m)));
  return parts.join(" · ");
}
