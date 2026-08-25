"use client";

// A-03 (panneau dossier) / AM-03 — dossier KYC d'un chauffeur : identité,
// pièces avec revue unitaire, décision globale. Retour à la file après décision.

import type { ProfileRow, TableRow } from "@teko/types";
import Link from "next/link";
import { PageHeader } from "../shell/page-header";
import { useAdminProfile } from "../shell/use-admin-profile";
import { useSession } from "../shell/use-session";
import { DecisionBar } from "./decision-bar";
import { DocumentCard } from "./document-card";
import { type DocumentRow, initials, relativeFr } from "./kyc-labels";
import { MetaCards } from "./meta-cards";
import { useDriverDocuments, useKycDriver } from "./use-kyc-queries";

function FileHead({ driver, profile }: { driver: TableRow<"drivers">; profile: ProfileRow }) {
  return (
    <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3.5 lg:px-5">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-driver-accent-light text-[15px] font-extrabold text-driver-accent-dark">
        {initials(profile.full_name)}
      </span>
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-neutral-900">
          {profile.full_name ?? "Chauffeur sans nom"}
        </h2>
        <p className="truncate text-xs text-neutral-500">
          <span className="font-mono tabular-nums">{profile.phone}</span> · déposé{" "}
          {relativeFr(driver.created_at)}
        </p>
      </div>
    </div>
  );
}

function DocList({ docs, driverId }: { docs: DocumentRow[]; driverId: string }) {
  if (docs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-400">
        Aucune pièce déposée pour l'instant.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {docs.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} driverId={driverId} />
      ))}
    </div>
  );
}

function FileState({ text, error }: { text: string; error?: boolean }) {
  return (
    <p className={`py-12 text-center text-sm ${error ? "text-error" : "text-neutral-400"}`}>
      {text}
    </p>
  );
}

export function KycFile({ driverId }: { driverId: string }) {
  const { session } = useSession();
  const { adminRole } = useAdminProfile(session?.user.id);
  const file = useKycDriver(driverId);
  const documents = useDriverDocuments(driverId);
  const driver = file.data?.driver;
  const profile = file.data?.profile;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Dossier KYC">
        <Link
          href="/kyc"
          data-testid="kyc-back"
          className="text-xs font-semibold text-brand-700 hover:underline"
        >
          ← File d'attente
        </Link>
      </PageHeader>
      {file.isError || documents.isError ? (
        <FileState error text="Une erreur est survenue. Réessayez." />
      ) : !driver || !profile || !documents.data ? (
        <FileState
          text={file.isPending || documents.isPending ? "Chargement…" : "Dossier introuvable."}
        />
      ) : (
        <>
          <FileHead driver={driver} profile={profile} />
          <div className="flex flex-1 flex-col gap-3.5 p-4 lg:flex-row lg:px-5">
            <div className="order-2 lg:order-1 lg:flex-[1.3]">
              <DocList docs={documents.data} driverId={driverId} />
            </div>
            <div className="order-1 lg:order-2 lg:flex-1">
              <MetaCards driver={driver} />
            </div>
          </div>
          {driver.kyc_status === "validated" ? (
            <p className="border-t border-neutral-100 px-4 py-3 text-xs text-success-dark lg:px-5">
              Dossier validé — chauffeur actif. La désactivation se gère dans Utilisateurs.
            </p>
          ) : (
            <DecisionBar driverId={driverId} docs={documents.data} adminRole={adminRole} />
          )}
        </>
      )}
    </div>
  );
}
