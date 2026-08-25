"use client";

// Onglet Rôles & permissions (A-09) — matrice STATIQUE des capacités par
// rôle (enum admin_role), lecture seule. La matrice est appliquée par la
// base (RLS + triggers) : cet écran ne fait que la documenter.

import { AdminRolePill } from "./team-tab";

type Grant = "yes" | "no" | "own";

interface Capacity {
  label: string;
  sub: string;
  grants: [Grant, Grant, Grant, Grant]; // ops · carto · finance · superadmin
}

const ROLES = ["ops", "carto", "finance", "superadmin"] as const;

const MATRIX: Capacity[] = [
  {
    label: "Tableau de bord temps réel",
    sub: "A-02 · lecture",
    grants: ["yes", "yes", "yes", "yes"],
  },
  {
    label: "Valider / refuser un dossier KYC",
    sub: "A-03 · active ou bloque un chauffeur",
    grants: ["yes", "no", "no", "yes"],
  },
  {
    label: "Suspendre un utilisateur, gérer un litige",
    sub: "A-06 · motif obligatoire",
    grants: ["yes", "no", "no", "yes"],
  },
  {
    label: "Valider repères & routes proposés",
    sub: "A-04 · impacte la carte de tous",
    grants: ["no", "yes", "no", "yes"],
  },
  {
    label: "Tracer routes, éditer zones tarifaires",
    sub: "A-04 · l'activation d'une zone reste superadmin",
    grants: ["no", "yes", "no", "yes"],
  },
  {
    label: "Consulter soldes, versements, statements",
    sub: "A-05 · lecture",
    grants: ["no", "no", "yes", "yes"],
  },
  {
    label: "Règlement manuel & réconciliation Airtel",
    sub: "A-05 · écrit au grand livre via RPC",
    grants: ["no", "no", "yes", "yes"],
  },
  {
    label: "Modifier commission, frais, délais, zones actives",
    sub: "A-07 · double confirmation (guard_sensitive_config)",
    grants: ["no", "no", "no", "yes"],
  },
  {
    label: "Gérer l'équipe admin et les rôles",
    sub: "A-08 · anti-élévation, dernier superadmin protégé",
    grants: ["no", "no", "no", "yes"],
  },
  {
    label: "Journal d'audit",
    sub: "chaque rôle voit ses propres actions ; lecture globale superadmin",
    grants: ["own", "own", "own", "yes"],
  },
];

function GrantCell({ grant }: { grant: Grant }) {
  if (grant === "yes") return <span className="text-sm font-black text-success-dark">✓</span>;
  if (grant === "own") {
    return (
      <span className="rounded-full bg-warning-light px-2 py-0.5 text-[10px] font-extrabold text-warning-dark">
        Ses actions
      </span>
    );
  }
  return <span className="font-bold text-neutral-300">—</span>;
}

export function RolesTab() {
  return (
    <div className="flex flex-col gap-3">
      <section className="overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0">
        <h2 className="border-b border-neutral-100 px-4 py-3 text-[13.5px] font-bold">
          Matrice des permissions — rôles fixes au MVP (enum{" "}
          <span className="font-mono">admin_role</span> en base)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="bg-neutral-50 px-4 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">
                  Capacité
                </th>
                {ROLES.map((role) => (
                  <th key={role} className="w-[110px] bg-neutral-50 px-4 py-2 text-center">
                    <AdminRolePill role={role} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((capacity) => (
                <tr key={capacity.label} className="border-t border-neutral-100">
                  <td className="px-4 py-2">
                    <span className="font-semibold">{capacity.label}</span>
                    <span className="block text-[11px] text-neutral-500">{capacity.sub}</span>
                  </td>
                  {capacity.grants.map((grant, index) => (
                    <td key={ROLES[index]} className="px-4 py-2 text-center">
                      <GrantCell grant={grant} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="rounded-[14px] border border-neutral-200 bg-neutral-0 px-4 py-3 text-xs leading-relaxed text-neutral-500">
        <strong className="text-neutral-700">Règles transverses.</strong> Les rôles sont exclusifs
        et fixes au MVP — les rôles personnalisés viendront avec une version ultérieure. Toute
        action d'écriture est journalisée avec l'auteur, l'objet et le motif.{" "}
        <strong className="text-neutral-700">La matrice est appliquée par la base (RLS)</strong> —
        un écran ne suffit jamais à obtenir un droit.
      </p>
    </div>
  );
}
