// Fenêtre de modification de trajet (lot R3) : compte à rebours jusqu'à
// respond_by, actions désarmées à l'échéance puis fermeture automatique,
// signal d'attention (vibration + annonce) et inset bas réservé.

import type { RouteChange } from "@teko/api-client";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

import { RouteChangeModal } from "./route-change-modal";
import { OFFER_EXPIRE_GRACE_MS } from "./use-offer-countdown";

const NOW = new Date("2026-11-23T12:00:00Z");
const CHANGE = {
  id: "chg-1",
  status: "pending",
  dest_hint: "portail vert",
  dest_landmark_id: null,
  stops: [],
  old_price: 1200,
  new_price: 1200,
  expires_at: new Date(NOW.getTime() + 300_000).toISOString(),
} as unknown as RouteChange;

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

function mount(ttlMs: number, patch: object = {}) {
  const handlers = { onAccept: jest.fn(), onRefuse: jest.fn(), onExpire: jest.fn() };
  const change = {
    ...CHANGE,
    respond_by: new Date(NOW.getTime() + ttlMs).toISOString(),
    ...patch,
  } as RouteChange;
  const view = render(
    <RouteChangeModal change={change} destinationName={null} busy={false} {...handlers} />,
  );
  return { ...handlers, view };
}

describe("RouteChangeModal", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("30 secondes pour répondre : précision de destination, sans arrêt, boutons vivants", () => {
    const { onAccept, onRefuse } = mount(30_000);

    expect(screen.getByTestId("route-change-timer")).toHaveTextContent("30 s");
    expect(screen.getByTestId("route-change-destination")).toHaveTextContent("portail vert");
    expect(screen.getByTestId("route-change-stops")).toHaveTextContent("Sans arrêt");
    fireEvent.press(screen.getByTestId("route-change-accept"));
    fireEvent.press(screen.getByTestId("route-change-refuse"));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onRefuse).toHaveBeenCalledTimes(1);
  });

  it("deux arrêts et destination sans précision", () => {
    mount(30_000, { dest_hint: null, stops: [{}, {}] });
    expect(screen.getByTestId("route-change-stops")).toHaveTextContent("2 arrêts en chemin");
    expect(screen.getByTestId("route-change-destination")).toHaveTextContent(
      "Destination modifiée par le passager",
    );
  });

  it("à l'échéance : actions désarmées puis fermeture automatique", () => {
    const { onAccept, onRefuse, onExpire } = mount(2000);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("route-change-timer")).toHaveTextContent("0 s");
    fireEvent.press(screen.getByTestId("route-change-accept"));
    fireEvent.press(screen.getByTestId("route-change-refuse"));
    expect(onAccept).not.toHaveBeenCalled();
    expect(onRefuse).not.toHaveBeenCalled();
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(OFFER_EXPIRE_GRACE_MS);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("réserve l'inset bas : marge du panneau = 18 + insets.bottom", () => {
    mount(30_000);
    expect(screen.getByTestId("route-change-sheet")).toHaveStyle({ marginBottom: 52 });
  });
});

describe("signal d'attention", () => {
  it("vibre comme une proposition et lit la demande, puis se tait au démontage", async () => {
    const { Vibration } = require("react-native");
    const Speech = require("expo-speech");
    jest.mocked(Speech.speak).mockClear();
    const vibrate = jest.spyOn(Vibration, "vibrate").mockImplementation(() => undefined);
    const cancel = jest.spyOn(Vibration, "cancel").mockImplementation(() => undefined);
    const change = {
      ...CHANGE,
      new_price: 1800,
      respond_by: new Date(Date.now() + 30_000).toISOString(),
    } as RouteChange;
    const view = render(
      <RouteChangeModal
        change={change}
        destinationName="Marché de Nkembo"
        busy={false}
        onAccept={jest.fn()}
        onRefuse={jest.fn()}
        onExpire={jest.fn()}
      />,
    );

    expect(vibrate).toHaveBeenCalledWith([0, 700, 350, 700, 350, 700, 1200], true);
    await waitFor(() =>
      expect(Speech.speak).toHaveBeenCalledWith(
        "Le passager demande une modification du trajet. Nouvelle destination : Marché de Nkembo. Nouveau prix : 1800 francs. Acceptez ou refusez.",
        expect.anything(),
      ),
    );
    view.unmount();
    expect(cancel).toHaveBeenCalled();
    expect(Speech.stop).toHaveBeenCalled();
    vibrate.mockRestore();
    cancel.mockRestore();
  });
});
