// Présentation de l'historique chauffeur D-20 — helpers purs, testés sans
// rendu. Les numériques Postgres arrivent en CHAÎNES via supabase-js :
// Number() systématique avant tout calcul ou formatage.
//
// TODO backend : le NET chauffeur par course (montant − 15 % de commission)
// n'est pas exposé — la commission ne vit qu'au grand livre (ledger,
// commission_due). Exposer le net par ride (jointure ledger ou colonne
// calculée) pour afficher « +1 020 F · course 1 200 · com. −180 » comme la
// maquette ; en attendant : montant brut + « commission déduite au solde ».

import { formatXaf } from "@teko/core";
import type { RideRow, RideStatus } from "@teko/types";
import type { StatusChipTone } from "@teko/ui/native";
import type { TranslateFn } from "./format";
import { accountFr } from "./strings";

export type DriverRideFilter = "toutes" | "terminees" | "annulees";

const CANCELLED_STATUSES: readonly RideStatus[] = [
  "cancelled_client",
  "cancelled_driver",
  "no_show",
  "no_answer",
  "failed",
];

export function matchesFilter(ride: RideRow, filter: DriverRideFilter): boolean {
  switch (filter) {
    case "toutes":
      return true;
    case "terminees":
      return ride.status === "completed";
    case "annulees":
      return CANCELLED_STATUSES.includes(ride.status);
  }
}

export interface RideChipSpec {
  tone: StatusChipTone;
  labelKey: string;
}

/** Puce d'état D-20 — l'état est porté par le libellé, la couleur l'appuie. */
export function rideChip(ride: RideRow): RideChipSpec {
  if (ride.status === "completed")
    return { tone: "ok", labelKey: "account:historique.statutTerminee" };
  if (CANCELLED_STATUSES.includes(ride.status))
    return { tone: "cancel", labelKey: "account:historique.statutAnnulee" };
  return { tone: "pending", labelKey: "account:historique.statutEnCours" };
}

/** « 14 h 46 » — convention horaire des maquettes. */
export function formatTimeFr(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h} h ${m}`;
}

/** Heure de référence : fin de course, sinon départ, sinon demande. */
export function rideDate(ride: RideRow): Date {
  return new Date(ride.completed_at ?? ride.started_at ?? ride.created_at);
}

/** Titre D-20 : « départ → arrivée » si les deux indications existent,
 *  sinon null (l'écran affiche « Course {catégorie} »). */
export function rideTitle(ride: RideRow): string | null {
  return ride.origin_hint && ride.dest_hint ? `${ride.origin_hint} → ${ride.dest_hint}` : null;
}

/** Sous-titre D-20 : heure · catégorie (· Espèces/Airtel). */
export function rideHint(ride: RideRow, t: TranslateFn): string {
  const parts = [formatTimeFr(rideDate(ride)), t(`account:categorie.${ride.category}`)];
  if (ride.payment_method === "cash") parts.push(t("account:historique.paiementEspeces"));
  if (ride.payment_method === "airtel") parts.push(t("account:historique.paiementAirtel"));
  return parts.join(" · ");
}

export interface DriverAmount {
  text: string;
  /** true → sous-ligne « commission déduite au solde » (montant brut). */
  showCommission: boolean;
}

/** Montant D-20 : brut final (+), 0 si annulée, ≈ estimation sinon. */
export function rideAmount(ride: RideRow): DriverAmount {
  if (ride.status === "completed" && ride.price_final !== null) {
    return { text: `+${formatXaf(Number(ride.price_final), "F")}`, showCommission: true };
  }
  if (CANCELLED_STATUSES.includes(ride.status)) {
    return { text: formatXaf(0, "F"), showCommission: false };
  }
  if (ride.price_est !== null) {
    return { text: `≈${formatXaf(Number(ride.price_est), "F")}`, showCommission: false };
  }
  return { text: "—", showCommission: false };
}

export type DayLabel = { kind: "today" } | { kind: "yesterday" } | { kind: "date"; label: string };

const DAY_MS = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Aujourd'hui / Hier / « Dimanche 17 août ». */
export function dayLabel(date: Date, now: Date): DayLabel {
  const diff = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
  if (diff === 0) return { kind: "today" };
  if (diff === -1) return { kind: "yesterday" };
  const { jours, mois } = accountFr.calendrier;
  return {
    kind: "date",
    label: `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]}`,
  };
}

export function dayLabelText(label: DayLabel, t: TranslateFn): string {
  if (label.kind === "today") return t("account:historique.aujourdhui");
  if (label.kind === "yesterday") return t("account:historique.hier");
  return label.label;
}

export interface DaySection {
  key: string;
  label: DayLabel;
  rides: RideRow[];
  /** Brut du jour (courses terminées) — le net n'est pas en base. */
  totalXaf: number;
}

/** Sections D-20 par jour de demande (entrée déjà triée du plus récent
 *  au plus ancien) — total brut du jour en tête de section. */
export function groupRidesByDay(rides: RideRow[], now: Date): DaySection[] {
  const sections: DaySection[] = [];
  for (const ride of rides) {
    const label = dayLabel(new Date(ride.created_at), now);
    const key = label.kind === "date" ? label.label : label.kind;
    let section = sections.find((s) => s.key === key);
    if (!section) {
      section = { key, label, rides: [], totalXaf: 0 };
      sections.push(section);
    }
    section.rides.push(ride);
    if (ride.status === "completed" && ride.price_final !== null) {
      section.totalXaf += Number(ride.price_final);
    }
  }
  return sections;
}

/** « Aujourd'hui · 9 courses » — tête de section D-20. */
export function sectionTitle(section: DaySection, t: TranslateFn): string {
  const count = t("account:historique.coursesJour", { count: section.rides.length });
  return `${dayLabelText(section.label, t)} · ${count}`;
}

/** « +13 520 F » — total brut du jour, null si rien d'encaissé. */
export function sectionTotalText(section: DaySection): string | null {
  return section.totalXaf > 0 ? `+${formatXaf(section.totalXaf, "F")}` : null;
}
