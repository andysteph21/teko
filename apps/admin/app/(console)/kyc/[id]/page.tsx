"use client";

// A-03 (panneau) / AM-03 — dossier KYC d'un chauffeur.

import { useParams } from "next/navigation";
import { KycFile } from "../../../../src/features/kyc/kyc-file";

export default function KycFilePage() {
  const params = useParams<{ id: string }>();
  return <KycFile driverId={params.id} />;
}
