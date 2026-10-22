// L'absence de chauffeur est un état confirmé par le serveur. Le polling
// couvre une reconnexion ou un événement Realtime manqué.
import { useQuery } from "@tanstack/react-query";
import { createRealtimePositionsChannel, getRide } from "@teko/api-client";
import { type Href, useRouter } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

export function useSearchStatus(rideId: string | undefined) {
  const router = useRouter();
  const ride = useQuery({
    queryKey: ["ride", rideId, "search"],
    queryFn: () => getRide(supabase, rideId as string),
    enabled: Boolean(rideId),
    refetchInterval: (query) => (query.state.data?.status === "failed" ? false : 5000),
  });
  const { refetch } = ride;
  useEffect(() => {
    if (!rideId) return;
    const channel = createRealtimePositionsChannel(supabase);
    const unsubscribe = channel.subscribeRideStatus(rideId, (status) => {
      if (["accepted", "enroute", "arrived", "started"].includes(status)) {
        router.replace({ pathname: "/(main)/ride/[id]", params: { id: rideId } } as Href);
      } else {
        void refetch();
      }
    });
    return () => {
      void unsubscribe();
    };
  }, [rideId, refetch, router]);
  useEffect(() => {
    if (
      rideId &&
      ride.data &&
      ["accepted", "enroute", "arrived", "started"].includes(ride.data.status)
    ) {
      router.replace({ pathname: "/(main)/ride/[id]", params: { id: rideId } } as Href);
    }
  }, [rideId, ride.data, router]);
  return {
    noDriver: ride.data?.status === "failed" && ride.data.cancel_reason === "no_driver_found",
    error: ride.isError,
  };
}
