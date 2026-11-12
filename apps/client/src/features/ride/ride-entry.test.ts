import { rideEntryRedirect } from "./ride-entry";

describe("rideEntryRedirect", () => {
  it.each(["accepted", "enroute", "arrived", "started"] as const)(
    "garde le suivi pour une course %s",
    (status) => {
      expect(rideEntryRedirect({ id: "r1", status })).toBeNull();
    },
  );

  it("renvoie une course sans chauffeur vers la recherche", () => {
    expect(rideEntryRedirect({ id: "r1", status: "requested" })).toEqual({
      pathname: "/(main)/searching",
      params: { rideId: "r1" },
    });
  });

  it.each(["cancelled_client", "cancelled_driver", "failed", "completed", "no_show"] as const)(
    "renvoie une course %s vers son détail d'historique",
    (status) => {
      expect(rideEntryRedirect({ id: "r1", status })).toBe("/(main)/history/r1");
    },
  );
});
