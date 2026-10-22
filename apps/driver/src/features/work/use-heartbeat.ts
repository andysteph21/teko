import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { configureDriverLocation } from "../../lib/location-service";
import { useSession } from "../auth/use-session";
import { useWorkStore } from "./store";

export const HEARTBEAT_MS = 20_000;

/** Configuration du service ; les battements ne dépendent plus d'un timer JS. */
export function useHeartbeat(active: boolean, eco: boolean): void {
  const { session } = useSession();
  const userId = session?.user.id;
  const wasActive = useRef(false);
  useEffect(() => {
    if (!userId) return;
    if (!active && !wasActive.current) return;
    wasActive.current = active;
    const configure = () => {
      void configureDriverLocation({ userId, online: active, eco }).catch(() => {
        useWorkStore.setState({ online: false, locationIssue: "lost" });
      });
    };
    configure();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") configure();
    });
    return () => listener.remove();
  }, [active, eco, userId]);
}
