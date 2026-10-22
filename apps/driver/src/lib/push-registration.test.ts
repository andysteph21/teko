import { registerDevice } from "@teko/api-client";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPush } from "./push-registration";
import { supabase } from "./supabase";

jest.mock("@teko/api-client", () => ({ registerDevice: jest.fn() }));
jest.mock("./supabase", () => ({ supabase: {} }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { easConfig: { projectId: "alpha-project" } },
}));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { MAX: 5 },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
  jest
    .mocked(Notifications.getPermissionsAsync)
    .mockResolvedValue({ granted: true, canAskAgain: true } as never);
  jest
    .mocked(Notifications.getExpoPushTokenAsync)
    .mockResolvedValue({ data: "ExpoPushToken[device-test]", type: "expo" });
});
it("obtient un jeton Expo du projet alpha et le lie à la session Android", async () => {
  expect(await registerPush("owner")).toBe("ready");
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
    "teko-alerts",
    expect.objectContaining({ importance: 5 }),
  );
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "alpha-project" });
  expect(registerDevice).toHaveBeenCalledWith(
    supabase,
    "owner",
    "ExpoPushToken[device-test]",
    "android",
  );
});
it("un refus définitif n'obtient aucun jeton et ne redemande pas la permission", async () => {
  jest
    .mocked(Notifications.getPermissionsAsync)
    .mockResolvedValue({ granted: false, canAskAgain: false } as never);
  expect(await registerPush("owner")).toBe("denied");
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(registerDevice).not.toHaveBeenCalled();
});
it("une permission accordée est suivie de l'enregistrement, un réseau indisponible échoue explicitement", async () => {
  jest
    .mocked(Notifications.getPermissionsAsync)
    .mockResolvedValue({ granted: false, canAskAgain: true } as never);
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: true } as never);
  expect(await registerPush("owner")).toBe("ready");
  jest.mocked(Notifications.getExpoPushTokenAsync).mockRejectedValue(new Error("Network"));
  expect(await registerPush("owner")).toBe("unavailable");
});

it("un iPhone enregistre un jeton Expo avec la plateforme iOS", async () => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  expect(await registerPush("owner")).toBe("ready");
  expect(registerDevice).toHaveBeenCalledWith(
    supabase,
    "owner",
    "ExpoPushToken[device-test]",
    "ios",
  );
  expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
});
