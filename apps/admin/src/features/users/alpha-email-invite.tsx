"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setAlphaInviteEmail } from "@teko/api-client";
import { type FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

/** Invitation par e-mail vérifié (décision A4 du 23 novembre 2026) : la
 *  personne se connecte ensuite avec un code reçu à cette adresse. */
export function AlphaEmailInvite() {
  const cache = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"client" | "driver">("client");
  const invite = useMutation({
    mutationFn: () => setAlphaInviteEmail(supabase, { email, role, active: true }),
    onSuccess: () => {
      setEmail("");
      return cache.invalidateQueries({ queryKey: ["alpha-invites"] });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    invite.mutate();
  };
  return (
    <form onSubmit={submit} className="my-2 flex flex-wrap gap-2">
      <label>
        Adresse e-mail
        <input
          type="email"
          required
          placeholder="personne@exemple.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
        disabled={invite.isPending}
        className="rounded bg-brand-600 px-3 text-neutral-0"
      >
        Inviter cette adresse
      </button>
      {invite.error ? <p role="alert">Invitation non confirmée. Vérifiez l’adresse.</p> : null}
      {invite.isSuccess ? <p role="status">Adresse invitée.</p> : null}
    </form>
  );
}
