// Résolution du fournisseur push (PUSH_PROVIDER=fcm|mock, défaut mock) —
// le mock journalise sans réseau (dev local, CI).

import { fcmProvider } from "./fcm.ts";
import type { PushMessage, PushProvider, PushResult } from "./provider.ts";

export { messageForType } from "./provider.ts";
export type { PushMessage, PushProvider, PushResult } from "./provider.ts";

export function mockProvider(): PushProvider {
  return {
    name: "mock",
    send(message: PushMessage): Promise<PushResult> {
      console.log(`[push:mock] → ${message.token.slice(0, 12)}… « ${message.title} »`);
      return Promise.resolve({ ok: true });
    },
  };
}

export function getPushProvider(): PushProvider {
  if (Deno.env.get("PUSH_PROVIDER") === "fcm") {
    const sa = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!sa) throw new Error("FCM_SERVICE_ACCOUNT manquant");
    return fcmProvider(sa);
  }
  return mockProvider();
}
