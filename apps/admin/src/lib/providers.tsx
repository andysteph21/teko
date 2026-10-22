"use client";

// Fournisseurs côté navigateur (TanStack Query) — un client par onglet.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "./supabase";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 15_000 },
          mutations: { networkMode: "always", retry: false },
        },
      }),
  );
  useEffect(() => {
    let owner: string | null | undefined;
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (next !== owner) {
        queryClient.clear();
        owner = next;
      }
    });
    return () => subscription.data.subscription.unsubscribe();
  }, [queryClient]);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
