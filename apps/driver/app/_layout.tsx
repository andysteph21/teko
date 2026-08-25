// Racine de l'app client — fournisseurs globaux (données serveur, i18n)
// + navigation expo-router. Safe areas dès le premier écran (API 36
// edge-to-edge sans opt-out, doc 10 §5).

import { QueryClientProvider } from "@tanstack/react-query";
import { color } from "@teko/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { i18nReady } from "../src/lib/i18n";
import { createQueryClient } from "../src/lib/query-client";

const queryClient = createQueryClient();

export default function RootLayout() {
  const [i18nLoaded, setI18nLoaded] = useState(false);
  useEffect(() => {
    i18nReady.then(() => setI18nLoaded(true));
  }, []);
  if (!i18nLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.neutral[50] },
        }}
      />
    </QueryClientProvider>
  );
}
