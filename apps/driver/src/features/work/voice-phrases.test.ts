import {
  approachPhrase,
  deliveryPickupPhrase,
  deliveryStartedPhrase,
  offerPhrase,
  pickupPhrase,
  routeChangePhrase,
  startedPhrase,
} from "./voice-phrases";

describe("annonces vocales (option C)", () => {
  it("la proposition nomme le repère du passager et le gain net", () => {
    expect(
      offerPhrase({
        category: "confort",
        meetingLandmark: "Station-service de Glass",
        originLandmark: null,
        originHint: "côté pompes",
        netDriver: 7725,
      }),
    ).toBe(
      "Nouvelle course Confort. Rendez-vous : Station-service de Glass, côté pompes. Gain net : 7725 francs.",
    );
  });

  it("sans repère, l'indication du passager puis le point de rencontre servent de repli", () => {
    expect(pickupPhrase(null, "portail bleu")).toBe(
      "Course acceptée. Le passager vous attend : portail bleu.",
    );
    expect(approachPhrase(null, null)).toBe(
      "Vous approchez. Le passager attend : le point de rencontre.",
    );
  });

  it("le départ annonce la destination quand elle est connue", () => {
    expect(startedPhrase("Marché de Mont-Bouët", null)).toBe(
      "Course démarrée. Direction : Marché de Mont-Bouët.",
    );
    expect(startedPhrase(null, null)).toBe("Course démarrée.");
  });

  it("covoiturage : places demandées ; livraison : taille du colis, jamais le destinataire", () => {
    const base = {
      meetingLandmark: null,
      originLandmark: "Carrefour Rio",
      originHint: null,
      netDriver: 659,
    };
    expect(offerPhrase({ ...base, category: "covoiturage", seats: 2 })).toBe(
      "Nouveau covoiturage, 2 places. Rendez-vous : Carrefour Rio. Gain net : 659 francs.",
    );
    expect(offerPhrase({ ...base, category: "covoiturage" })).toMatch(
      /^Nouveau covoiturage, 1 place\./,
    );
    expect(
      offerPhrase({ ...base, category: "moto", serviceType: "delivery", parcelSize: "medium" }),
    ).toBe("Nouvelle livraison, colis moyen. Rendez-vous : Carrefour Rio. Gain net : 659 francs.");
    expect(offerPhrase({ ...base, category: "eco", serviceType: "delivery" })).toMatch(
      /^Nouvelle livraison\. /,
    );
  });

  it("modification de trajet : destination, arrêts et nouveau prix", () => {
    expect(
      routeChangePhrase({ destination: null, hint: "portail vert", stops: 2, newPrice: 1800 }),
    ).toBe(
      "Le passager demande une modification du trajet. Nouvelle destination : portail vert. Avec 2 arrêts. Nouveau prix : 1800 francs. Acceptez ou refusez.",
    );
    expect(routeChangePhrase({ destination: null, hint: null, stops: 1, newPrice: 1200 })).toBe(
      "Le passager demande une modification du trajet. Avec 1 arrêt. Nouveau prix : 1200 francs. Acceptez ou refusez.",
    );
  });

  it("livraison : expéditeur à la prise en charge, direction au départ", () => {
    expect(deliveryPickupPhrase("Station de Glass", null)).toBe(
      "Livraison acceptée. L'expéditeur vous attend : Station de Glass.",
    );
    expect(deliveryStartedPhrase(null, "immeuble bleu")).toBe(
      "Colis pris en charge. Direction : immeuble bleu.",
    );
    expect(deliveryStartedPhrase(null, null)).toBe("Colis pris en charge.");
  });
});
