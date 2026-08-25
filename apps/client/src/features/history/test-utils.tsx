// Outils des tests du quotidien — enveloppe QueryClientProvider (les écrans
// C-18→C-22 lisent le backend via TanStack Query).

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

export function renderWithQuery(ui: ReactElement) {
  // gcTime Infinity : aucun timer de ramasse-miettes qui survive au test.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
