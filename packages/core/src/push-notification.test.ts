import { describe, expect, it } from "vitest";
import { pushTarget } from "./push-notification";

const id = "11111111-1111-4111-8111-111111111111";
describe("notifications non fiables", () => {
  it("ignore URL, identifiant injecté, JSON invalide et offre expirée", () => {
    expect(pushTarget({ url: "https://evil.test" })).toBeNull();
    expect(pushTarget({ notification_id: "../../admin" })).toBeNull();
    for (const payload of ["{", "null", "[]"])
      expect(pushTarget({ notification_id: id, payload })).toBeNull();
    expect(
      pushTarget(
        {
          notification_id: id,
          type: "ride_offer",
          payload: JSON.stringify({ offer_id: id, expires_at: new Date(1000).toISOString() }),
        },
        1001,
      ),
    ).toBeNull();
    expect(pushTarget({ notification_id: id, type: "ride_offer", payload: "{}" })).toBeNull();
  });
  it("ne conserve que des identifiants valides, sans exécuter de commande", () => {
    expect(
      pushTarget(
        {
          notification_id: id,
          type: "ride_offer",
          payload: JSON.stringify({
            offer_id: id,
            expires_at: new Date(2000).toISOString(),
            action: "accept",
          }),
        },
        1000,
      ),
    ).toEqual({ notificationId: id, offerId: id });
    expect(
      pushTarget({
        notification_id: id,
        payload: JSON.stringify({ ride_id: id, url: "https://evil.test" }),
      }),
    ).toEqual({ notificationId: id, rideId: id });
    expect(pushTarget({ notification_id: id })).toEqual({ notificationId: id });
    expect(
      pushTarget({ notification_id: id, payload: JSON.stringify({ ride_id: "../../" }) }),
    ).toEqual({ notificationId: id });
  });
});
