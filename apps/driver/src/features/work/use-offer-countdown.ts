// Compte à rebours de l'offre D-10 (tic 250 ms depuis expires_at, source
// serveur) + fenêtre de grâce à l'échéance : le modal reste monté
// OFFER_EXPIRE_GRACE_MS boutons désarmés avant d'appeler onExpire. Démonté
// net, un tap engagé pendant la disparition atterrissait sur la barre
// d'onglets que la rangée d'actions recouvre (signalement OPPO A15 du
// 1ᵉʳ sept. 2026 — doc 10 §8, Q1). Si « Accepter » est déjà parti (busy),
// l'issue revient à la réponse du serveur, jamais au chrono local.

import { useEffect, useRef, useState } from "react";

export const OFFER_EXPIRE_GRACE_MS = 600;
const TICK_MS = 250;

export function offerRemainingMs(expiresAt: string): number {
  return Math.max(0, Date.parse(expiresAt) - Date.now());
}

export interface OfferCountdown {
  seconds: number;
  /** Échéance atteinte : actions désarmées, onExpire suivra après la grâce. */
  expired: boolean;
}

export function useOfferCountdown(
  expiresAt: string,
  busy: boolean,
  onExpire: () => void,
): OfferCountdown {
  const [seconds, setSeconds] = useState(() => Math.ceil(offerRemainingMs(expiresAt) / 1000));
  const [expired, setExpired] = useState(() => offerRemainingMs(expiresAt) <= 0);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    setExpired(offerRemainingMs(expiresAt) <= 0);
    const timer = setInterval(() => {
      const ms = offerRemainingMs(expiresAt);
      setSeconds(Math.ceil(ms / 1000));
      if (ms <= 0) {
        clearInterval(timer);
        setExpired(true);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (!expired || busy) return;
    const grace = setTimeout(() => expireRef.current(), OFFER_EXPIRE_GRACE_MS);
    return () => clearTimeout(grace);
  }, [expired, busy]);

  return { seconds, expired };
}
