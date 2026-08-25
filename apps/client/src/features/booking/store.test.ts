import { isReadyToRequest, useBookingStore } from "./store";

const ORIGIN = { position: { lon: 9.45, lat: 0.4 }, label: "Ma position" };
const DEST = { position: { lon: 9.47, lat: 0.39 }, label: "Pharmacie du Gros-Bouquet" };
const ROUTE = { coordinates: [], distanceM: 3190, durationS: 318 };

beforeEach(() => useBookingStore.getState().reset());

describe("booking store (brouillon C-07→C-12)", () => {
  it("changer de destination invalide itinéraire, estimations et rencontre", () => {
    const s = useBookingStore.getState();
    s.setOrigin(ORIGIN);
    s.setDestination(DEST);
    s.setRouteAndEstimates(ROUTE, { eco: 1430 });
    s.setMeeting({ id: "lm1", name: "Marché", position: DEST.position });

    useBookingStore.getState().setDestination({ ...DEST, label: "Autre" });
    const after = useBookingStore.getState();
    expect(after.route).toBeNull();
    expect(after.estimates).toEqual({});
    expect(after.meeting).toBeNull();
  });

  it("l'indication libre s'attache à la destination existante", () => {
    useBookingStore.getState().setDestination(DEST);
    useBookingStore.getState().setDestinationHint("derrière le portail bleu");
    expect(useBookingStore.getState().destination?.hint).toBe("derrière le portail bleu");
  });

  it("sans destination, l'indication est ignorée (pas de crash)", () => {
    useBookingStore.getState().setDestinationHint("x");
    expect(useBookingStore.getState().destination).toBeNull();
  });

  it("isReadyToRequest exige origine + destination + itinéraire", () => {
    expect(isReadyToRequest({ origin: ORIGIN, destination: DEST, route: null })).toBe(false);
    expect(isReadyToRequest({ origin: ORIGIN, destination: DEST, route: ROUTE })).toBe(true);
  });

  it("reset ramène aux valeurs de départ (éco, espèces)", () => {
    const s = useBookingStore.getState();
    s.setCategory("confort");
    s.setPaymentMethod("airtel");
    s.reset();
    expect(useBookingStore.getState().category).toBe("eco");
    expect(useBookingStore.getState().paymentMethod).toBe("cash");
  });
});
