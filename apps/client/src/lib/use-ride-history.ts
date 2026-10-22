import { useQuery } from "@tanstack/react-query";
import { cachedRideHistory } from "@teko/api-client";
import { useSession } from "../features/auth/use-session";
import { historyCache } from "./history-cache";
import { supabase } from "./supabase";

export function useRideHistory() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["my-rides", userId],
    enabled: Boolean(userId),
    networkMode: "always",
    queryFn: () => cachedRideHistory(supabase, userId as string, historyCache),
  });
}
