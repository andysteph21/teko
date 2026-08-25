// États de chargement / d'erreur partagés par C-15/16/17 — la course doit
// être lue avant d'afficher quoi que ce soit.

import { TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function LoadingView() {
  return (
    <View style={styles.centre} testID="loading">
      <ActivityIndicator color={color.brand[500]} />
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  const reseau = error instanceof TekoApiError && error.code === "network";
  return (
    <View style={styles.centre}>
      <Text style={styles.texte}>{reseau ? t("erreurs.reseau") : t("erreurs.generique")}</Text>
      <Button label={t("commun.reessayer")} variant="secondary" onPress={onRetry} testID="retry" />
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    padding: spacing[6],
  },
  texte: {
    fontSize: typography.fontSize.base,
    color: color.neutral[500],
    textAlign: "center",
  },
});
