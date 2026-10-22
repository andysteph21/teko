const previous = { ...process.env };
afterEach(() => {
  process.env = { ...previous };
  jest.resetModules();
});
it("un GPS réel hors Gabon reste réel dans le build terrain", () => {
  delete process.env.EXPO_PUBLIC_ALPHA_USB_GPS;
  const { devicePoint, USB_GPS_FIXTURE } = require("./config");
  expect(USB_GPS_FIXTURE).toBe(false);
  expect(devicePoint({ lon: -73.6, lat: 45.5 })).toEqual({ lon: -73.6, lat: 45.5 });
});
it("le drapeau fictif exige l'URL exacte du banc USB", () => {
  process.env.EXPO_PUBLIC_ALPHA_USB_GPS = "1";
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://alpha.example.org";
  expect(require("./config").USB_GPS_FIXTURE).toBe(false);
  jest.resetModules();
  process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:58321";
  const { USB_GPS_FIXTURE, devicePoint, DEFAULT_CENTER } = require("./config");
  expect(USB_GPS_FIXTURE).toBe(true);
  expect(devicePoint({ lon: -73.6, lat: 45.5 })).toEqual(DEFAULT_CENTER);
});
