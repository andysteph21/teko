// Toast discret (pill sombre bas d'écran, auto-effacé après 3,5 s) — porté
// par le store work : « demande attribuée à un autre chauffeur », « solde du
// jour mis à jour » au retour de D-14.

import { borderRadius, color, spacing, typography, zIndex } from "@teko/ui";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useWorkStore } from "./store";

const TOAST_MS = 3_500;

export function WorkToast() {
  const toast = useWorkStore((s) => s.toast);
  const clearToast = useWorkStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.pill} testID="work-toast">
        <Text style={styles.text}>{toast}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: "center",
    zIndex: zIndex.toast,
  },
  pill: {
    backgroundColor: color.neutral[800],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    maxWidth: "88%",
  },
  text: { color: color.neutral[0], fontSize: typography.fontSize.sm, fontWeight: "600" },
});
