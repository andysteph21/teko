// Contenu du panneau bas C-09 : eyebrow « Destination », libellé du repère
// choisi, puces-préfixes (Derrière / En face de / À côté de), indication
// libre et CTA Continuer.

import { color, spacing, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { ChoiceChips } from "./choice-chips";
import { activeHintPrefix, applyHintPrefix } from "./format";

export interface RefinePanelProps {
  label: string;
  hint: string;
  onChangeHint: (hint: string) => void;
  onContinue: () => void;
}

export function RefinePanel({ label, hint, onChangeHint, onContinue }: RefinePanelProps) {
  const { t } = useTranslation();
  const prefixes = [
    t("places:affinage.chipDerriere"),
    t("places:affinage.chipEnFace"),
    t("places:affinage.chipACote"),
  ];

  return (
    <>
      <Text style={styles.eyebrow}>{t("places:affinage.eyebrow")}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {label}
      </Text>
      <View style={styles.chips}>
        <ChoiceChips
          options={prefixes.map((p) => ({ value: p, label: p }))}
          selected={activeHintPrefix(hint, prefixes)}
          onSelect={(prefix) => onChangeHint(applyHintPrefix(hint, prefix, prefixes))}
          testIDPrefix="refine-chip"
        />
      </View>
      <TextField
        label={t("places:affinage.indicationLabel")}
        placeholder={t("places:affinage.indicationPlaceholder")}
        value={hint}
        onChangeText={onChangeHint}
        testID="refine-hint"
      />
      <View style={styles.ctaSpace} />
      <Button label={t("commun.continuer")} onPress={onContinue} testID="refine-continue" />
    </>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
    marginBottom: spacing[1],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
    marginBottom: 14,
  },
  chips: { marginBottom: spacing[3] },
  ctaSpace: { height: spacing[4] },
});
