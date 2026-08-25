"use client";

// Onglet Équipe (A-08) — comptes admin, invitations en attente et formulaire
// d'invitation (superadmin). Gardes réelles en base : anti-élévation, dernier
// superadmin protégé, OTP à la première connexion.

import type { TableRow } from "@teko/types";
import { formatDate, formatRelative, initials } from "../users/format-date";
import { InviteForm } from "./invite-form";
import { useAdminRole } from "./use-admin-role";
import { useAdminInvites, useAdminTeam } from "./use-settings";

const ROLE_PILLS: Record<string, string> = {
  superadmin: "bg-brand-900 text-neutral-0",
  ops: "bg-brand-50 text-brand-800",
  carto: "bg-driver-accent-light text-driver-accent-dark",
  finance: "bg-warning-light text-warning-dark",
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Superadmin",
  ops: "Ops",
  carto: "Carto",
  finance: "Finance",
};

export function AdminRolePill({ role }: { role: string | null }) {
  if (!role) return <span className="text-neutral-400">—</span>;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${
        ROLE_PILLS[role] ?? "bg-neutral-100 text-neutral-500"
      }`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export function TeamTab() {
  const { isSuperadmin, profile } = useAdminRole();
  const team = useAdminTeam();
  const invites = useAdminInvites();
  const pending = (invites.data ?? []).filter((invite) => invite.accepted_at === null);

  return (
    <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
      <section className="overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0">
        <div className="flex items-center border-b border-neutral-100 px-4 py-3">
          <h2 className="text-[13.5px] font-bold">Comptes admin</h2>
          <span className="ml-auto text-[11.5px] text-neutral-500">
            {team.data ? `${team.data.length} comptes` : "…"} · {pending.length} invitation
            {pending.length > 1 ? "s" : ""} en attente
          </span>
        </div>
        {team.isPending ? (
          <p className="px-4 py-8 text-center text-[12.5px] text-neutral-500">Chargement…</p>
        ) : team.isError ? (
          <p className="px-4 py-8 text-center text-[12.5px] font-semibold text-error">
            Lecture impossible. Vérifiez le réseau puis réessayez.
          </p>
        ) : (
          <TeamTable members={team.data} invites={pending} selfId={profile?.id ?? null} />
        )}
      </section>
      <InviteForm disabled={!isSuperadmin} />
    </div>
  );
}

interface TeamTableProps {
  members: TableRow<"profiles">[];
  invites: TableRow<"admin_invites">[];
  selfId: string | null;
}

function TeamTable({ members, invites, selfId }: TeamTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            {["Membre", "Rôle", "Statut", "Dernière activité"].map((header) => (
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
          {members.map((member) => (
            <MemberRow key={member.id} member={member} self={member.id === selfId} />
          ))}
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberRow({ member, self }: { member: TableRow<"profiles">; self: boolean }) {
  return (
    <tr className="border-t border-neutral-100">
      <td className="px-4 py-2.5">
        <MemberCell
          name={`${member.full_name ?? "—"}${self ? " (vous)" : ""}`}
          phone={member.phone}
        />
      </td>
      <td className="px-4 py-2.5">
        <AdminRolePill role={member.admin_role} />
      </td>
      <td className="px-4 py-2.5 text-[10.5px] font-bold text-success-dark">Actif</td>
      <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
        {formatRelative(member.last_seen_at)}
      </td>
    </tr>
  );
}

function InviteRow({ invite }: { invite: TableRow<"admin_invites"> }) {
  const expired = new Date(invite.expires_at).getTime() < Date.now();
  return (
    <tr className="border-t border-neutral-100">
      <td className="px-4 py-2.5">
        <MemberCell name="Invitation" phone={invite.phone} muted />
      </td>
      <td className="px-4 py-2.5">
        <AdminRolePill role={invite.admin_role} />
      </td>
      <td
        className={`px-4 py-2.5 text-[10.5px] font-bold ${
          expired ? "text-neutral-400" : "text-warning-dark"
        }`}
      >
        {expired ? "Invitation expirée" : "Invitation envoyée"}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
        {expired ? "expirée le" : "expire le"} {formatDate(invite.expires_at)}
      </td>
    </tr>
  );
}

function MemberCell({
  name,
  phone,
  muted,
}: {
  name: string;
  phone: string | null;
  muted?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold ${
          muted ? "bg-neutral-100 text-neutral-400" : "bg-brand-50 text-brand-800"
        }`}
      >
        {initials(name)}
      </span>
      <span>
        <span className="block text-[12.5px] font-bold text-neutral-900">{name}</span>
        <span className="block font-mono text-[11px] tabular-nums text-neutral-500">
          {phone ?? "—"}
        </span>
      </span>
    </span>
  );
}
