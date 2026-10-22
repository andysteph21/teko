// QueryClient partagé — réglages sobres pour réseau 2G/3G instable :
// peu de tentatives automatiques, données considérées fraîches 30 s.

import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { networkMode: "always", retry: false },
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
  });
}
