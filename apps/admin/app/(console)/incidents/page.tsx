"use client";

// AM-06 — incidents & alertes SOS (liste), aussi accessible desktop
// depuis le flux d'activité du tableau de bord.

import { IncidentsContent } from "../../../src/features/dashboard/incidents-content";
import { PageHeader } from "../../../src/features/shell/page-header";

export default function IncidentsPage() {
  return (
    <>
      <PageHeader title="Incidents & SOS" />
      <IncidentsContent />
    </>
  );
}
