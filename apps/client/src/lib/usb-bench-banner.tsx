import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { USB_GPS_FIXTURE } from "../config";

export function UsbBenchBanner() {
  const insets = useSafeAreaInsets();
  const remote = process.env.EXPO_PUBLIC_ALPHA_REMOTE === "1";
  if (!USB_GPS_FIXTURE && !remote) return null;
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
      <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>
        {remote ? "ESSAI PRIVÉ · AUCUNE COURSE RÉELLE" : "BANC USB · GPS FICTIF À LIBREVILLE"}
      </Text>
    </View>
  );
}
