import type { TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { OfflineScreen } from "../../components/offline-screen";

export function QuoteErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTranslation();
  if ((error as TekoApiError).code === "network") return <OfflineScreen onRetry={onRetry} />;
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t("booking:tarifsIndisponibles.titre")}</Text>
      <Text style={styles.text}>{t("booking:tarifsIndisponibles.texte")}</Text>
      <Button label={t("commun.reessayer")} onPress={onRetry} testID="quote-retry" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.neutral[50],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    textAlign: "center",
    marginBottom: spacing[2],
  },
  text: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[6],
  },
});
