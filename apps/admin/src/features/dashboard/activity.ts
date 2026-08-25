// Flux « Activité récente » (A-02) et tri des incidents (AM-06) — logique
// pure : libellés français, pastilles, volume du jour. Testée sans réseau.

import { formatXaf } from "@teko/core";
import type { DbEnum, TableRow } from "@teko/types";

export type RideRow = TableRow<"rides">;
export type IncidentRow = TableRow<"incidents">;

export type PillTone = "ok" | "warn" | "err";

export interface ActivityEvent {
  id: string;
  at: string;
  label: string;
  detail: string;
  pill: { text: string; tone: PillTone };
  isSos: boolean;
}

/** Identifiant court affiché (les maquettes montrent « TK-… »). */
export function shortRideId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const RIDE_LABELS: Record<DbEnum<"ride_status">, { label: string; tone: PillTone }> = {
  requested: { label: "Course demandée", tone: "warn" },
  accepted: { label: "Course attribuée", tone: "ok" },
  enroute: { label: "Chauffeur en route", tone: "ok" },
  arrived: { label: "Chauffeur arrivé", tone: "ok" },
  started: { label: "Course démarrée", tone: "ok" },
  completed: { label: "Course terminée", tone: "ok" },
  cancelled_client: { label: "Annulation client", tone: "ok" },
  cancelled_driver: { label: "Annulation chauffeur", tone: "warn" },
  no_show: { label: "Client absent au rendez-vous", tone: "err" },
  no_answer: { label: "Course restée sans réponse", tone: "err" },
  failed: { label: "Échec d'attribution", tone: "err" },
};

const PILL_TEXT: Record<PillTone, string> = { ok: "OK", warn: "À traiter", err: "Échec" };
const PAYMENT_LABELS: Record<DbEnum<"payment_method">, string> = {
  cash: "Espèces",
  airtel: "Airtel",
};

export function rideEvent(ride: RideRow): ActivityEvent {
  const { label, tone } = RIDE_LABELS[ride.status];
  const parts = [`course ${shortRideId(ride.id)}`];
  // Les numériques PostgREST arrivent en strings : Number() systématique.
  const amount = ride.price_final ?? ride.price_est;
  if (ride.status === "completed" && amount !== null) parts.push(formatXaf(Number(amount)));
  if (ride.status === "completed" && ride.payment_method) {
    parts.push(PAYMENT_LABELS[ride.payment_method]);
  }
  return {
    id: `ride-${ride.id}`,
    at: ride.created_at,
    label,
    detail: parts.join(" · "),
    pill: { text: PILL_TEXT[tone], tone },
    isSos: false,
  };
}

const INCIDENT_LABELS: Record<DbEnum<"incident_kind">, string> = {
  sos: "SOS déclenché",
  report: "Signalement",
  dispute: "Litige",
};

export function incidentEvent(incident: IncidentRow): ActivityEvent {
  const parts: string[] = [];
  if (incident.ride_id) parts.push(`course ${shortRideId(incident.ride_id)}`);
  if (incident.message) parts.push(incident.message);
  const resolved = incident.status === "resolved";
  const tone: PillTone = resolved ? "ok" : incident.kind === "sos" ? "err" : "warn";
  return {
    id: `incident-${incident.id}`,
    at: incident.created_at,
    label: INCIDENT_LABELS[incident.kind],
    detail: parts.join(" · "),
    pill: { text: resolved ? "OK" : "À traiter", tone },
    isSos: incident.kind === "sos",
  };
}

/** Fusion courses + incidents, du plus récent au plus ancien. */
export function buildActivityFeed(
  rides: RideRow[],
  incidents: IncidentRow[],
  max = 30,
): ActivityEvent[] {
  return [...rides.map(rideEvent), ...incidents.map(incidentEvent)]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, max);
}

function isSameLocalDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Volume du jour (A-02) : somme des courses terminées aujourd'hui. */
export function todayVolumeXaf(
  rides: RideRow[],
  now = new Date(),
): { total: number; count: number } {
  let total = 0;
  let count = 0;
  for (const ride of rides) {
    if (ride.status !== "completed") continue;
    if (!isSameLocalDay(ride.completed_at ?? ride.created_at, now)) continue;
    total += Number(ride.price_final ?? ride.price_est ?? 0);
    count += 1;
  }
  return { total, count };
}

const TIME_FMT = new Intl.DateTimeFormat(["fr-GA", "fr"], { hour: "2-digit", minute: "2-digit" });
const DAY_FMT = new Intl.DateTimeFormat(["fr-GA", "fr"], { day: "2-digit", month: "2-digit" });

/** « 15:42 » le jour même, « 18/08 15:42 » sinon. */
export function formatEventTime(iso: string, now = new Date()): string {
  const time = TIME_FMT.format(new Date(iso));
  return isSameLocalDay(iso, now) ? time : `${DAY_FMT.format(new Date(iso))} ${time}`;
}

/** AM-06 : SOS non résolus en tête, résolus en queue, récent d'abord. */
export function sortIncidents(incidents: IncidentRow[]): IncidentRow[] {
  const rank = (i: IncidentRow) => (i.status === "resolved" ? 2 : i.kind === "sos" ? 0 : 1);
  return [...incidents].sort(
    (a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at),
  );
}
