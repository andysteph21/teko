// Livraison côté coursier (lot R5) : colis et coordonnées du destinataire
// (lisibles une fois la course affectée), photo du colis remis (caméra →
// bucket privé delivery-proofs), puis code à 4 chiffres du destinataire.
// 5 essais de code puis blocage 5 minutes, décidés par le serveur.

import {
  completeDelivery,
  type DeliveryOutcome,
  getRideParcel,
  type RideParcel,
  TekoApiError,
  uploadDeliveryProof,
} from "@teko/api-client";
import type { RideRow } from "@teko/types";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";
import { supabase } from "../../lib/supabase";
import { isDelivery } from "./ride-kind";

/** Longueur du code de remise donné par le destinataire. */
export const DELIVERY_CODE_LENGTH = 4;

export interface DeliveryState {
  parcel: RideParcel | null;
  /** Chemin de la photo déposée, ou null tant qu'elle manque. */
  photoPath: string | null;
  photoBusy: boolean;
  busy: boolean;
  error: string | null;
  /** Horodatage (ms) de fin du blocage du code, ou null. */
  blockedUntil: number | null;
  takePhoto: () => void;
  submit: (code: string) => void;
  clearError: () => void;
}

function useParcel(ride: RideRow | null): RideParcel | null {
  const [parcel, setParcel] = useState<RideParcel | null>(null);
  const rideId = isDelivery(ride) ? ride?.id : undefined;
  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    getRideParcel(supabase, rideId)
      .then((row) => {
        if (!cancelled) setParcel(row);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [rideId]);
  return parcel;
}

/** Photo prise à l'instant (jamais la galerie) puis déposée ; null si abandon. */
async function captureProof(rideId: string): Promise<string | null | "denied"> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return "denied";
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 });
  const asset = result.canceled ? null : (result.assets[0] ?? null);
  if (!asset) return null;
  const response = await fetch(asset.uri);
  return uploadDeliveryProof(supabase, rideId, await response.arrayBuffer());
}

function errorKey(e: unknown, fallback: string): string {
  if (e instanceof TekoApiError && e.code === "network") return "erreurs.reseau";
  if (e instanceof TekoApiError && e.code === "delivery_proof_required")
    return "work:livraison.photoRequise";
  return fallback;
}

type Refusal = Extract<DeliveryOutcome, { ok: false }>;

function usePhotoProof(rideId: string | undefined, setError: (message: string | null) => void) {
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { t } = useTranslation();

  const takePhoto = useCallback(async () => {
    if (!rideId) return;
    setError(null);
    setPhotoBusy(true);
    try {
      const path = await captureProof(rideId);
      if (path === "denied") setError(t("work:livraison.cameraRefusee"));
      else if (path) setPhotoPath(path);
    } catch (e) {
      setError(t(errorKey(e, "work:livraison.photoErreur")));
    } finally {
      setPhotoBusy(false);
    }
  }, [rideId, setError, t]);

  return { photoPath, photoBusy, takePhoto, resetPhoto: () => setPhotoPath(null) };
}

export function useDelivery(ride: RideRow | null, applyRide: (row: RideRow) => void) {
  const parcel = useParcel(ride);
  const rideId = ride?.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const { photoPath, photoBusy, takePhoto, resetPhoto } = usePhotoProof(rideId, setError);
  const { t } = useTranslation();

  const refuse = (outcome: Refusal) => {
    if (outcome.error === "code_blocked") {
      // Le compte à rebours de l'écran porte le message de blocage.
      setBlockedUntil(Date.now() + outcome.retryAfterS * 1000);
      return;
    }
    setError(t("work:livraison.codeIncorrect", { count: outcome.attemptsRemaining }));
  };

  const submit = async (code: string) => {
    if (!rideId || !photoPath || code.length !== DELIVERY_CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      const outcome = await completeDelivery(supabase, { rideId, code, photoPath });
      if (!outcome.ok) return refuse(outcome);
      // OPPO conserve le clavier si le champ est déjà démonté au blur.
      Keyboard.dismiss();
      applyRide(outcome.ride);
    } catch (e) {
      // Photo absente ou refusée côté serveur : elle est à reprendre.
      if (e instanceof TekoApiError && e.code === "delivery_proof_required") resetPhoto();
      setError(t(errorKey(e, "erreurs.generique")));
    } finally {
      setBusy(false);
    }
  };

  const state: DeliveryState = {
    parcel,
    photoPath,
    photoBusy,
    busy,
    error,
    blockedUntil,
    takePhoto: () => void takePhoto(),
    submit: (code) => void submit(code),
    clearError: () => setError(null),
  };
  return state;
}
