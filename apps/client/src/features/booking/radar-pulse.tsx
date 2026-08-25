// Radar C-12 — trois cercles magenta concentriques qui s'étendent en boucle,
// sobres (opacité faible, pas de flash). Purement décoratif, non interactif.

import { color } from "@teko/ui";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const RINGS = 3;
const DURATION_MS = 2_400;
const RING_SIZE = 280;

export function RadarPulse() {
  const values = useRef(Array.from({ length: RINGS }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((i * DURATION_MS) / RINGS),
          Animated.timing(value, {
            toValue: 1,
            duration: DURATION_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    for (const loop of loops) loop.start();
    return () => {
      for (const loop of loops) loop.stop();
    };
  }, [values]);

  return (
    <View style={styles.overlay} pointerEvents="none" testID="radar-pulse">
      {values.map((value, i) => (
        <Animated.View
          // biome-ignore lint/suspicious/noArrayIndexKey: anneaux fixes, jamais réordonnés.
          key={i}
          style={[
            styles.ring,
            {
              opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
              transform: [
                { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) },
              ],
            },
          ]}
        />
      ))}
      <View style={styles.center} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: color.brand[500],
  },
  center: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: color.brand[500],
    borderWidth: 2.5,
    borderColor: color.neutral[0],
  },
});
