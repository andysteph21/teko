// Brouillon de commande (parcours C, C-07→C-12) — état CLIENT pur (doc 10
// §4) : la vérité des prix et de la course vit côté backend. Plusieurs
// petits stores, sélecteurs via useShallow dans les écrans.

import { quoteRoute, type RideQuote } from "@teko/api-client";
import type { LonLat, RouteResult } from "@teko/maps";
import type { PaymentMethod, VehicleCategory } from "@teko/types";
import { create } from "zustand";

/** Lieu choisi : le PIN transmis est la position ; le repère et l'indication
 *  libre (« derrière le portail bleu ») voyagent jusqu'au chauffeur. */
export interface PlacePick {
  position: LonLat;
  label: string;
  landmarkId?: string;
  source?: "gps";
  hint?: string;
}

export interface MeetingPick {
  id: string;
  name: string;
  position: LonLat;
}

/** Type de service du brouillon : course (défaut) ou livraison de colis. */
export type BookingService = "ride" | "delivery";

export interface BookingState {
  /** Livraison (R5) : même brouillon départ/arrivée, parcours colis ensuite. */
  service: BookingService;
  /** Covoiturage (R4) : 1 à 3 places, le prix total vient du serveur. */
  seats: number;
  /** Prix ferme de la livraison commandée, relu par l'écran de recherche. */
  deliveryPrice: number | null;
  origin: PlacePick | null;
  destination: PlacePick | null;
  category: VehicleCategory;
  paymentMethod: PaymentMethod;
  /** Course planifiée (C-18) — ISO, null = immédiate. */
  scheduledAt: string | null;
  route: RouteResult | null;
  estimates: Partial<Record<VehicleCategory, number>>;
  quotes: Partial<Record<VehicleCategory, RideQuote>>;
  meeting: MeetingPick | null;

  setService: (service: BookingService) => void;
  setSeats: (seats: number) => void;
  setDeliveryPrice: (price: number | null) => void;
  setOrigin: (origin: PlacePick | null) => void;
  setDestination: (destination: PlacePick | null) => void;
  setDestinationHint: (hint: string) => void;
  setCategory: (category: VehicleCategory) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setScheduledAt: (iso: string | null) => void;
  setRouteAndEstimates: (
    route: RouteResult,
    estimates: Partial<Record<VehicleCategory, number>>,
  ) => void;
  setMeeting: (meeting: MeetingPick | null) => void;
  setQuotes: (quotes: Partial<Record<VehicleCategory, RideQuote>>) => void;
  reset: () => void;
}

export const MAX_SEATS = 3;

const INITIAL = {
  service: "ride" as BookingService,
  seats: 1,
  deliveryPrice: null,
  origin: null,
  destination: null,
  category: "eco" as VehicleCategory,
  paymentMethod: "cash" as PaymentMethod,
  scheduledAt: null,
  route: null,
  estimates: {},
  quotes: {},
  meeting: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...INITIAL,
  setService: (service) => set({ service }),
  setSeats: (seats) => set({ seats: Math.min(MAX_SEATS, Math.max(1, Math.round(seats))) }),
  setDeliveryPrice: (deliveryPrice) => set({ deliveryPrice }),
  setOrigin: (origin) => set({ origin, route: null, estimates: {}, quotes: {}, meeting: null }),
  setDestination: (destination) =>
    set({ destination, route: null, estimates: {}, quotes: {}, meeting: null }),
  setDestinationHint: (hint) =>
    set((s) => (s.destination ? { destination: { ...s.destination, hint } } : {})),
  setCategory: (category) =>
    set((s) => ({
      category,
      ...(s.quotes[category] ? { route: quoteRoute(s.quotes[category]) } : {}),
    })),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setScheduledAt: (scheduledAt) => set({ scheduledAt }),
  setRouteAndEstimates: (route, estimates) => set({ route, estimates }),
  setMeeting: (meeting) => set({ meeting }),
  setQuotes: (quotes) => set({ quotes }),
  reset: () => set(INITIAL),
}));

/** Écran qui suit le choix de la destination, selon le service du brouillon. */
export function quoteScreenFor(service: BookingService): "/(main)/delivery" | "/(main)/category" {
  return service === "delivery" ? "/(main)/delivery" : "/(main)/category";
}

/** Le brouillon est-il prêt à être commandé (C-11 → request_ride) ? */
export function isReadyToRequest(
  s: Pick<BookingState, "origin" | "destination" | "route">,
): boolean {
  return Boolean(s.origin && s.destination && s.route);
}
