// États de chargement / d'erreur partagés par D-15/16/17 — les erreurs
// passent par TekoApiError.code (jamais de string-match sur les messages).

import { TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function LoadingView() {
  return (
    <View style={styles.centre} testID="loading">
      <ActivityIndicator color={color.role.driver.accent} />
    </View>
  );
}

/** Message d'erreur par code stable — réseau à part, générique sinon. */
export function messageErreur(error: unknown, t: (key: string) => string): string {
  if (error instanceof TekoApiError && error.code === "network") return t("erreurs.reseau");
  return t("erreurs.generique");
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.centre}>
      <Text style={styles.texte}>{messageErreur(error, t)}</Text>
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
