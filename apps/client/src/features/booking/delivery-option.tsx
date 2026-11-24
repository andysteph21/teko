// Option « Envoyer un colis » de l'accueil (R5), sous les options de course.
// Service fermé : la rangée cède la place à « Service bientôt disponible ».

import { color, spacing, typography } from "@teko/ui";
import { LandmarkRow, MotoIcon } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";
import { useDeliveryEntry } from "./use-delivery-entry";

export function DeliveryOption() {
  const { t } = useTranslation();
  const { state, open } = useDeliveryEntry();
  if (state === "closed") {
    return (
      <Text style={styles.closed} accessibilityRole="alert" testID="home-delivery-closed">
        {t("booking:livraison.bientot")}
      </Text>
    );
  }
  return (
    <LandmarkRow
      title={t("booking:livraison.option")}
      subtitle={state === "checking" ? t("commun.chargement") : t("booking:livraison.optionSous")}
      icon={<MotoIcon />}
      iconBackground={color.neutral[100]}
      onPress={() => void open()}
      testID="home-delivery"
    />
  );
}

const styles = StyleSheet.create({
  closed: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    paddingVertical: spacing[3],
  },
});
