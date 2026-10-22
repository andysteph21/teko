"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordPhysicalVerification } from "@teko/api-client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export function PhysicalVerification({
  driverId,
  verifiedAt,
  adminRole,
}: {
  driverId: string;
  verifiedAt: string | null;
  adminRole: string | null;
}) {
  const [note, setNote] = useState("");
  const cache = useQueryClient();
  const action = useMutation({
    mutationFn: () => recordPhysicalVerification(supabase, driverId, note.trim()),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["kyc-driver", driverId] }),
  });
  if (verifiedAt)
    return (
      <p className="p-4 text-sm text-success-dark">
        Vérification physique enregistrée le {new Date(verifiedAt).toLocaleDateString("fr-FR")}.
      </p>
    );
  if (adminRole !== "ops" && adminRole !== "superadmin") return null;
  return (
    <section className="m-4 flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 text-sm">
      <h2 className="font-bold">Vérification physique obligatoire</h2>
      <label className="flex flex-col gap-1">
        Compte rendu de la rencontre
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          className="rounded-lg border border-neutral-200 p-2"
        />
      </label>
      <button
        type="button"
        disabled={action.isPending || note.trim().length < 3}
        onClick={() => action.mutate()}
        className="rounded-lg bg-brand-600 p-2 font-bold text-neutral-0 disabled:opacity-50"
      >
        Attester la vérification physique effectuée
      </button>
      {action.isError ? (
        <p role="alert">La vérification n’a pas été enregistrée. Réessayez.</p>
      ) : null}
    </section>
  );
}
