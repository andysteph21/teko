"use client";

// Formulaire d'invitation (A-08, panneau droit) — téléphone +241 + rôle,
// RPC invite_admin. Superadmin uniquement (garde réelle en base).

import { TekoApiError } from "@teko/api-client";
import type { DbEnum } from "@teko/types";
import { type FormEvent, useState } from "react";
import { useInviteAdmin } from "./use-settings";

const ROLE_OPTIONS: { id: DbEnum<"admin_role">; label: string; hint: string }[] = [
  { id: "ops", label: "Ops", hint: "KYC, utilisateurs, litiges" },
  { id: "carto", label: "Carto", hint: "Repères, routes, zones" },
  { id: "finance", label: "Finance", hint: "Soldes, règlements, réconciliation" },
  { id: "superadmin", label: "Superadmin", hint: "Tout + paramètres et équipe" },
];

function inviteErrorMessage(caught: unknown): string {
  if (caught instanceof TekoApiError) {
    if (caught.code === "superadmin_only" || caught.code === "not_authorized") {
      return "Réservé au superadmin.";
    }
    if (caught.code === "network") return "Connexion impossible. Vérifiez le réseau.";
  }
  return "Invitation refusée. Vérifiez le numéro puis réessayez.";
}

export function InviteForm({ disabled }: { disabled: boolean }) {
  const [national, setNational] = useState("");
  const [role, setRole] = useState<DbEnum<"admin_role">>("ops");
  const [sent, setSent] = useState(false);
  const mutation = useInviteAdmin();
  const digits = national.replace(/\s+/g, "");
  const valid = /^\d{8,9}$/.test(digits);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSent(false);
    mutation.mutate(
      { phone: `+241${digits}`, role },
      {
        onSuccess: () => {
          setSent(true);
          setNational("");
        },
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="flex h-fit flex-col gap-3 rounded-[14px] border border-neutral-200 bg-neutral-0 p-4"
    >
      <h2 className="text-[13.5px] font-bold">Inviter un membre</h2>
      <PhoneField national={national} onChange={setNational} disabled={disabled} />
      <RolePicker role={role} onChange={setRole} disabled={disabled} />
      <button
        type="submit"
        data-testid="invite-submit"
        disabled={disabled || !valid || mutation.isPending}
        className="h-[42px] rounded-[16px] bg-gradient-to-br from-brand-700 to-client-accent text-[13px] font-bold text-neutral-0 shadow-lg shadow-brand-700/35 disabled:opacity-50"
      >
        Envoyer l'invitation
      </button>
      {disabled ? (
        <p className="text-xs font-semibold text-neutral-500">Réservé au superadmin</p>
      ) : null}
      {sent ? <p className="text-xs font-semibold text-success-dark">Invitation envoyée.</p> : null}
      {mutation.isError ? (
        <p className="text-xs font-semibold text-error">{inviteErrorMessage(mutation.error)}</p>
      ) : null}
      <p className="rounded-[10px] bg-neutral-100 p-3 text-[11px] leading-relaxed text-neutral-500">
        <strong className="text-neutral-700">Gardes en base :</strong> première connexion par OTP
        sur ce numéro — aucun droit avant vérification. Seul un superadmin attribue ou retire un
        rôle ; personne ne peut élever son propre rôle, et le dernier superadmin ne peut être ni
        rétrogradé ni désactivé.
      </p>
    </form>
  );
}

interface PhoneFieldProps {
  national: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

function PhoneField({ national, onChange, disabled }: PhoneFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold" htmlFor="invite-phone">
        Numéro de téléphone
      </label>
      <div className="flex h-[42px] items-center gap-2 rounded-[10px] bg-neutral-100 px-3 text-sm">
        <span className="border-r border-neutral-300 pr-2 text-[13px] font-semibold">🇬🇦 +241</span>
        <input
          id="invite-phone"
          data-testid="invite-phone"
          className="w-full bg-transparent outline-none"
          inputMode="tel"
          placeholder="0X XX XX XX"
          disabled={disabled}
          value={national}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

interface RolePickerProps {
  role: DbEnum<"admin_role">;
  onChange: (role: DbEnum<"admin_role">) => void;
  disabled: boolean;
}

function RolePicker({ role, onChange, disabled }: RolePickerProps) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-semibold">Rôle</legend>
      <div className="flex flex-col gap-1.5">
        {ROLE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2 ${
              role === option.id ? "border-client-accent bg-brand-50/40" : "border-neutral-200"
            } ${disabled ? "opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="invite-role"
              data-testid={`invite-role-${option.id}`}
              className="accent-client-accent"
              checked={role === option.id}
              disabled={disabled}
              onChange={() => onChange(option.id)}
            />
            <span>
              <span className="block text-[12.5px] font-bold">{option.label}</span>
              <span className="block text-[10.5px] text-neutral-500">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
