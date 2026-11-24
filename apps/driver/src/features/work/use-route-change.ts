// Demande de modification de trajet côté chauffeur (lot R3) : lecture de la
// dernière modification toutes les 3 s pendant la course (et dès le push
// `route_change_request`), réponse par respond_route_change. Après accord,
// l'écran relit la course : destination, prix et arrêts font foi côté serveur.

import {
  acceptedRouteChange,
  landmarkNames,
  latestRouteChange,
  type RouteChange,
  respondRouteChange,
  routeChangeRoute,
  TekoApiError,
} from "@teko/api-client";
import type { LonLat } from "@teko/maps";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState } from "react-native";
import { onPushRouteChange } from "../../lib/push-events";
import { supabase } from "../../lib/supabase";
import { isPendingChange, ROUTE_CHANGE_POLL_MS, sameChange } from "./route-change";
import { useWorkStore } from "./store";

export interface RouteChangeState {
  /** Demande en attente de réponse, ou null. */
  pending: RouteChange | null;
  /** Nom du repère de la nouvelle destination, quand il existe. */
  destinationName: string | null;
  /** Tracé de la dernière modification acceptée, ou null. */
  route: LonLat[] | null;
  busy: boolean;
  accept: () => void;
  refuse: () => void;
  /** Compte à rebours écoulé : la fenêtre se ferme, la course continue. */
  expire: () => void;
}

function useLatestChange(rideId: string | undefined, enabled: boolean) {
  const [latest, setLatest] = useState<RouteChange | null>(null);

  const refresh = useCallback(async () => {
    if (!rideId) return;
    try {
      const row = await latestRouteChange(supabase, rideId);
      setLatest((previous) => (sameChange(previous, row) ? previous : row));
    } catch {
      // Réseau : la lecture suivante rattrape, la course n'est pas bloquée.
    }
  }, [rideId]);

  useEffect(() => {
    if (!rideId || !enabled) return;
    void refresh();
    const poll = setInterval(() => {
      if (AppState.currentState !== "background") void refresh();
    }, ROUTE_CHANGE_POLL_MS);
    const push = onPushRouteChange((id) => {
      if (id === rideId) void refresh();
    });
    return () => {
      clearInterval(poll);
      push();
    };
  }, [rideId, enabled, refresh]);

  return { latest, setLatest };
}

function useLandmarkName(landmarkId: string | null | undefined): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    setName(null);
    if (!landmarkId) return;
    let cancelled = false;
    landmarkNames(supabase, [landmarkId])
      .then((names) => {
        if (!cancelled) setName(names[landmarkId] ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [landmarkId]);
  return name;
}

/** Tracé joint au devis ; illisible → le tracé habituel de la course reste. */
function acceptedRoute(change: RouteChange | null): LonLat[] | null {
  if (!change) return null;
  try {
    const coordinates = routeChangeRoute(change).coordinates;
    return coordinates.length >= 2 ? coordinates : null;
  } catch {
    return null;
  }
}

/** Issue annoncée d'après le statut rendu par le serveur. */
const OUTCOME_TOAST: Record<string, string> = { accepted: "acceptee", refused: "refusee" };

function isSettled(error: unknown): boolean {
  return (
    error instanceof TekoApiError &&
    (error.code === "route_change_handled" || error.code === "route_not_editable")
  );
}

interface Answer {
  /** Ligne rendue par le serveur, ou null si l'appel a échoué. */
  row: RouteChange | null;
  /** La fenêtre se ferme (réponse reçue, refus, ou demande déjà close). */
  close: boolean;
  toast: string | null;
}

/** Refus : le silence vaut refus côté serveur. Accord sur panne réseau : la
 *  fenêtre reste ouverte, le chauffeur peut réessayer avant l'échéance. */
async function sendAnswer(change: RouteChange, accept: boolean): Promise<Answer> {
  try {
    const row = await respondRouteChange(supabase, change.id, accept);
    return { row, close: true, toast: `work:modif.${OUTCOME_TOAST[row.status] ?? "expiree"}` };
  } catch (e) {
    if (!accept) return { row: null, close: true, toast: null };
    return isSettled(e)
      ? { row: null, close: true, toast: "work:modif.dejaTraitee" }
      : { row: null, close: false, toast: "erreurs.generique" };
  }
}

export function useRouteChange(
  rideId: string | undefined,
  enabled: boolean,
  onAccepted: () => void,
): RouteChangeState {
  const { latest, setLatest } = useLatestChange(rideId, enabled);
  const [handledId, setHandledId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<RouteChange | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useTranslation();
  const showToast = useWorkStore((s) => s.showToast);

  const pending = latest && latest.id !== handledId && isPendingChange(latest) ? latest : null;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    if (latest?.status === "accepted") setAccepted(latest);
  }, [latest]);

  // Au retour sur l'écran, le tracé en vigueur est celui de la dernière
  // modification acceptée, même si une demande plus récente a échoué.
  useEffect(() => {
    if (!rideId || !enabled) return;
    let alive = true;
    Promise.resolve()
      .then(() => acceptedRouteChange(supabase, rideId))
      .then((row) => {
        if (alive && row) setAccepted((current) => current ?? row);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [rideId, enabled]);

  const respond = useCallback(
    async (accept: boolean) => {
      const change = pendingRef.current;
      if (!change) return;
      if (!accept) setHandledId(change.id);
      setBusy(true);
      const answer = await sendAnswer(change, accept);
      if (answer.close) setHandledId(change.id);
      if (answer.row) setLatest(answer.row);
      if (answer.row?.status === "accepted") onAccepted();
      if (answer.toast) showToast(t(answer.toast));
      setBusy(false);
    },
    [onAccepted, setLatest, showToast, t],
  );

  const expire = useCallback(() => {
    const change = pendingRef.current;
    if (!change) return;
    setHandledId(change.id);
    showToast(t("work:modif.expiree"));
  }, [showToast, t]);

  return {
    pending,
    destinationName: useLandmarkName(pending?.dest_landmark_id),
    route: useMemo(() => acceptedRoute(accepted), [accepted]),
    busy,
    accept: () => void respond(true),
    refuse: () => void respond(false),
    expire,
  };
}
