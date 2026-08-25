"use client";

// A-02 / AM-01 — tableau de bord temps réel de la console.

import { DashboardContent } from "../../../src/features/dashboard/dashboard-content";
import { PageHeader } from "../../../src/features/shell/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Tableau de bord">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-success-dark">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
          Temps réel · Libreville
        </span>
      </PageHeader>
      <DashboardContent />
    </>
  );
}
