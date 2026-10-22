import { useMutation } from "@tanstack/react-query";
import { getRideQuote } from "@teko/api-client";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { supabase } from "../../lib/supabase";
import { type MeetingPick, useBookingStore } from "./store";
import type { RequestConfirmation } from "./use-request-ride";

/** Changer de départ ne commande jamais avant confirmation du nouveau devis. */
export function usePickupConfirmation(request: (value: RequestConfirmation) => void) {
  const draft = useBookingStore(
    useShallow((s) => ({
      origin: s.origin,
      destination: s.destination,
      category: s.category,
      quotes: s.quotes,
    })),
  );
  const [pending, setPending] = useState<RequestConfirmation | null>(null);
  const quote = useMutation({
    mutationFn: async (meeting: MeetingPick | null) => {
      if (!draft.origin || !draft.destination) throw new Error("Trajet incomplet");
      return {
        meeting,
        quote: await getRideQuote(supabase, {
          category: draft.category,
          origin: meeting?.position ?? draft.origin.position,
          destination: draft.destination.position,
        }),
      };
    },
    onSuccess: setPending,
  });
  const choose = (meeting: MeetingPick | null) => {
    const previous = draft.quotes[draft.category];
    const point = meeting?.position ?? draft.origin?.position;
    const unchanged =
      point?.lon === draft.origin?.position.lon && point?.lat === draft.origin?.position.lat;
    if (unchanged && previous && Date.parse(previous.expires_at) > Date.now()) {
      request({ quote: previous, meeting });
    } else {
      quote.mutate(meeting);
    }
  };
  return {
    pending,
    busy: quote.isPending,
    failed: quote.isError,
    previousPrice: Number(draft.quotes[draft.category]?.price ?? 0),
    choose,
    cancel: () => {
      setPending(null);
      quote.reset();
    },
    confirm: () => {
      if (!pending) return;
      if (Date.parse(pending.quote.expires_at) <= Date.now()) quote.mutate(pending.meeting);
      else request(pending);
    },
  };
}
