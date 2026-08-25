"use client";

// Table des utilisateurs (A-06) : nom, téléphone, rôle, inscription, statut.
// La ligne se sélectionne au clic (bouton sur le nom pour l'accessibilité).

import type { PendingKycRow } from "@teko/api-client";
import type { TableRow } from "@teko/types";
import { formatDate, initials } from "./format-date";
import { profileStatus, RolePill, StatusPill } from "./pills";

interface UsersTableProps {
  profiles: TableRow<"profiles">[];
  drivers: Map<string, PendingKycRow> | undefined;
  selectedId: string | null;
  onSelect: (profile: TableRow<"profiles">) => void;
}

const HEADERS = ["Utilisateur", "Téléphone", "Rôle", "Inscrit le", "Statut"];

export function UsersTable({ profiles, drivers, selectedId, onSelect }: UsersTableProps) {
  if (profiles.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-[12.5px] text-neutral-500">
        Aucun utilisateur ne correspond à cette recherche.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            {HEADERS.map((header) => (
              <th
                key={header}
                className="bg-neutral-50 px-4 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-neutral-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr
              key={profile.id}
              className={`border-t border-neutral-100 ${
                selectedId === profile.id ? "bg-brand-50" : "hover:bg-neutral-50"
              }`}
            >
              <td className="px-4 py-2">
                <button
                  type="button"
                  data-testid={`user-row-${profile.id}`}
                  className="flex w-full items-center gap-2.5 text-left"
                  onClick={() => onSelect(profile)}
                >
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-800">
                    {initials(profile.full_name)}
                  </span>
                  <span className="font-bold text-neutral-900">{profile.full_name ?? "—"}</span>
                </button>
              </td>
              <td className="whitespace-nowrap px-4 py-2 font-mono tabular-nums text-neutral-500">
                {profile.phone ?? "—"}
              </td>
              <td className="px-4 py-2">
                <RolePill role={profile.role} />
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-neutral-500">
                {formatDate(profile.created_at)}
              </td>
              <td className="px-4 py-2">
                <StatusPill status={profileStatus(profile, drivers?.get(profile.id))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
