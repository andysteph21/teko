// Flux d'offres D-10 — canal temps réel des notifications (type ride_offer)
// + repli listPendingOffers à chaque focus (offre arrivée pendant que l'app
// était couverte). L'offre chargée pilote le modal par-dessus D-09.
//
// TODO(doc 11) : livraison push FCM en arrière-plan (data message → réveil) ;
// tant qu'elle n'est pas branchée, une offre reçue app fermée n'est vue qu'au
// retour au premier plan via le repli ci-dessous.

import {
  listPendingOffers,
  type OfferDetails,
  offerDetails,
  respondOffer,
  subscribeNotifications,
  TekoApiError,
} from "@teko/api-client";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { useWorkStore } from "./store";

export interface OfferFeed {
  offer: OfferDetails | null;
  busy: boolean;
  accept: () => void;
  decline: () => void;
  /** Compte à rebours écoulé (modal) — fermeture douce + toast discret. */
  expire: () => void;
}

function isPending(details: OfferDetails): boolean {
  return details.status === "pending" && Date.parse(details.expiresAt) > Date.now();
}

function isOfferGone(e: unknown): boolean {
  return (
    e instanceof TekoApiError && (e.code === "offer_already_handled" || e.code === "offer_expired")
  );
}

export function useOfferFeed(userId: string | undefined, online: boolean): OfferFeed {
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const offerRef = useRef<OfferDetails | null>(null);
  offerRef.current = offer;
  const router = useRouter();
  const { t } = useTranslation();
  const showToast = useWorkStore((s) => s.showToast);

  const load = useCallback(async (offerId: string) => {
    try {
      const details = await offerDetails(supabase, offerId);
      if (isPending(details)) setOffer(details);
    } catch {
      // Offre déjà retombée (expirée, cascade au suivant) : rien à montrer.
    }
  }, []);

  useEffect(() => {
    if (!userId || !online) return;
    const unsubscribe = subscribeNotifications(supabase, userId, (n) => {
      const payload = n.payload as { offer_id?: string } | null;
      if (n.type === "ride_offer" && payload?.offer_id && !offerRef.current) {
        void load(payload.offer_id);
      }
    });
    return () => void unsubscribe();
  }, [userId, online, load]);

  useFocusEffect(
    useCallback(() => {
      if (!userId || !online) return;
      listPendingOffers(supabase)
        .then((rows) => {
          const fresh = rows.find((r) => Date.parse(r.expires_at) > Date.now());
          if (fresh && !offerRef.current) void load(fresh.id);
        })
        .catch(() => {
          // Repli silencieux — le canal temps réel reste la voie principale.
        });
    }, [userId, online, load]),
  );

  const accept = useCallback(async () => {
    const current = offerRef.current;
    if (!current) return;
    setBusy(true);
    try {
      const ride = await respondOffer(supabase, current.offerId, true);
      setOffer(null);
      if (ride) router.replace(`/(main)/ride/${ride.id}` as Href);
      else showToast(t("work:offre.attribueeAutre"));
    } catch (e) {
      setOffer(null);
      showToast(isOfferGone(e) ? t("work:offre.attribueeAutre") : t("erreurs.generique"));
    } finally {
      setBusy(false);
    }
  }, [router, showToast, t]);

  const decline = useCallback(() => {
    const current = offerRef.current;
    if (!current) return;
    setOffer(null);
    respondOffer(supabase, current.offerId, false).catch(() => {
      // Silence = refus côté backend de toute façon (cascade au suivant).
    });
  }, []);

  const expire = useCallback(() => {
    if (!offerRef.current) return;
    setOffer(null);
    showToast(t("work:offre.attribueeAutre"));
  }, [showToast, t]);

  return { offer, busy, accept: () => void accept(), decline, expire };
}
