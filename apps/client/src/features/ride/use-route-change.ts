// Modification du trajet en cours de course (R3) : brouillon (destination,
// 0 à 2 arrêts) → devis serveur → confirmation du passager → attente de la
// réponse du chauffeur (30 s). Le prix et les limites vivent côté serveur.

import {
  getRouteChangeQuote,
  latestRouteChange,
  type RouteChange,
  type RoutePlace,
  requestRouteChange,
} from "@teko/api-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { PlacePick } from "../booking/store";
import { routeChangeErrorKey } from "./route-change-errors";
import { useRouteChangeSignal } from "./route-change-signal";

export const MAX_STOPS = 2;
export const POLL_MS = 3_000;
/** Marge après l'échéance : le balayage serveur peut tarder de quelques secondes. */
export const EXPIRY_GRACE_MS = 6_000;
const DEFAULT_WINDOW_MS = 30_000;

export type RouteChangeOutcome = "accepted" | "refused" | "expired";
export type RouteChangePhase = "edit" | "quoted" | "pending" | RouteChangeOutcome;

const OUTCOMES: readonly string[] = ["accepted", "refused", "expired"];

function toRoutePlace(pick: PlacePick): RoutePlace {
  return { position: pick.position, landmarkId: pick.landmarkId, hint: pick.hint ?? pick.label };
}

/** Durée accordée au chauffeur, lue sur la demande (30 s côté serveur). */
export function responseWindowMs(change: RouteChange): number {
  const start = Date.parse(change.requested_at ?? "");
  const end = Date.parse(change.respond_by ?? "");
  const window = end - start;
  return Number.isFinite(window) && window > 0 ? window : DEFAULT_WINDOW_MS;
}

/** Suit la demande en attente : compte à rebours local et relecture toutes les 3 s. */
function usePendingWatch(
  rideId: string,
  pending: RouteChange | null,
  onOutcome: (outcome: RouteChangeOutcome) => void,
) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const outcomeRef = useRef(onOutcome);
  outcomeRef.current = onOutcome;

  useEffect(() => {
    if (!pending) return;
    // Échéance ancrée sur l'horloge locale : pas de dérive avec le serveur.
    const deadline = Date.now() + responseWindowMs(pending);
    let done = false;
    const finish = (outcome: RouteChangeOutcome) => {
      if (done) return;
      done = true;
      outcomeRef.current(outcome);
    };
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)));
    tick();
    const clock = setInterval(tick, 1_000);
    const poll = setInterval(async () => {
      try {
        const latest = await latestRouteChange(supabase, rideId);
        if (latest?.id === pending.id && OUTCOMES.includes(latest.status)) {
          finish(latest.status as RouteChangeOutcome);
          return;
        }
      } catch {
        // Réseau instable : la prochaine relecture tranchera.
      }
      if (Date.now() > deadline + EXPIRY_GRACE_MS) finish("expired");
    }, POLL_MS);
    return () => {
      done = true;
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [rideId, pending]);

  return secondsLeft;
}

interface Draft {
  destination: PlacePick | null;
  stops: PlacePick[];
}

/** Brouillon local : destination et arrêts, bornés à MAX_STOPS. */
function useDraft(initialDestination: PlacePick | null) {
  const [draft, setDraft] = useState<Draft>({ destination: initialDestination, stops: [] });
  const setDestination = useCallback(
    (destination: PlacePick) => setDraft((d) => ({ ...d, destination })),
    [],
  );
  const addStop = useCallback(
    (stop: PlacePick) =>
      setDraft((d) => (d.stops.length >= MAX_STOPS ? d : { ...d, stops: [...d.stops, stop] })),
    [],
  );
  const removeStop = useCallback(
    (index: number) => setDraft((d) => ({ ...d, stops: d.stops.filter((_, i) => i !== index) })),
    [],
  );
  return { draft, setDestination, addStop, removeStop };
}

export interface RouteChangeController extends Draft {
  phase: RouteChangePhase;
  quote: RouteChange | null;
  busy: boolean;
  /** Clé i18n du dernier refus serveur, prête pour `t()`. */
  errorKey: string | null;
  secondsLeft: number;
  canAddStop: boolean;
  setDestination: (place: PlacePick) => void;
  addStop: (place: PlacePick) => void;
  removeStop: (index: number) => void;
  requestQuote: () => Promise<void>;
  confirm: () => Promise<void>;
  /** Retour au brouillon (corriger, ou proposer un autre trajet). */
  edit: () => void;
}

export function useRouteChange(
  rideId: string,
  initialDestination: PlacePick | null,
): RouteChangeController {
  const { draft, setDestination, addStop, removeStop } = useDraft(initialDestination);
  const [phase, setPhase] = useState<RouteChangePhase>("edit");
  const [quote, setQuote] = useState<RouteChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const bump = useRouteChangeSignal((s) => s.bump);

  const run = async (task: () => Promise<RouteChange>, next: RouteChangePhase) => {
    setBusy(true);
    setErrorKey(null);
    try {
      setQuote(await task());
      setPhase(next);
    } catch (error) {
      setErrorKey(routeChangeErrorKey(error));
    } finally {
      setBusy(false);
    }
  };

  const requestQuote = async () => {
    const { destination, stops } = draft;
    if (!destination) {
      setErrorKey("ride:modification.erreurs.destination_requise");
      return;
    }
    await run(
      () =>
        getRouteChangeQuote(supabase, {
          rideId,
          destination: toRoutePlace(destination),
          stops: stops.map(toRoutePlace),
        }),
      "quoted",
    );
  };

  const confirm = async () => {
    if (!quote) return;
    await run(() => requestRouteChange(supabase, quote.id), "pending");
  };

  const onOutcome = useCallback(
    (outcome: RouteChangeOutcome) => {
      setPhase(outcome);
      if (outcome === "accepted") bump();
    },
    [bump],
  );
  const secondsLeft = usePendingWatch(rideId, phase === "pending" ? quote : null, onOutcome);

  return {
    ...draft,
    phase,
    quote,
    busy,
    errorKey,
    secondsLeft,
    canAddStop: draft.stops.length < MAX_STOPS,
    setDestination,
    addStop,
    removeStop,
    requestQuote,
    confirm,
    edit: () => {
      setErrorKey(null);
      setPhase("edit");
    },
  };
}
