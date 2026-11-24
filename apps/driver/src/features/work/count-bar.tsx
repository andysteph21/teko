// Barre de compte à rebours des fenêtres à échéance serveur (proposition de
// course D-10, demande de modification de trajet) : se vide linéairement
// jusqu'à l'échéance.

import { color } from "@teko/ui";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { offerRemainingMs } from "./use-offer-countdown";

export function CountBar({ expiresAt }: { expiresAt: string }) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: offerRemainingMs(expiresAt),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expiresAt, progress]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: color.neutral[100],
    marginHorizontal: -18,
    marginBottom: 14,
  },
  fill: { height: 6, backgroundColor: color.role.driver.accent },
});
