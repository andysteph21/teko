// Contenu de la feuille C-11 : suggestion en cours / repère suggéré (badge
// « Repère validé », pourquoi) / aucun repère à proximité. La feuille reste
// posée par l'écran (BottomPanel), ici uniquement le contenu.

import { color, spacing, typography } from "@teko/ui";
import { Button, PanelTitle, StatusChip } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import type { MeetingPick } from "./store";

export interface MeetingSheetContentProps {
  pending: boolean;
  suggestion: MeetingPick | null;
  busy: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onKeepPosition: () => void;
}

export function MeetingSheetContent(props: MeetingSheetContentProps) {
  const { t } = useTranslation();
  if (props.pending) {
    return <Text style={styles.loading}>{t("booking:rencontre.recherche")}</Text>;
  }
  if (!props.suggestion) {
    return (
      <>
        <PanelTitle>{t("booking:rencontre.aucunRepere")}</PanelTitle>
        <Text style={styles.why}>{t("booking:rencontre.aucunRepereTexte")}</Text>
        <Button
          label={t("booking:rencontre.commander")}
          onPress={props.onKeepPosition}
          busy={props.busy}
          testID="meeting-order"
        />
        <SheetError message={props.errorMessage} />
      </>
    );
  }
  return (
    <>
      <Text style={styles.eyebrow}>{t("booking:rencontre.eyebrow")}</Text>
      <PanelTitle>{props.suggestion.name}</PanelTitle>
      <View style={styles.meta}>
        <StatusChip label={t("booking:rencontre.reperValide")} tone="ok" />
      </View>
      <Text style={styles.why}>{t("booking:rencontre.pourquoi")}</Text>
      <Button
        label={t("booking:rencontre.confirmer")}
        onPress={props.onConfirm}
        busy={props.busy}
        testID="meeting-confirm"
      />
      <View style={styles.gap} />
      <Button
        label={t("booking:rencontre.garderPosition")}
        onPress={props.onKeepPosition}
        variant="secondary"
        disabled={props.busy}
        testID="meeting-keep-position"
      />
      <SheetError message={props.errorMessage} />
    </>
  );
}

function SheetError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing.wider,
    color: color.neutral[500],
    marginBottom: spacing[1],
  },
  meta: { flexDirection: "row", marginBottom: spacing[3] },
  loading: {
    fontSize: typography.fontSize.base,
    color: color.neutral[500],
    textAlign: "center",
    paddingVertical: spacing[6],
  },
  why: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: color.neutral[500],
    backgroundColor: color.neutral[50],
    borderRadius: 12,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  gap: { height: spacing[2] },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    textAlign: "center",
    marginTop: spacing[3],
  },
});
