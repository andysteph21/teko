"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAlphaInvites, setAlphaInvite } from "@teko/api-client";
import { type FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAdminProfile } from "../shell/use-admin-profile";
import { useSession } from "../shell/use-session";

function InvitationList() {
  const cache = useQueryClient();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"client" | "driver">("client");
  const query = useQuery({
    queryKey: ["alpha-invites"],
    queryFn: () => listAlphaInvites(supabase),
  });
  const update = useMutation({
    mutationFn: (input: { phone: string; role: "client" | "driver"; active: boolean }) =>
      setAlphaInvite(supabase, input),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["alpha-invites"] }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate({ phone, role, active: true });
  };
  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-0 p-4">
      <h2 className="font-bold">Invitations à l’alpha fermée</h2>
      <p className="my-2 text-sm">
        Le numéro doit être vérifié à la connexion. L’invitation n’envoie aucun SMS.
      </p>
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <label>
          Numéro international
          <input
            type="tel"
            required
            placeholder="+241…"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="ml-2 rounded border p-2"
          />
        </label>
        <label>
          Rôle
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
            className="ml-2 rounded border p-2"
          >
            <option value="client">Passager</option>
            <option value="driver">Chauffeur</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded bg-brand-600 px-3 text-neutral-0"
        >
          Inviter ce numéro
        </button>
      </form>
      {query.error || update.error ? (
        <p role="alert">Invitation non confirmée. Vérifiez le numéro et le réseau.</p>
      ) : null}
      {update.isSuccess ? <p role="status">Liste mise à jour par le serveur.</p> : null}
      <ul className="mt-3 divide-y divide-neutral-100">
        {query.data?.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
            <span>
              +{row.phone} · {row.role === "driver" ? "Chauffeur" : "Passager"} ·{" "}
              {row.is_active ? "Invité" : "Retiré"}
            </span>
            <button
              type="button"
              disabled={update.isPending}
              className="underline"
              onClick={() =>
                update.mutate({
                  phone: row.phone,
                  role: row.role as "client" | "driver",
                  active: !row.is_active,
                })
              }
            >
              {row.is_active ? "Retirer l’invitation" : "Réactiver l’invitation"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AlphaInvitations() {
  const { session } = useSession();
  const { adminRole } = useAdminProfile(session?.user.id);
  return adminRole === "ops" || adminRole === "superadmin" ? <InvitationList /> : null;
}
