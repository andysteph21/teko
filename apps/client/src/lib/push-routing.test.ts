import { getNotification, getRide } from "@teko/api-client";
import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

import { onPushOffer } from "./push-events";
import { routePush } from "./push-routing";
import { supabase } from "./supabase";

jest.mock("@teko/api-client", () => ({ getNotification: jest.fn(), getRide: jest.fn() }));
jest.mock("./supabase", () => ({ supabase: { auth: { getSession: jest.fn() } } }));
const id = "11111111-1111-4111-8111-111111111111";
const push = jest.fn();
const options = {
  userId: "owner",
  router: { push } as unknown as Router,
  tapped: true,
  active: () => true,
};
const data = { notification_id: id };
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(supabase.auth.getSession)
    .mockResolvedValue({ data: { session: { user: { id: "owner" } } }, error: null } as never);
  jest
    .mocked(getNotification)
    .mockResolvedValue({ id, type: "ride_accepted", payload: { ride_id: id } } as never);
  jest.mocked(getRide).mockResolvedValue({ id } as never);
});
it("relit la notification et la course autorisées, sans suivre l'URL reçue", async () => {
  await routePush(
    { ...data, url: "https://evil.test", payload: JSON.stringify({ ride_id: "../../admin" }) },
    options,
  );
  expect(getNotification).toHaveBeenCalledWith(supabase, id);
  expect(getRide).toHaveBeenCalledWith(supabase, id);
  expect(push).toHaveBeenCalledWith(`/(main)/ride/${id}`);
});
it("aucun routage si le compte a changé pendant la requête ou si la course est interdite", async () => {
  jest
    .mocked(supabase.auth.getSession)
    .mockResolvedValue({ data: { session: { user: { id: "other" } } }, error: null } as never);
  await routePush(data, options);
  expect(push).not.toHaveBeenCalled();
  jest
    .mocked(supabase.auth.getSession)
    .mockResolvedValue({ data: { session: { user: { id: "owner" } } }, error: null } as never);
  jest.mocked(getRide).mockRejectedValue(new Error("RLS"));
  await routePush(data, options);
  expect(push).not.toHaveBeenCalled();
});
it("un push d'offre réveille la lecture sans accepter, et reste soumis à l'expiration serveur", async () => {
  const receive = jest.fn();
  const stop = onPushOffer(receive);
  jest.mocked(getNotification).mockResolvedValue({
    id,
    type: "ride_offer",
    payload: { offer_id: id, expires_at: new Date(Date.now() + 10000).toISOString() },
  } as never);
  await routePush(data, { ...options, tapped: false });
  expect(receive).toHaveBeenCalledWith(id);
  expect(push).not.toHaveBeenCalled();
  expect(getRide).not.toHaveBeenCalled();
  receive.mockClear();
  jest.mocked(getNotification).mockResolvedValue({
    id,
    type: "ride_offer",
    payload: { offer_id: id, expires_at: new Date(0).toISOString() },
  } as never);
  await routePush(data, options);
  expect(receive).not.toHaveBeenCalled();
  stop();
});
it("rejette une notification illisible et un écran démonté", async () => {
  await routePush({ notification_id: "../../" }, options);
  expect(getNotification).not.toHaveBeenCalled();
  await routePush(data, { ...options, active: () => false });
  expect(push).not.toHaveBeenCalled();
  jest.mocked(getNotification).mockRejectedValue(new Error("Network"));
  await routePush(data, options);
  expect(push).not.toHaveBeenCalled();
});
