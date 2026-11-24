// Voix française exigée : sans elle, Teko se tait (OPPO A15 réglé en anglais).

function load() {
  let mod: typeof import("./voice") | undefined;
  jest.isolateModules(() => {
    mod = require("./voice");
  });
  return mod as typeof import("./voice");
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => jest.clearAllMocks());

it("lit l'annonce avec la voix française du téléphone", async () => {
  const Speech = require("expo-speech");
  const voice = load();
  voice.announce("Nouvelle course.");
  await flush();
  expect(Speech.speak).toHaveBeenCalledWith(
    "Nouvelle course.",
    expect.objectContaining({ language: "fr-FR", voice: "fr-fr-x-test" }),
  );
  expect(voice.useVoiceStore.getState().frenchAvailable).toBe(true);
});

it("sans voix française, se tait et le signale aux Paramètres", async () => {
  const Speech = require("expo-speech");
  jest
    .mocked(Speech.getAvailableVoicesAsync)
    .mockResolvedValueOnce([{ identifier: "en-us-x-a", language: "en-US" }]);
  const voice = load();
  voice.announce("Nouvelle course.");
  await flush();
  expect(Speech.speak).not.toHaveBeenCalled();
  expect(voice.useVoiceStore.getState().frenchAvailable).toBe(false);
});
