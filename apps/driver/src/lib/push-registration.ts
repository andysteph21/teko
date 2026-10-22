import { registerDevice } from "@teko/api-client";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export type PushStatus = "ready" | "not_configured" | "denied" | "unavailable";
const projectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  Constants.easConfig?.projectId ??
  Constants.expoConfig?.extra?.eas?.projectId;

/** Le canal Android doit exister avant la demande de permission Android 13+. */
export async function registerPush(userId: string): Promise<PushStatus> {
  if (!projectId) return "not_configured";
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("teko-alerts", {
        name: "Alertes Teko",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain)
      permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return "denied";
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerDevice(supabase, userId, token.data, Platform.OS === "ios" ? "ios" : "android");
    return "ready";
  } catch {
    return "unavailable";
  }
}
