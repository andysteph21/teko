"use client";

// Contenu du tableau de bord (A-02 desktop / AM-01 mobile) : KPI, carte en
// direct + flux d'activité. Polling 30 s (pas de Realtime admin, cf. carte).

import { useMemo } from "react";
import { buildActivityFeed, todayVolumeXaf } from "./activity";
import { ActivityFeed } from "./activity-feed";
import { apiErrorText } from "./api-error";
import { KpiCards } from "./kpi-cards";
import { LiveMapCard } from "./live-map-card";
import { TodoCard } from "./todo-card";
import { useDashboardCounts, useIncidents, useRecentRides } from "./use-dashboard-data";

export function DashboardContent() {
  const counts = useDashboardCounts();
  const rides = useRecentRides();
  const incidents = useIncidents();

  const volume = useMemo(() => (rides.data ? todayVolumeXaf(rides.data) : undefined), [rides.data]);
  const events = useMemo(
    () => buildActivityFeed(rides.data ?? [], incidents.data ?? []),
    [rides.data, incidents.data],
  );
  const error = counts.error ?? rides.error ?? incidents.error;

  return (
    <div className="p-4 lg:px-5 lg:py-4">
      {error ? (
        <p className="mb-3 rounded-xl bg-error-light px-3.5 py-2.5 text-[12.5px] font-semibold text-error-dark">
          {apiErrorText(error)}
        </p>
      ) : null}
      <KpiCards counts={counts.data} volume={volume} />
      <TodoCard counts={counts.data} />
      <div className="flex flex-col gap-3 lg:h-[520px] lg:flex-row">
        <LiveMapCard />
        <ActivityFeed events={events} loading={rides.isPending || incidents.isPending} />
      </div>
    </div>
  );
}
