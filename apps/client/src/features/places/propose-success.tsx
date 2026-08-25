// État de succès C-26 : « En validation — vérifié par l'équipe Teko »,
// puis retour à l'écran précédent.

import { color, spacing, typography } from "@teko/ui";
import { Button, StatusChip } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

export function ProposeSuccess({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <View testID="propose-success">
      <View style={styles.chip}>
        <StatusChip label={t("places:proposer.succesChip")} tone="pending" />
      </View>
      <Text style={styles.title}>{t("places:proposer.succesTitre")}</Text>
      <Text style={styles.text}>{t("places:proposer.succesTexte")}</Text>
      <Button
        label={t("commun.fermer")}
        variant="secondary"
        onPress={onClose}
        testID="propose-close"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: "flex-start", marginTop: spacing[2], marginBottom: spacing[3] },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
    marginBottom: spacing[1],
  },
  text: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    lineHeight: 19,
    marginBottom: spacing[5],
  },
});
