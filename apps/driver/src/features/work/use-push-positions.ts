import { useEffect } from "react";
import { AppState } from "react-native";
import { configureDriverLocation } from "../../lib/location-service";
import { useSession } from "../auth/use-session";
import { useWorkStore } from "./store";

export const PUSH_MS = 5_000;
export const PUSH_ECO_MS = 10_000;

/** Le service natif reste actif lorsque l'écran de course est démonté. */
export function usePushPositions(
  rideId: string | undefined,
  active: boolean | undefined,
  eco: boolean,
): void {
  const { session } = useSession();
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId || !rideId || active === undefined) return;
    const configure = () => {
      void configureDriverLocation({ userId, rideId: active ? rideId : null, eco }).catch(() => {
        useWorkStore
          .getState()
          .showToast("Suivi GPS indisponible. Vérifiez la localisation avant de poursuivre.");
      });
    };
    configure();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") configure();
    });
    return () => listener.remove();
  }, [rideId, active, eco, userId]);
}
