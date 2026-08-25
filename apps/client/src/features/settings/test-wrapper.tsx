// Enveloppe de test des écrans réglages : fournisseurs requis par les hooks
// (TanStack Query, safe areas synchrones via initialMetrics).

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

const METRICS = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 360, height: 800 },
};

export function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}
