import type { LonLat } from "@teko/maps";
import { useLocationRefresh, withLocationDeadline } from "@teko/ui/native";
import * as Location from "expo-location";
import { Alert, Linking } from "react-native";
import { DEFAULT_CENTER, devicePoint, USB_GPS_FIXTURE } from "../../config";
import { useBookingStore } from "../booking/store";

async function currentPoint(manual: boolean): Promise<LonLat | null> {
  if (USB_GPS_FIXTURE) return DEFAULT_CENTER;
  let permission = await Location.getForegroundPermissionsAsync();
  if (
    permission.canAskAgain &&
    (manual || permission.status === "undetermined") &&
    !permission.granted
  ) {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (permission.status !== "granted") {
    if (manual && permission.canAskAgain === false) {
      Alert.alert(
        "Localisation désactivée",
        "Autorise la localisation de Teko dans les réglages du téléphone.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Ouvrir les réglages", onPress: () => void Linking.openSettings() },
        ],
      );
    }
    return null;
  }
  const loc = await withLocationDeadline(
    Location.getCurrentPositionAsync({
      accuracy: manual ? Location.Accuracy.High : Location.Accuracy.Balanced,
    }),
  );
  return devicePoint({ lon: loc.coords.longitude, lat: loc.coords.latitude });
}

function applyPosition(point: LonLat, manual: boolean) {
  const booking = useBookingStore.getState();
  if (booking.origin && !(manual && booking.origin.source === "gps")) return;
  booking.setOrigin({
    position: point,
    label: USB_GPS_FIXTURE ? "Position fictive · banc USB" : "Ma position",
    source: "gps",
  });
}

function reportFailure() {
  Alert.alert("Position indisponible", "Active le GPS et réessaie à un endroit dégagé.");
}

export function useHomePosition() {
  return useLocationRefresh(currentPoint, applyPosition, reportFailure);
}
