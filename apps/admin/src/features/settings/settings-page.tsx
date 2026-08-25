"use client";

// A-07 → A-10 sous une seule route /settings, onglets persistés par
// querystring (?tab=) : Paramètres · Équipe · Rôles & permissions · Journal.

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "../shell/page-header";
import { ConfigTab } from "./config-tab";
import { JournalTab } from "./journal-tab";
import { RolesTab } from "./roles-tab";
import { TeamTab } from "./team-tab";

const TABS = [
  { id: "parametres", label: "Paramètres" },
  { id: "equipe", label: "Équipe" },
  { id: "roles", label: "Rôles & permissions" },
  { id: "journal", label: "Journal d'audit" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsTabs />
    </Suspense>
  );
}

function SettingsTabs() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : "parametres";

  return (
    <>
      <PageHeader title="Paramètres de la plateforme" />
      <div className="flex flex-wrap gap-1.5 px-4 pt-3 lg:px-5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`settings-tab-${item.id}`}
            aria-current={tab === item.id ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${
              tab === item.id ? "bg-brand-50 text-brand-800" : "bg-neutral-100 text-neutral-500"
            }`}
            onClick={() => router.replace(`/settings?tab=${item.id}`)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="p-4 lg:p-5">
        {tab === "parametres" ? <ConfigTab /> : null}
        {tab === "equipe" ? <TeamTab /> : null}
        {tab === "roles" ? <RolesTab /> : null}
        {tab === "journal" ? <JournalTab /> : null}
      </div>
    </>
  );
}
