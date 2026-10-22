const mockRead = jest.fn();
const mockReplace = jest.fn();
const mockEnqueue = jest.fn();
const mockHeartbeat = jest.fn();
const mockGetRide = jest.fn();
const mockStop = jest.fn();
const mockSession = jest.fn();
const mockDrain = jest.fn();
const mockPurge = jest.fn();
jest.mock("expo-task-manager", () => ({ defineTask: jest.fn() }));
jest.mock("@teko/api-client", () => ({
  getSessionIdentity: (...args: unknown[]) =>
    jest.requireActual("@teko/api-client").getSessionIdentity(...args),
  driverHeartbeat: (...args: unknown[]) => mockHeartbeat(...args),
  getRide: (...args: unknown[]) => mockGetRide(...args),
  createRealtimePositionsChannel: () => ({ pushRidePosition: jest.fn() }),
  TekoApiError: class extends Error {},
}));
jest.mock("@teko/core", () => ({
  GPS_QUEUE_TTL_MS: 24 * 60 * 60 * 1000,
  drainGpsQueue: (...args: unknown[]) => mockDrain(...args),
}));
jest.mock("./gps-queue", () => ({
  gpsQueue: { purge: (...args: unknown[]) => mockPurge(...args) },
  enqueueGpsPoint: (...args: unknown[]) => mockEnqueue(...args),
}));
jest.mock("./location-service", () => ({
  DRIVER_LOCATION_TASK: "test",
  stopDriverLocation: (...args: unknown[]) => mockStop(...args),
  configureDriverLocation: jest.fn(),
}));
jest.mock("./location-state", () => ({
  readLocationState: () => mockRead(),
  replaceLocationState: (...args: unknown[]) => mockReplace(...args),
}));
jest.mock("./supabase", () => ({ supabase: { auth: { getSession: () => mockSession() } } }));

import type { LocationObject } from "expo-location";
import { processDriverLocation } from "./location-task";

const state = {
  userId: "driver",
  rideId: "ride",
  online: true,
  eco: false,
  lastHeartbeatAt: 0,
  lastRideCheckAt: 0,
};
const point = {
  timestamp: Date.now() - 2000,
  coords: { longitude: 9.45, latitude: 0.4 },
} as LocationObject;
beforeEach(() => {
  jest.clearAllMocks();
  mockRead.mockResolvedValue({ ...state });
  mockReplace.mockResolvedValue(true);
  mockSession.mockResolvedValue({ data: { session: { user: { id: "driver" } } } });
  mockHeartbeat.mockResolvedValue(undefined);
  mockGetRide.mockResolvedValue({ status: "started" });
});

it("persiste avant tout appel réseau et garde l'heure de mesure lors d'une panne", async () => {
  mockGetRide.mockImplementation(() => {
    expect(mockEnqueue).toHaveBeenCalled();
    throw new Error("offline");
  });
  mockHeartbeat.mockRejectedValue(new Error("offline"));
  await processDriverLocation(point);
  expect(mockEnqueue).toHaveBeenCalledWith({
    userId: "driver",
    rideId: "ride",
    lon: 9.45,
    lat: 0.4,
    recordedAt: point.timestamp,
  });
  expect(mockDrain).toHaveBeenCalled();
});

it("ne capture rien pour l'ancien compte après une déconnexion", async () => {
  mockSession.mockResolvedValue({ data: { session: null } });
  await processDriverLocation(point);
  expect(mockStop).toHaveBeenCalledWith("driver");
  expect(mockEnqueue).not.toHaveBeenCalled();
  expect(mockHeartbeat).not.toHaveBeenCalled();
});

it("un renouvellement de session indisponible hors réseau conserve le suivi et la mesure locale", async () => {
  mockSession.mockResolvedValue({
    data: { session: null },
    error: {
      name: "AuthRetryableFetchError",
      message: "Network request failed",
      status: 0,
      __isAuthError: true,
    },
  });
  await processDriverLocation(point);
  expect(mockStop).not.toHaveBeenCalled();
  expect(mockEnqueue).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "driver",
      rideId: "ride",
      recordedAt: point.timestamp,
    }),
  );
  expect(mockHeartbeat).not.toHaveBeenCalled();
  expect(mockDrain).not.toHaveBeenCalled();
  expect(mockPurge).toHaveBeenCalledWith("driver", expect.any(Number));
});

it("ne conserve pas une mesure vieille de plus de 24 heures, même hors réseau", async () => {
  mockSession.mockResolvedValue({
    data: { session: null },
    error: { name: "AuthRetryableFetchError", __isAuthError: true },
  });
  const now = Date.now();
  jest.spyOn(Date, "now").mockReturnValue(now);
  try {
    await processDriverLocation({ ...point, timestamp: now - 24 * 60 * 60 * 1000 });
    expect(mockPurge).toHaveBeenCalledWith("driver", now - 24 * 60 * 60 * 1000);
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(mockStop).not.toHaveBeenCalled();
  } finally {
    jest.restoreAllMocks();
  }
});

it.each([
  { data: { session: { user: { id: "other-driver" } } } },
  { data: { session: null }, error: { name: "AuthApiError", __isAuthError: true } },
])("arrête la capture si le compte change ou si la session est révoquée", async (identity) => {
  mockSession.mockResolvedValue(identity);
  await processDriverLocation(point);
  expect(mockStop).toHaveBeenCalledWith("driver");
  expect(mockEnqueue).not.toHaveBeenCalled();
  expect(mockPurge).not.toHaveBeenCalled();
});

it("une réponse ancienne ne rétablit pas la disponibilité après un changement local", async () => {
  mockReplace.mockResolvedValue(false);
  mockRead.mockResolvedValueOnce({ ...state }).mockResolvedValue(null);
  await processDriverLocation(point);
  expect(mockReplace).toHaveBeenCalledWith(
    state,
    expect.objectContaining({ lastHeartbeatAt: expect.any(Number) }),
  );
  expect(mockDrain).not.toHaveBeenCalled();
});
