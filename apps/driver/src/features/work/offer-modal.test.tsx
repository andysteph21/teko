// Modal D-10 — comportement issu du signalement tap-through (doc 10 §8,
// Q1) : actions vivantes avant l'échéance, désarmées pendant la grâce,
// fermeture différée, et marge basse qui réserve insets.bottom
// (edge-to-edge : la rangée d'actions recouvre HomeTabs).

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("@teko/maps", () => ({ fetchRoute: jest.fn() }));
jest.mock("./use-device-position", () => ({
  fetchDevicePosition: jest.fn(async () => null),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

import type { OfferDetails } from "@teko/api-client";
import { OfferModal } from "./offer-modal";
import { OFFER_EXPIRE_GRACE_MS } from "./use-offer-countdown";

const NOW = new Date("2026-09-01T12:00:00Z");

const OFFER = {
  offerId: "off-1",
  status: "pending",
  category: "eco",
  origin: { lon: 9.45, lat: 0.4 },
  originLandmark: "Marché du Mont-Bouët",
  originHint: "portail bleu",
  meetingLandmark: null,
  distanceEstM: 3200,
  durationEstS: 720,
  priceEst: 1200,
  commission: 180,
  netDriver: 1020,
  paymentMethod: "cash",
} as OfferDetails;

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

function mountOffer(ttlMs: number) {
  const handlers = { onAccept: jest.fn(), onDecline: jest.fn(), onExpire: jest.fn() };
  const offer = { ...OFFER, expiresAt: new Date(NOW.getTime() + ttlMs).toISOString() };
  render(<OfferModal offer={offer} busy={false} {...handlers} />);
  return handlers;
}

describe("OfferModal", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("avant l'échéance : Accepter et Refuser répondent", () => {
    const { onAccept, onDecline } = mountOffer(12_000);

    fireEvent.press(screen.getByTestId("offer-accept"));
    expect(onAccept).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId("offer-refuse"));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("à l'échéance : actions désarmées, fermeture différée de la grâce", () => {
    const { onAccept, onDecline, onExpire } = mountOffer(2000);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("offer-timer")).toHaveTextContent("0 s");
    fireEvent.press(screen.getByTestId("offer-accept"));
    fireEvent.press(screen.getByTestId("offer-refuse"));
    expect(onAccept).not.toHaveBeenCalled();
    expect(onDecline).not.toHaveBeenCalled();
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(OFFER_EXPIRE_GRACE_MS);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("réserve l'inset bas : marge du panneau = 18 + insets.bottom", () => {
    mountOffer(12_000);

    expect(screen.getByTestId("offer-sheet")).toHaveStyle({ marginBottom: 52 });
  });
});

describe("alerte en appli (chantier du 17 novembre 2026)", () => {
  it("vibre en boucle tant que la proposition attend, puis s'arrête", () => {
    const { Vibration } = require("react-native");
    const vibrate = jest.spyOn(Vibration, "vibrate").mockImplementation(() => undefined);
    const cancel = jest.spyOn(Vibration, "cancel").mockImplementation(() => undefined);
    const view = render(
      <OfferModal
        offer={{ ...OFFER, expiresAt: new Date(Date.now() + 30_000).toISOString() }}
        busy={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onExpire={jest.fn()}
      />,
    );
    expect(vibrate).toHaveBeenCalledWith([0, 700, 350, 700, 350, 700, 1200], true);
    view.unmount();
    expect(cancel).toHaveBeenCalled();
    vibrate.mockRestore();
    cancel.mockRestore();
  });
});

describe("annonce vocale de la proposition (option C)", () => {
  it("lit la proposition une fois, puis se tait au démontage", async () => {
    const Speech = require("expo-speech");
    jest.mocked(Speech.speak).mockClear();
    const view = render(
      <OfferModal
        offer={{ ...OFFER, expiresAt: new Date(Date.now() + 30_000).toISOString() }}
        busy={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onExpire={jest.fn()}
      />,
    );
    await waitFor(() => expect(Speech.speak).toHaveBeenCalledTimes(1));
    expect(jest.mocked(Speech.speak).mock.calls[0]?.[0]).toMatch(/^Nouvelle course/);
    view.unmount();
    expect(Speech.stop).toHaveBeenCalled();
  });
});

describe("nature de la proposition (lots R4 et R5)", () => {
  const mountKind = (patch: Partial<OfferDetails>) =>
    render(
      <OfferModal
        offer={{ ...OFFER, expiresAt: new Date(Date.now() + 30_000).toISOString(), ...patch }}
        busy={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onExpire={jest.fn()}
      />,
    );

  it("course classique : aucune étiquette de service", () => {
    mountKind({ seats: 1, sharedSeatsTaken: null, serviceType: "ride", parcelSize: null });
    expect(screen.queryByTestId("offer-service")).toBeNull();
    expect(screen.getByText("Accepter la course")).toBeOnTheScreen();
  });

  it("covoiturage : places demandées, sans places prises hors trajet en cours", () => {
    mountKind({ category: "covoiturage", seats: 2, sharedSeatsTaken: 0, serviceType: "ride" });
    const service = screen.getByTestId("offer-service");
    expect(service).toHaveTextContent(/Covoiturage/);
    expect(service).toHaveTextContent(/2 places demandées/);
    expect(service).not.toHaveTextContent(/déjà prise/);
  });

  it("covoiturage pendant un trajet : places déjà prises", () => {
    mountKind({ category: "covoiturage", seats: 1, sharedSeatsTaken: 1, serviceType: "ride" });
    expect(screen.getByTestId("offer-service")).toHaveTextContent(/1 place déjà prise sur 3/);
  });

  it("livraison : libellé, taille du colis et bouton dédiés", () => {
    mountKind({ category: "moto", serviceType: "delivery", parcelSize: "large", seats: 1 });
    expect(screen.getByText("Nouvelle livraison · Moto")).toBeOnTheScreen();
    const service = screen.getByTestId("offer-service");
    expect(service).toHaveTextContent(/Livraison/);
    expect(service).toHaveTextContent(/Colis grand/);
    expect(screen.getByText("Accepter la livraison")).toBeOnTheScreen();
  });
});
