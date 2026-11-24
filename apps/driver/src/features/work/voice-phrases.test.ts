import { approachPhrase, offerPhrase, pickupPhrase, startedPhrase } from "./voice-phrases";

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
});
