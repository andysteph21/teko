// Modules natifs absents du runtime Jest.
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  getAvailableVoicesAsync: jest.fn(async () => [
    { identifier: "fr-fr-x-test", language: "fr-FR", name: "fr", quality: "Default" },
  ]),
}));
