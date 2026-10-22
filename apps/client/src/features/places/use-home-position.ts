import type { LonLat } from "@teko/maps";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { DEFAULT_CENTER, devicePoint, USB_GPS_FIXTURE } from "../../config";
import { useBookingStore } from "../booking/store";

async function currentPoint(): Promise<LonLat | null> {
  if (USB_GPS_FIXTURE) return DEFAULT_CENTER;
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return devicePoint({ lon: loc.coords.longitude, lat: loc.coords.latitude });
}

/** Un départ choisi par repère ne doit jamais être remplacé par le GPS au retour. */
export function useHomePosition(): LonLat | null {
  const [position, setPosition] = useState<LonLat | null>(null);
  useEffect(() => {
    let active = true;
    void currentPoint()
      .then((point) => {
        if (!active || !point) return;
        setPosition(point);
        const booking = useBookingStore.getState();
        if (!booking.origin) {
          booking.setOrigin({
            position: point,
            label: USB_GPS_FIXTURE ? "Position fictive · banc USB" : "Ma position",
          });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return position;
}
