// Formatage pur des écrans C-15/16/17 — dates « 14 h 46 », n° de reçu,
// libellés de catégorie… Logique testée à part (aucune dépendance RN).

import type { RideRow, VehicleCategory } from "@teko/types";

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const CATEGORIES: Record<VehicleCategory, string> = {
  eco: "Éco",
  moto: "Moto",
  confort: "Confort",
  covoiturage: "Covoiturage",
};

export function categorieLabel(categorie: VehicleCategory): string {
  return CATEGORIES[categorie];
}

/** « 14 h 46 » — convention horaire des maquettes. */
export function heureFr(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`;
}

/** null si c'est aujourd'hui (l'écran affiche « Aujourd'hui »), sinon
 *  « 26 août » (+ année si différente). */
export function jourFr(iso: string, maintenant: Date = new Date()): string | null {
  const d = new Date(iso);
  const memeJour =
    d.getFullYear() === maintenant.getFullYear() &&
    d.getMonth() === maintenant.getMonth() &&
    d.getDate() === maintenant.getDate();
  if (memeJour) return null;
  const base = `${d.getDate()} ${MOIS[d.getMonth()]}`;
  return d.getFullYear() === maintenant.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** N° de reçu affiché « TK-2608-0147 » : jour+mois + début de l'id course. */
export function numeroRecu(ride: Pick<RideRow, "id" | "completed_at" | "created_at">): string {
  const d = new Date(ride.completed_at ?? ride.created_at);
  const jjmm = `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `TK-${jjmm}-${ride.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/** Le montant qui fait foi : final si posé, sinon l'estimation garantie.
 *  (supabase-js sérialise les numeric en chaînes — coercition systématique.) */
export function montantCourse(ride: Pick<RideRow, "price_final" | "price_est">): number {
  return Number(ride.price_final ?? ride.price_est ?? 0);
}

/** Durée réelle (started→completed) sinon l'estimée, en minutes (≥ 1). */
export function dureeMin(
  ride: Pick<RideRow, "started_at" | "completed_at" | "duration_est_s">,
): number {
  const secondes =
    ride.started_at && ride.completed_at
      ? (new Date(ride.completed_at).getTime() - new Date(ride.started_at).getTime()) / 1_000
      : Number(ride.duration_est_s ?? 0);
  return Math.max(1, Math.round(secondes / 60));
}

/** « 5,2 » — kilomètres à une décimale, virgule française. */
export function kmFr(distanceM: number): string {
  return (Math.round(distanceM / 100) / 10).toString().replace(".", ",");
}

/** « Boris Mba » → « Boris M. » — prénom + initiale (vie privée chauffeur). */
export function nomCourt(fullName: string): string {
  const [prenom, nom] = fullName.trim().split(/\s+/);
  if (!prenom) return "";
  return nom ? `${prenom} ${nom.charAt(0).toUpperCase()}.` : prenom;
}

/** « Boris M. » → « BM » — initiales de l'avatar (2 max). */
export function initialesDe(nom: string): string {
  return nom
    .trim()
    .split(/\s+/)
    .map((mot) => mot.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** « +24106123456 » → « +241 06 12 34 56 » (affichage uniquement). */
export function telephoneAffiche(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("241")) return phone;
  const paires = digits.slice(3).match(/.{1,2}/g) ?? [];
  return `+241 ${paires.join(" ")}`;
}

/** Référence de transaction raccourcie : « MP2608…4471 ». */
export function refCourte(ref: string): string {
  return ref.length > 12 ? `${ref.slice(0, 6)}…${ref.slice(-4)}` : ref;
}
