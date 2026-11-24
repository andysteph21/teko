import { assert, assertEquals } from "@std/assert";
// deno-lint-ignore no-import-prefix -- même version que le vérificateur du runtime Edge.
import { Webhook } from "npm:standardwebhooks@1.0.0";
import { fieldSms } from "./handler.ts";

const key = btoa("fixture-only-sms-signing-secret--");
const secret = `v1,whsec_${key}`;
const phone = "24106031234";
const otp = "845216";

function hookRequest(signed = true) {
  const body = JSON.stringify({ user: { phone }, sms: { otp } });
  const time = new Date();
  const id = "evt-field-otp";
  return new Request("http://localhost/send-field-sms", {
    method: "POST",
    body,
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(time.getTime() / 1000)),
      "webhook-signature": signed
        ? new Webhook(key).sign(id, time, body)
        : "v1,invalid",
    },
  });
}

Deno.test("SMS terrain : aucun envoi sans signature valide, invitation active et clé live", async () => {
  let calls = 0;
  const send = () => {
    calls++;
    return Promise.resolve(Response.json({ status: "submitted" }));
  };
  const options = {
    secret,
    apiKey: "esms_live_fixture",
    sender: "TEKO",
    send,
    invited: () => Promise.resolve(true),
  };
  assertEquals((await fieldSms(options)(hookRequest(false))).status, 401);
  assertEquals(
    (await fieldSms({ ...options, invited: () => Promise.resolve(false) })(
      hookRequest(),
    )).status,
    403,
  );
  assertEquals(
    (await fieldSms({ ...options, apiKey: "esms_test_fixture" })(hookRequest()))
      .status,
    503,
  );
  assertEquals(calls, 0);
});

Deno.test("SMS terrain : idempotence fournisseur et refus des échecs de soumission", async () => {
  let status = "submitted";
  const send: typeof fetch = (url, init) => {
    assertEquals(url, "https://sms.esmsafrica.io/api/messages/send");
    assertEquals(
      new Headers(init?.headers).get("idempotency-key"),
      "evt-field-otp",
    );
    const payload = JSON.parse(String(init?.body));
    assertEquals(payload.to, `+${phone}`);
    assertEquals(payload.sender_id, "TEKO");
    assert(payload.text.includes(otp));
    return Promise.resolve(Response.json({ status }));
  };
  const handler = fieldSms({
    secret,
    apiKey: "esms_live_fixture",
    sender: "TEKO",
    send,
    invited: (number) => Promise.resolve(number === phone),
  });
  assertEquals(await (await handler(hookRequest())).json(), {});
  status = "failed";
  assertEquals((await handler(hookRequest())).status, 503);
});
