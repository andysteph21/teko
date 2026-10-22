import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { expoProvider } from "./expo.ts";
import { getPushProvider } from "./index.ts";
import { safePushPayload } from "./payload.ts";
import { expoReceipts } from "./receipts.ts";

const message = {
  token: "ExpoPushToken[device-token]",
  title: "Teko",
  body: "Ouvrez l’app",
  data: { type: "ride_offer" },
  ttl: "12s",
  expiresAt: 1890000000000,
};
function fakeRequest(body: unknown, status = 200): typeof fetch {
  return ((_url: unknown, _options: unknown) =>
    Promise.resolve(
      new Response(JSON.stringify(body), { status }),
    )) as typeof fetch;
}
Deno.test("Expo conserve l'échéance serveur et ne confond pas ticket et reçu", async () => {
  let captured: RequestInit | undefined;
  const request = ((_url: unknown, options: RequestInit) => {
    captured = options;
    return Promise.resolve(
      new Response(JSON.stringify({ data: { status: "ok", id: "ticket-1" } })),
    );
  }) as typeof fetch;
  assertEquals(await expoProvider("server-only", request).send(message), {
    ok: true,
    receiptId: "ticket-1",
  });
  const sent = JSON.parse(String(captured?.body));
  assertEquals(sent.expiration, 1890000000);
  assertEquals(sent.ttl, 12);
  assertEquals(sent.priority, "high");
  assertEquals(sent.channelId, "teko-alerts");
  assertEquals(
    (captured?.headers as Record<string, string>).authorization,
    "Bearer server-only",
  );
});
Deno.test("Expo distingue jeton invalide, saturation et réponse sans ticket", async () => {
  assertEquals(
    (await expoProvider(undefined, fakeRequest({})).send({
      ...message,
      token: "fcm-raw",
    })).invalidToken,
    true,
  );
  assertEquals(
    (await expoProvider(
      undefined,
      fakeRequest({
        data: { status: "error", details: { error: "DeviceNotRegistered" } },
      }),
    ).send(message)).invalidToken,
    true,
  );
  assertEquals(
    (await expoProvider(undefined, fakeRequest({}, 429)).send(message)).ok,
    false,
  );
  assertEquals(
    (await expoProvider(undefined, fakeRequest({ data: { status: "ok" } }))
      .send(message)).ok,
    false,
  );
});
Deno.test("les payloads push excluent GPS, PIN, KYC, prix et URL arbitraire", () => {
  assertEquals(
    safePushPayload({
      ride_id: "ride",
      offer_id: 123,
      pin: "1234",
      lat: 0.4,
      lon: 9.4,
      amount: 5000,
      document: "kyc",
      url: "https://evil.test",
    }),
    { ride_id: "ride" },
  );
});
Deno.test("les reçus Expo restent séparés et les erreurs HTTP ne sont pas des succès", async () => {
  assertEquals(await expoReceipts([], undefined, fakeRequest({})), {});
  assertEquals(
    await expoReceipts(
      ["ticket-1"],
      undefined,
      fakeRequest({ data: { "ticket-1": { status: "ok" } } }),
    ),
    { "ticket-1": { status: "ok" } },
  );
  await assertRejects(() =>
    expoReceipts(["t"], undefined, fakeRequest({}, 503))
  );
  await assertRejects(() => expoReceipts(["t"], undefined, fakeRequest({})));
});
Deno.test("le mock push exige une activation explicite du sandbox", () => {
  const previous = [
    Deno.env.get("PUSH_PROVIDER"),
    Deno.env.get("TEKO_PUSH_SANDBOX"),
  ];
  try {
    Deno.env.delete("PUSH_PROVIDER");
    assertThrows(() => getPushProvider());
    Deno.env.set("PUSH_PROVIDER", "mock");
    Deno.env.delete("TEKO_PUSH_SANDBOX");
    assertThrows(() => getPushProvider());
    Deno.env.set("TEKO_PUSH_SANDBOX", "true");
    assertEquals(getPushProvider().name, "mock");
  } finally {
    for (
      const [index, key] of ["PUSH_PROVIDER", "TEKO_PUSH_SANDBOX"].entries()
    ) {
      const value = previous[index];
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
