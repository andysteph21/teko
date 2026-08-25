// C-06 Permission localisation — la valeur est expliquée AVANT la popup
// système. Refus ≠ impasse : l'app reste utilisable par recherche de repère.

import { color, spacing, typography } from "@teko/ui";
import { Button, LandmarkPinIcon } from "@teko/ui/native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LocationPermission() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const allow = async () => {
    setBusy(true);
    await Location.requestForegroundPermissionsAsync().catch(() => undefined);
    router.replace("/(main)/home");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <View style={styles.illustration}>
          <LandmarkPinIcon size={56} />
        </View>
        <Text style={styles.title}>{t("account:location.titre")}</Text>
        <Text style={styles.text}>{t("account:location.texte")}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={t("account:location.autoriser")}
          onPress={() => void allow()}
          busy={busy}
          testID="location-allow"
        />
        <Button
          label={t("account:location.plusTard")}
          variant="ghost"
          onPress={() => router.replace("/(main)/home")}
          testID="location-later"
        />
        <Text style={styles.note}>{t("account:location.sans")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing[5], backgroundColor: color.neutral[50] },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[4] },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 9999,
    backgroundColor: color.semantic.warning.light,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    textAlign: "center",
  },
  text: {
    fontSize: typography.fontSize.base,
    color: color.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing[3],
  },
  actions: { gap: spacing[3], paddingBottom: spacing[3] },
  note: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[500],
    textAlign: "center",
    lineHeight: 18,
  },
});
