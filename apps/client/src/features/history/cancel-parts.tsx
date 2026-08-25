// Morceaux de l'écran d'annulation C-21 : motifs radio et encart de frais.
// Règle produit : l'UI n'affiche JAMAIS la formule des frais, seulement le
// montant (doc 02, addendum 25 août).

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const CANCEL_REASON_KEYS = ["motifLoin", "motifPlans", "motifErreur", "motifAutre"] as const;
export type CancelReasonKey = (typeof CANCEL_REASON_KEYS)[number];

export interface CancelReasonsProps {
  selected: CancelReasonKey | null;
  onSelect: (key: CancelReasonKey) => void;
}

export function CancelReasons({ selected, onSelect }: CancelReasonsProps) {
  const { t } = useTranslation();
  return (
    <View>
      {CANCEL_REASON_KEYS.map((key) => {
        const active = key === selected;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={[styles.option, active ? styles.optionActive : null]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            testID={`reason-${key}`}
          >
            <View style={[styles.radio, active ? styles.radioActive : null]}>
              {active ? <View style={styles.radioDot} /> : null}
            </View>
            <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>
              {t(`history:annulation.${key}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface FeeNoticeProps {
  free: boolean;
  feeText: string;
}

/** Encart C-21 : gratuit avant attribution, sinon montant des frais. */
export function FeeNotice({ free, feeText }: FeeNoticeProps) {
  const { t } = useTranslation();
  if (free) {
    return (
      <View style={[styles.notice, styles.noticeFree]}>
        <Text style={styles.noticeFreeText}>{t("history:annulation.gratuite")}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.notice, styles.noticeFee]}>
      <Text style={styles.noticeFeeText}>
        {t("history:annulation.frais", { montant: feeText })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing[4],
    marginBottom: 10,
  },
  optionActive: { borderColor: color.brand[500], backgroundColor: color.brand[50] },
  optionText: { fontSize: typography.fontSize.base, fontWeight: "500", color: color.neutral[700] },
  optionTextActive: { fontWeight: "600" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: color.neutral[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: color.brand[500] },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[500],
  },
  notice: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: 14,
    marginTop: spacing[1],
    marginBottom: spacing[4],
  },
  noticeFee: {
    backgroundColor: color.semantic.warning.light,
    borderLeftWidth: 3,
    borderLeftColor: color.semantic.warning.default,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  noticeFeeText: {
    fontSize: typography.fontSize.sm + 0.5,
    color: color.neutral[500],
    lineHeight: 20,
  },
  noticeFree: { backgroundColor: color.semantic.success.light },
  noticeFreeText: { fontSize: typography.fontSize.sm + 0.5, color: color.semantic.success.dark },
});
