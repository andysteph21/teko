// C-27 : alerte SOS → report_incident(kind sos) + état confirmé (engagement
// n° 17), appel police 177, partage du trajet.

import { render, screen, userEvent } from "@testing-library/react-native";
import { Linking, Share } from "react-native";

const mockReportIncident = jest.fn();
const mockCreateTripShare = jest.fn();
jest.mock("@teko/api-client", () => ({
  reportIncident: (...args: unknown[]) => mockReportIncident(...args),
  createTripShare: (...args: unknown[]) => mockCreateTripShare(...args),
  TekoApiError: class TekoApiError extends Error {
    code = "unknown";
  },
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

import { SosScreen } from "./sos-screen";

beforeAll(async () => {
  const { createTekoI18n } = require("@teko/i18n");
  const { initReactI18next } = require("react-i18next");
  const { appFr } = require("../strings");
  await createTekoI18n({ plugins: [initReactI18next], extraFr: appFr });
});

beforeEach(() => jest.clearAllMocks());

describe("C-27 SOS", () => {
  it("alerte l'équipe Teko et affiche l'engagement de rappel", async () => {
    mockReportIncident.mockResolvedValueOnce({ id: "inc-1" });
    const user = userEvent.setup();
    render(<SosScreen rideId="ride-1" />);

    expect(screen.getByText("Besoin d'aide ?")).toBeOnTheScreen();
    await user.press(screen.getByTestId("sos-alert"));

    expect(mockReportIncident).toHaveBeenCalledWith({}, { kind: "sos", rideId: "ride-1" });
    expect(await screen.findByTestId("sos-confirmed")).toHaveTextContent(
      "L'équipe Teko vous rappelle immédiatement",
    );
  });

  it("appelle la police via tel:177", async () => {
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    render(<SosScreen rideId="ride-1" />);

    await user.press(screen.getByTestId("sos-police"));

    expect(openUrl).toHaveBeenCalledWith("tel:177");
  });

  it("partage le trajet en direct (lien à jeton)", async () => {
    mockCreateTripShare.mockResolvedValueOnce({ token: "tok-7" });
    const shareSpy = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: "sharedAction" } as never);
    const user = userEvent.setup();
    render(<SosScreen rideId="ride-1" />);

    await user.press(screen.getByTestId("sos-share"));

    expect(mockCreateTripShare).toHaveBeenCalledWith({}, "ride-1");
    expect(shareSpy).toHaveBeenCalledWith({
      message: expect.stringContaining("https://teko.ga/t/tok-7"),
    });
  });

  it("ferme la superposition", async () => {
    const user = userEvent.setup();
    render(<SosScreen />);

    await user.press(screen.getByTestId("sos-close"));

    expect(mockBack).toHaveBeenCalled();
  });
});
