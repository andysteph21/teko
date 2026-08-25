// D-09 Accueil chauffeur — carte plein écran, GROS toggle En ligne/Hors
// ligne (teal), solde du jour (driver_balance) + widget data. En ligne :
// heartbeat 20 s + flux d'offres → modal D-10 par-dessus l'écran. Suspendu
// (drivers.is_active = false) : bandeau explicite + lien règlement.

import { color, spacing } from "@teko/ui";
import { DataWidget, EcoPill } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_CENTER, TILES_URL } from "../../src/config";
import { useSession } from "../../src/features/auth/use-session";
import { TekoMapView } from "../../src/features/map/native-map";
import { useDataUsage, useResolvedMapMode } from "../../src/features/work/data-state";
import { HomeHeader } from "../../src/features/work/home-header";
import { BalanceCard, HomeTabs, SuspendedBanner } from "../../src/features/work/home-panel";
import { VehicleDot } from "../../src/features/work/map-layers";
import { OfferModal } from "../../src/features/work/offer-modal";
import { useWorkStore } from "../../src/features/work/store";
import { WorkToast } from "../../src/features/work/toast";
import { useDevicePosition } from "../../src/features/work/use-device-position";
import { useDriverHome } from "../../src/features/work/use-driver-home";
import { useHeartbeat } from "../../src/features/work/use-heartbeat";
import { useOfferFeed } from "../../src/features/work/use-offer-feed";

export default function DriverHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.user.id;
  const { balance, suspended } = useDriverHome(userId);
  const online = useWorkStore((s) => s.online);
  const setOnline = useWorkStore((s) => s.setOnline);
  const mode = useResolvedMapMode();
  const usage = useDataUsage();
  const position = useDevicePosition();

  const eco = mode.mode === "eco";
  const effectiveOnline = online && !suspended;
  useHeartbeat(effectiveOnline, eco);
  const feed = useOfferFeed(userId, effectiveOnline);

  return (
    <View style={styles.screen}>
      <HomeHeader
        balance={balance}
        online={effectiveOnline}
        disabled={suspended}
        onToggle={setOnline}
        topInset={insets.top}
      />
      <View style={styles.mapZone}>
        <TekoMapView
          options={{ tilesUrl: TILES_URL, eco }}
          center={position ?? DEFAULT_CENTER}
          zoom={14.2}
        >
          <VehicleDot position={position} />
        </TekoMapView>
        <View style={styles.widgetStack} pointerEvents="box-none">
          {eco ? <EcoPill /> : null}
          <DataWidget
            quantityText={usage.quantityText}
            state={usage.state}
            onPress={() => router.push("/(main)/settings" as Href)}
            testID="data-widget"
          />
        </View>
      </View>
      <View style={styles.panel}>
        {suspended ? <SuspendedBanner /> : <BalanceCard balance={balance} />}
      </View>
      <HomeTabs bottomInset={insets.bottom} />
      <WorkToast />
      {feed.offer ? (
        <OfferModal
          offer={feed.offer}
          busy={feed.busy}
          onAccept={feed.accept}
          onDecline={feed.decline}
          onExpire={feed.expire}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  mapZone: { flex: 1 },
  widgetStack: {
    position: "absolute",
    left: spacing[4],
    bottom: 14,
    gap: spacing[2],
  },
  panel: {
    backgroundColor: color.neutral[50],
    paddingHorizontal: spacing[4],
    paddingVertical: 14,
  },
});
