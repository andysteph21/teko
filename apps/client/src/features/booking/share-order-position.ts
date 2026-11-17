// Position du téléphone à la commande, transmise au chauffeur attribué en
// complément du point de rencontre (décision du porteur du 12 novembre
// 2026). Meilleure volonté : sans permission ou sans GPS, la commande
// continue sans cette position.

import { setRideClientPosition } from "@teko/api-client";
import * as Location from "expo-location";
import { devicePoint } from "../../config";
import { supabase } from "../../lib/supabase";

export async function shareOrderPosition(rideId: string): Promise<void> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return;
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    await setRideClientPosition(
      supabase,
      rideId,
      devicePoint({ lon: location.coords.longitude, lat: location.coords.latitude }),
    );
  } catch {
    // Réseau, GPS muet ou course déjà prise en charge : rien à signaler.
  }
}
