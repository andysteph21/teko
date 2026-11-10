import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { USB_GPS_FIXTURE } from "../config";

export function UsbBenchBanner() {
  const insets = useSafeAreaInsets();
  const remote = process.env.EXPO_PUBLIC_ALPHA_REMOTE === "1";
  const label = remote
    ? "ESSAI PRIVÉ · GPS RÉEL · PAIEMENT SIMULÉ"
    : process.env.EXPO_PUBLIC_ALPHA_USB_GPS === "1" && USB_GPS_FIXTURE
      ? "BANC USB · GPS FICTIF À LIBREVILLE"
      : null;
  if (!label) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: insets.top + 2,
        alignSelf: "center",
        zIndex: 10000,
        backgroundColor: "#7c2d12",
        padding: 5,
        borderRadius: 4,
      }}
    >
      <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}
