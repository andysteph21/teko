// Un fournisseur absent est une erreur de configuration, jamais un faux succès.

import { fcmProvider } from "./fcm.ts";
import { expoProvider } from "./expo.ts";
import type { PushMessage, PushProvider, PushResult } from "./provider.ts";

export { messageForType } from "./provider.ts";
export type { PushMessage, PushProvider, PushResult } from "./provider.ts";

export function mockProvider(): PushProvider {
  return {
    name: "mock",
    send(message: PushMessage): Promise<PushResult> {
      console.log(
        `[push:mock] → ${message.token.slice(0, 12)}… « ${message.title} »`,
      );
      return Promise.resolve({ ok: true });
    },
  };
}

export function getPushProvider(): PushProvider {
  if (Deno.env.get("PUSH_PROVIDER") === "expo") {
    return expoProvider(Deno.env.get("EXPO_ACCESS_TOKEN"));
  }
  if (Deno.env.get("PUSH_PROVIDER") === "fcm") {
    const sa = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!sa) throw new Error("FCM_SERVICE_ACCOUNT manquant");
    return fcmProvider(sa);
  }
  if (
    Deno.env.get("PUSH_PROVIDER") === "mock" &&
    Deno.env.get("TEKO_PUSH_SANDBOX") === "true"
  ) return mockProvider();
  throw new Error("Fournisseur push absent ou sandbox non autorisée");
}
