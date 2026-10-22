"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyVehicles, updateReviewedVehicle } from "@teko/api-client";
import type { TableRow, VehicleCategory } from "@teko/types";
import { type FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

function VehicleForm({ vehicle }: { vehicle: TableRow<"vehicles"> }) {
  const cache = useQueryClient();
  const [plate, setPlate] = useState(vehicle.plate ?? "");
  const [category, setCategory] = useState(vehicle.category);
  const [reason, setReason] = useState("");
  const update = useMutation({
    mutationFn: () =>
      updateReviewedVehicle(supabase, { vehicleId: vehicle.id, category, plate, reason }),
    onSuccess: () =>
      Promise.all(
        ["kyc-vehicles", "kyc-driver", "kyc-documents", "kyc-queue", "admin-drivers-index"].map(
          (key) => cache.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate();
  };
  return (
    <form onSubmit={submit} className="grid gap-2 rounded border p-3 text-sm">
      <label>
        Plaque
        <input
          required
          minLength={2}
          maxLength={24}
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          className="ml-2 rounded border p-1"
        />
      </label>
      <label>
        Catégorie
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as VehicleCategory)}
          className="ml-2 rounded border p-1"
        >
          <option value="eco">Éco</option>
          <option value="moto">Moto</option>
          <option value="confort">Confort</option>
        </select>
      </label>
      <label>
        Motif du changement
        <textarea
          required
          minLength={3}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded border p-1"
        />
      </label>
      <p>
        La modification met le chauffeur hors ligne et impose une nouvelle revue des sept pièces et
        une vérification physique. Elle est refusée pendant une course.
      </p>
      <button
        type="submit"
        disabled={update.isPending}
        className="rounded bg-brand-600 p-2 text-neutral-0"
      >
        Modifier et rouvrir la vérification
      </button>
      {update.error ? (
        <p role="alert">
          Modification non confirmée. Vérifiez les champs, le réseau et l’absence de course active.
        </p>
      ) : null}
      {update.isSuccess ? (
        <p role="status">Véhicule corrigé ; chauffeur en attente de vérification.</p>
      ) : null}
    </form>
  );
}

export function VehicleReview({
  driverId,
  adminRole,
}: {
  driverId: string;
  adminRole: string | null;
}) {
  const allowed = adminRole === "ops" || adminRole === "superadmin";
  const query = useQuery({
    queryKey: ["kyc-vehicles", driverId],
    enabled: allowed,
    queryFn: () => listMyVehicles(supabase, driverId),
  });
  if (!allowed) return null;
  return (
    <section className="p-4">
      <h2 className="mb-2 font-bold">Véhicule vérifié</h2>
      {query.error ? <p role="alert">Lecture du véhicule impossible.</p> : null}
      {query.data?.map((vehicle) => (
        <VehicleForm key={vehicle.id} vehicle={vehicle} />
      ))}
      {query.data?.length === 0 ? <p>Aucun véhicule renseigné dans le dossier.</p> : null}
    </section>
  );
}
