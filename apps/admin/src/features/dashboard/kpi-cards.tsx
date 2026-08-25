// 4 cartes KPI du tableau de bord — maquettes A-02 / AM-01.
//
// Écarts assumés vs maquette : les sous-lignes « +4 vs il y a 1 h » exigent
// un historique que le backend n'expose pas encore → sous-lignes factuelles ;
// « Temps d'attribution médian » = TODO backend, affiché « — ».

import type { DashboardCounts } from "@teko/api-client";
import { formatXaf } from "@teko/core";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  subTone?: "success" | "muted";
  title?: string;
}

function KpiCard({ label, value, sub, subTone = "success", title }: KpiCardProps) {
  return (
    <div
      className="rounded-[14px] border border-neutral-200 bg-neutral-0 px-4 py-3.5"
      title={title}
    >
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.7px] text-neutral-500">
        {label}
      </p>
      <p className="font-mono text-2xl font-black tabular-nums text-neutral-900">{value}</p>
      {sub ? (
        <p
          className={`mt-0.5 text-[11.5px] font-semibold ${
            subTone === "success" ? "text-success-dark" : "text-neutral-400"
          }`}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

interface KpiCardsProps {
  counts?: DashboardCounts;
  volume?: { total: number; count: number };
}

export function KpiCards({ counts, volume }: KpiCardsProps) {
  const n = (v: number | undefined) => (v === undefined ? "—" : String(v));
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
      <KpiCard label="Courses en cours" value={n(counts?.activeRides)} sub="en ce moment" />
      <KpiCard
        label="Chauffeurs en ligne"
        value={n(counts?.onlineDrivers)}
        sub="présence temps réel"
      />
      <KpiCard
        label="Volume du jour"
        value={volume ? formatXaf(volume.total) : "—"}
        sub={
          volume
            ? `${volume.count} course${volume.count > 1 ? "s" : ""} terminée${volume.count > 1 ? "s" : ""}`
            : undefined
        }
      />
      <KpiCard
        label="Temps d'attribution médian"
        value="—"
        sub="statistique à venir"
        subTone="muted"
        title="Calcul backend à venir (agrégat requested → accepted)."
      />
    </div>
  );
}
