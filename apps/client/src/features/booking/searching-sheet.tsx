// Contenus de la feuille C-12 : recherche en cours (points, prix, annulation
// gratuite) et « aucun chauffeur disponible » (réessai / retour accueil).
// La feuille (BottomPanel) reste posée par l'écran.

import { formatXaf } from "@teko/core";
import type { VehicleCategory } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { Button, PanelTitle } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

export interface SearchingSheetProps {
  category: VehicleCategory;
  price: number | undefined;
  place: string | undefined;
  cancelling: boolean;
  onCancel: () => void;
}

export function SearchingSheetContent(props: SearchingSheetProps) {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.dots}>
        <View style={[styles.dot, { backgroundColor: color.brand[100] }]} />
        <View style={[styles.dot, { backgroundColor: color.brand[400] }]} />
        <View style={[styles.dot, { backgroundColor: color.brand[500] }]} />
      </View>
      <PanelTitle>{t("booking:recherche.titre")}</PanelTitle>
      <Text style={styles.sub}>
        {t(`booking:categories.${props.category}`)}
        {props.price != null ? (
          <Text>
            {" · "}
            <Text style={styles.mono}>{formatXaf(props.price, "FCFA")}</Text>
          </Text>
        ) : null}
        {props.place ? ` · ${props.place}` : null}
      </Text>
      <Text style={styles.avg}>{t("booking:recherche.moyenne")}</Text>
      <Text style={styles.free}>{t("booking:recherche.annulationGratuite")}</Text>
      <Button
        label={t("booking:recherche.annuler")}
        onPress={props.onCancel}
        variant="danger"
        busy={props.cancelling}
        testID="cancel-ride"
      />
    </>
  );
}

export interface NoDriverSheetProps {
  cancelling: boolean;
  onRetry: () => void;
  onHome: () => void;
}

export function NoDriverSheetContent({ cancelling, onRetry, onHome }: NoDriverSheetProps) {
  const { t } = useTranslation();
  return (
    <>
      <PanelTitle>{t("booking:recherche.aucunChauffeur")}</PanelTitle>
      <Text style={styles.avg}>{t("booking:recherche.aucunChauffeurTexte")}</Text>
      <Button label={t("commun.reessayer")} onPress={onRetry} testID="retry-category" />
      <View style={styles.gap} />
      <Button
        label={t("booking:recherche.retourAccueil")}
        onPress={onHome}
        variant="ghost"
        busy={cancelling}
        testID="no-driver-home"
      />
    </>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", gap: spacing[2], marginBottom: spacing[3], alignSelf: "center" },
  dot: { width: 10, height: 10, borderRadius: 9999 },
  sub: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[1],
  },
  mono: {
    fontFamily: typography.fontFamily.mono,
    fontWeight: "700",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  avg: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[400],
    textAlign: "center",
    marginBottom: spacing[4],
  },
  free: {
    fontSize: typography.fontSize.sm,
    color: color.semantic.success.dark,
    backgroundColor: color.semantic.success.light,
    borderRadius: 12,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    textAlign: "center",
    marginBottom: spacing[4],
    alignSelf: "stretch",
  },
  gap: { height: spacing[2] },
});
