import { driverHeartbeat, driverOffline } from "@teko/api-client";
import { useRef } from "react";
import { USB_GPS_FIXTURE } from "../../config";
import { configureDriverLocation } from "../../lib/location-service";
import { registerPush } from "../../lib/push-registration";
import { supabase } from "../../lib/supabase";
import { useSession } from "../auth/use-session";
import { useWorkStore } from "./store";
import { ensureLocationPermission, fetchDevicePosition } from "./use-device-position";

async function notificationsReady(userId: string): Promise<boolean> {
  if (USB_GPS_FIXTURE || (await registerPush(userId)) === "ready") return true;
  useWorkStore
    .getState()
    .showToast(
      "Notifications indisponibles. Activez-les et vérifiez le réseau avant de passer en ligne.",
    );
  return false;
}

/** Le bouton confirme l'état serveur ; aucun passage en ligne différé. */
export function useOnlineToggle(): (next: boolean) => void {
  const { session } = useSession();
  const busy = useRef(false);
  return (next) => {
    if (busy.current || !session) return;
    busy.current = true;
    const run = async () => {
      const store = useWorkStore.getState();
      if (!next) {
        await driverOffline(supabase);
        await configureDriverLocation({ userId: session.user.id, online: false, eco: false });
        store.setOnline(false);
        store.setLocationIssue(null);
        return;
      }
      const permission = await ensureLocationPermission();
      if (permission !== "granted") {
        store.setLocationIssue(permission);
        return;
      }
      if (!(await notificationsReady(session.user.id))) return;
      const position = await fetchDevicePosition();
      if (!position) {
        store.setLocationIssue("lost");
        return;
      }
      await driverHeartbeat(supabase, position, { eco: false });
      try {
        await configureDriverLocation({ userId: session.user.id, online: true, eco: false });
      } catch (error) {
        await driverOffline(supabase);
        throw error;
      }
      store.setDevicePosition(position);
      store.setLocationIssue(null);
      store.setOnline(true);
    };
    void run()
      .catch(() => {
        useWorkStore
          .getState()
          .showToast("Disponibilité non confirmée. Vérifiez le réseau et votre invitation alpha.");
      })
      .finally(() => {
        busy.current = false;
      });
  };
}
