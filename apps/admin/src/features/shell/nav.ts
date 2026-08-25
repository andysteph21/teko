// Navigation de la console — 6 entrées latérales (A-02) ; Équipe/Rôles/
// Journal vivent en onglets de Paramètres. Mobile (AM) : 4 + « Plus ».

import type { IconName } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Clé de compteur (pastille orange) alimentée par le tableau de bord. */
  badge?: "kyc" | "carto";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "dashboard" },
  { href: "/kyc", label: "Validation KYC", icon: "kyc", badge: "kyc" },
  { href: "/map", label: "Cartographie", icon: "map", badge: "carto" },
  { href: "/finance", label: "Finance", icon: "finance" },
  { href: "/users", label: "Utilisateurs", icon: "users" },
  { href: "/settings", label: "Paramètres", icon: "settings" },
];

/** Barre basse mobile (AM-01→AM-07) : l'essentiel + « Plus ». */
export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Tableau", icon: "dashboard" },
  { href: "/kyc", label: "KYC", icon: "kyc", badge: "kyc" },
  { href: "/map", label: "Carto", icon: "map", badge: "carto" },
  { href: "/finance", label: "Finance", icon: "finance" },
  { href: "/more", label: "Plus", icon: "more" },
];

export interface NavBadges {
  kyc?: number;
  carto?: number;
}
