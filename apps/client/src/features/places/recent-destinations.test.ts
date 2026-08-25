import { relativeDayLabel } from "./use-recent-destinations";

describe("relativeDayLabel", () => {
  const now = new Date("2026-08-25T12:00:00Z");

  it("aujourd'hui / hier / jour de la semaine", () => {
    expect(relativeDayLabel("2026-08-25T09:00:00Z", now)).toBe("aujourd'hui");
    expect(relativeDayLabel("2026-08-24T09:00:00Z", now)).toBe("hier");
    expect(relativeDayLabel("2026-08-21T09:00:00Z", now)).toBe("vendredi");
  });
});
