import { pushTarget } from "@teko/core";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useSession } from "../features/auth/use-session";
import { registerPush } from "./push-registration";
import { routePush } from "./push-routing";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const fresh = pushTarget(notification.request.content.data ?? {}) !== null;
    return {
      shouldPlaySound: fresh,
      shouldSetBadge: false,
      shouldShowBanner: fresh,
      shouldShowList: fresh,
    };
  },
});

/** Les taps n'acceptent jamais une offre et ne contournent jamais la RLS. */
export function usePushNotifications(): void {
  const { session } = useSession();
  const userId = session?.user.id;
  const router = useRouter();
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let registering = false;
    const register = async () => {
      if (registering || !active) return;
      registering = true;
      try {
        await registerPush(userId);
      } finally {
        registering = false;
      }
    };
    const handle = (notification: Notifications.Notification, tapped: boolean) => {
      void routePush(notification.request.content.data ?? {}, {
        userId,
        router,
        tapped,
        active: () => active,
      });
    };
    void register();
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") void register();
    });
    const received = Notifications.addNotificationReceivedListener((n) => {
      void handle(n, false);
    });
    const response = Notifications.addNotificationResponseReceivedListener((r) => {
      void handle(r.notification, true);
    });
    const token = Notifications.addPushTokenListener(() => {
      void register();
    });
    void Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) {
          void handle(r.notification, true);
          void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      state.remove();
      received.remove();
      response.remove();
      token.remove();
    };
  }, [userId, router]);
}
