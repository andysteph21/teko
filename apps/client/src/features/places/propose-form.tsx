// Formulaire C-26 : nom, catégorie (10 choix), photo optionnelle (inerte —
// TODO téléversement), note de vérification et CTA d'envoi.

import { borderRadius, color, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { LANDMARK_CATEGORY_VALUES, type LandmarkCategory } from "./categories";
import { ChoiceChips } from "./choice-chips";

export interface ProposeFormProps {
  name: string;
  onChangeName: (name: string) => void;
  category: LandmarkCategory | null;
  onSelectCategory: (category: LandmarkCategory) => void;
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
}

export function ProposeForm({
  name,
  onChangeName,
  category,
  onSelectCategory,
  busy,
  error,
  onSubmit,
}: ProposeFormProps) {
  const { t } = useTranslation();
  const categoryOptions = LANDMARK_CATEGORY_VALUES.map((value) => ({
    value,
    label: t(`places:proposer.categories.${value}`),
  }));

  return (
    <>
      <Text style={styles.title}>{t("places:proposer.titre")}</Text>
      <Text style={styles.sub}>{t("places:proposer.sous")}</Text>
      <TextField
        label={t("places:proposer.nomLabel")}
        placeholder={t("places:proposer.nomPlaceholder")}
        value={name}
        onChangeText={onChangeName}
        testID="propose-name"
      />
      <Text style={styles.fieldLabel}>{t("places:proposer.categorieLabel")}</Text>
      <ChoiceChips
        options={categoryOptions}
        selected={category}
        onSelect={onSelectCategory}
        testIDPrefix="propose-cat"
      />
      <View style={styles.photo}>
        <Text style={styles.photoText}>
          {t("places:proposer.photo")}{" "}
          <Text style={styles.photoOptional}>{t("places:proposer.photoOptionnel")}</Text>
        </Text>
      </View>
      <Text style={styles.note}>{t("places:proposer.note")}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={t("places:proposer.cta")}
        onPress={onSubmit}
        busy={busy}
        disabled={name.trim().length < 3 || category === null}
        testID="propose-submit"
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
    marginBottom: 4,
  },
  sub: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginBottom: 16,
    lineHeight: 19,
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
    marginTop: 14,
    marginBottom: 6,
  },
  photo: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: color.neutral[300],
    borderRadius: borderRadius.md,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 12,
  },
  photoText: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  photoOptional: { color: color.neutral[400] },
  note: { fontSize: typography.fontSize.xs + 1, color: color.neutral[500], marginBottom: 14 },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    marginBottom: 12,
  },
});
