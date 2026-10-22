"use client";

// A-06 Utilisateurs & litiges — recherche par nom, filtres de rôle, table et
// fiche détail (chauffeur : suspension motivée). Desktop : table + panneau
// côte à côte ; mobile : empilés (07-admin-responsive.md).

import type { TableRow } from "@teko/types";
import { type ReactNode, useState } from "react";
import { PageHeader } from "../shell/page-header";
import { AlphaInvitations } from "./alpha-invitations";
import {
  ROLE_FILTERS,
  type RoleFilter,
  useDebounced,
  useDriversIndex,
  useProfiles,
} from "./use-users";
import { UserDetail } from "./user-detail";
import { UsersTable } from "./users-table";

type Profile = TableRow<"profiles">;

export function UsersPage() {
  const [input, setInput] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [selected, setSelected] = useState<Profile | null>(null);
  const search = useDebounced(input);
  const profiles = useProfiles(search, role);
  const drivers = useDriversIndex();

  return (
    <>
      <PageHeader title="Utilisateurs & litiges">
        <input
          type="search"
          data-testid="users-search"
          placeholder="Rechercher par nom…"
          className="ml-2 h-[34px] w-full max-w-[320px] rounded-[10px] bg-neutral-100 px-3 text-[12.5px] outline-none placeholder:text-neutral-400"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
      </PageHeader>
      <div className="flex flex-col gap-3 p-4 lg:p-5">
        <AlphaInvitations />
        <RoleFilters role={role} onChange={setRole} />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
          <UsersListPanel query={profiles} selected={selected} onSelect={setSelected} />
          <div className="flex flex-col gap-3">
            <Panel title="Fiche utilisateur">
              {selected ? (
                <UserDetail profile={selected} driver={drivers.data?.get(selected.id)} />
              ) : (
                <Note>Sélectionnez un utilisateur dans la liste.</Note>
              )}
            </Panel>
            <Panel title="Demandes de suppression">
              <Note>
                TODO backend : aucun wrapper admin ne liste les demandes de suppression de compte
                (profils avec « deletion_requested_at » + délai de grâce). À brancher dès que
                @teko/api-client expose une lecture dédiée.
              </Note>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

function RoleFilters({ role, onChange }: { role: RoleFilter; onChange: (r: RoleFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ROLE_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          data-testid={`users-filter-${filter.id}`}
          className={`rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold ${
            role === filter.id
              ? "border-brand-600 bg-brand-50 text-brand-800"
              : "border-neutral-200 bg-neutral-0 text-neutral-500"
          }`}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

interface UsersListPanelProps {
  query: ReturnType<typeof useProfiles>;
  selected: Profile | null;
  onSelect: (profile: Profile) => void;
}

function UsersListPanel({ query, selected, onSelect }: UsersListPanelProps) {
  const drivers = useDriversIndex();
  return (
    <Panel title="Utilisateurs">
      {query.isPending ? (
        <Note>Chargement…</Note>
      ) : query.isError ? (
        <p className="px-4 py-8 text-center text-[12.5px] font-semibold text-error">
          Lecture impossible. Vérifiez le réseau puis réessayez.
        </p>
      ) : (
        <UsersTable
          profiles={query.data}
          drivers={drivers.data}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
        />
      )}
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0">
      <h2 className="border-b border-neutral-100 px-4 py-3 text-[13.5px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-6 text-center text-[12.5px] leading-relaxed text-neutral-500">
      {children}
    </p>
  );
}
