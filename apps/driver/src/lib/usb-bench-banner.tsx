import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { USB_GPS_FIXTURE } from "../config";

export function UsbBenchBanner() {
  const insets = useSafeAreaInsets();
  if (!USB_GPS_FIXTURE) return null;
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
        BANC USB · GPS FICTIF À LIBREVILLE
      </Text>
    </View>
  );
}
