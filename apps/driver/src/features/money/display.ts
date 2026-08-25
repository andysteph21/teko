// Présentation pure du parcours I (D-15/16/17) — états du solde, libellés
// du grand livre, dates françaises, compte à rebours. Testé sans rendu.
// Les numériques Postgres arrivent en CHAÎNES via supabase-js : Number()
// systématique avant tout calcul ou formatage.

import { isBalanceUrgent } from "@teko/core";
import type { DbEnum, TableRow } from "@teko/types";
import type { StatusChipTone } from "@teko/ui/native";
import { moneyFr } from "./strings";

export type LedgerRow = TableRow<"ledger">;
export type StatementRow = TableRow<"daily_statements">;

/** Libreville est en UTC+1 toute l'année (affichage des heures). */
const LIBREVILLE_OFFSET_MS = 3_600_000;
const DAY_MS = 86_400_000;

// ── États du solde (doc parcours I) ─────────────────────────────────────

export type BalanceState = "crediteur" | "debiteur" | "urgence" | "suspendu";

/** Suspendu (bloquant mais réversible) > urgence (< 4 h) > débiteur > créditeur. */
export function balanceState(balanceXaf: number, isActive: boolean, now: Date): BalanceState {
  if (!isActive) return "suspendu";
  if (isBalanceUrgent(balanceXaf, now)) return "urgence";
  return balanceXaf < 0 ? "debiteur" : "crediteur";
}

/** « 1 h 30 » au-delà d'une heure, sinon compte à rebours « mm:ss ». */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1_000));
  if (total >= 3_600) {
    const h = Math.floor(total / 3_600);
    const min = Math.floor((total % 3_600) / 60);
    return `${h} h ${String(min).padStart(2, "0")}`;
  }
  const m = Math.floor(total / 60);
  return `${String(m).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ── Dates françaises (business_day « YYYY-MM-DD ») ──────────────────────

function dateOf(isoDay: string): Date {
  return new Date(`${isoDay}T12:00:00Z`);
}

/** « lundi 18 août » (en-tête D-15). */
export function jourLong(isoDay: string): string {
  const d = dateOf(isoDay);
  const { jours, mois } = moneyFr.calendrier;
  return `${(jours[d.getUTCDay()] ?? "").toLowerCase()} ${d.getUTCDate()} ${mois[d.getUTCMonth()]}`;
}

/** « 18 août » (sous-titre D-16). */
export function jourBref(isoDay: string): string {
  const d = dateOf(isoDay);
  return `${d.getUTCDate()} ${moneyFr.calendrier.mois[d.getUTCMonth()]}`;
}

/** Titre de journée D-17 : « Aujourd'hui · lun. 18 août » ou « Dimanche 17 août ». */
export function jourTitre(isoDay: string, aujourdhuiIso: string): string {
  const d = dateOf(isoDay);
  const { jours, joursCourts, mois } = moneyFr.calendrier;
  if (isoDay === aujourdhuiIso) {
    return `${moneyFr.solde.aujourdhui} · ${joursCourts[d.getUTCDay()]} ${d.getUTCDate()} ${mois[d.getUTCMonth()]}`;
  }
  return `${jours[d.getUTCDay()]} ${d.getUTCDate()} ${mois[d.getUTCMonth()]}`;
}

/** « 14 h 46 » heure de Libreville (UTC+1 fixe), déterministe en test. */
export function heureLibreville(isoTs: string): string {
  const d = new Date(new Date(isoTs).getTime() + LIBREVILLE_OFFSET_MS);
  return `${d.getUTCHours()} h ${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

// ── Grand livre (D-15) ──────────────────────────────────────────────────

const KIND_KEYS: Record<DbEnum<"ledger_kind">, string> = {
  commission_due: "money:solde.kindCommission",
  mobile_credit: "money:solde.kindMobileCredit",
  settlement: "money:solde.kindSettlement",
  payout: "money:solde.kindPayout",
  cancellation: "money:solde.kindCancellation",
  adjustment: "money:solde.kindAdjustment",
};

export function ledgerKindKey(kind: DbEnum<"ledger_kind">): string {
  return KIND_KEYS[kind];
}

/** Mouvements du jour métier courant, du plus récent au plus ancien. */
export function lignesDuJour(rows: LedgerRow[], aujourdhuiIso: string): LedgerRow[] {
  return rows.filter((r) => r.business_day === aujourdhuiIso);
}

// ── Relevés quotidiens (D-17) ───────────────────────────────────────────

export interface StatementChipSpec {
  labelKey: string;
  tone: StatusChipTone;
}

const CHIPS: Record<StatementRow["status"], StatementChipSpec> = {
  open: { labelKey: "money:gains.statutOpen", tone: "pending" },
  settled: { labelKey: "money:gains.statutSettled", tone: "ok" },
  overdue: { labelKey: "money:gains.statutOverdue", tone: "cancel" },
  paid_out: { labelKey: "money:gains.statutPaidOut", tone: "scheduled" },
};

export function statementChip(status: StatementRow["status"]): StatementChipSpec {
  return CHIPS[status];
}

/** Net tracé de la journée : crédits Airtel − commission (valeur absolue —
 *  la commission arrive signée négative dans le relevé). */
export function statementNet(
  st: Pick<StatementRow, "total_commission" | "total_mobile_credit">,
): number {
  return Number(st.total_mobile_credit) - Math.abs(Number(st.total_commission));
}

export interface ResumeSemaine {
  net: number;
  journees: number;
  commission: number;
}

/** Somme des 7 derniers jours métier (aujourd'hui inclus). */
export function resumeSemaine(sts: StatementRow[], aujourdhuiIso: string): ResumeSemaine {
  const debut = new Date(dateOf(aujourdhuiIso).getTime() - 6 * DAY_MS).toISOString().slice(0, 10);
  const semaine = sts.filter((s) => s.business_day >= debut && s.business_day <= aujourdhuiIso);
  return {
    net: semaine.reduce((somme, s) => somme + statementNet(s), 0),
    journees: semaine.length,
    commission: semaine.reduce((somme, s) => somme + Math.abs(Number(s.total_commission)), 0),
  };
}

// ── Règlement (D-16) ────────────────────────────────────────────────────

/** Montant saisi → entier XAF strictement positif, sinon null. */
export function parseMontant(texte: string): number | null {
  const digits = texte.replace(/\D/g, "");
  if (digits.length === 0) return null;
  const montant = Number(digits);
  return montant > 0 ? montant : null;
}

/** « +24107894512 » → « +241 07 89 45 12 » (affichage uniquement). */
export function telephoneAffiche(msisdn: string): string {
  const digits = msisdn.replace(/\D/g, "");
  if (!digits.startsWith("241")) return msisdn;
  const paires = digits.slice(3).match(/.{1,2}/g) ?? [];
  return `+241 ${paires.join(" ")}`;
}
