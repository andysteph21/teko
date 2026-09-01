// Modal D-10 — comportement issu du signalement tap-through (doc 10 §8,
// Q1) : actions vivantes avant l'échéance, désarmées pendant la grâce,
// fermeture différée, et marge basse qui réserve insets.bottom
// (edge-to-edge : la rangée d'actions recouvre HomeTabs).

import { act, fireEvent, render, screen } from "@testing-library/react-native";

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
