import type { MobileMoneyProvider } from "./provider.ts";
import { MockProvider } from "./mock.ts";
import { AirtelProvider } from "./airtel.ts";

// Sélection du fournisseur via PAYMENT_PROVIDER (mock par défaut).
export function getProvider(): MobileMoneyProvider {
  const p = (Deno.env.get("PAYMENT_PROVIDER") ?? "mock").toLowerCase();
  switch (p) {
    case "airtel": return new AirtelProvider();
    case "mock":
    default: return new MockProvider();
  }
}

export * from "./provider.ts";
