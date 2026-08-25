// Carte de pièce refusée (D-08b) : libellé, motif admin VERBATIM entre
// guillemets, bouton « Remplacer la photo » qui relance le picker pour CE
// type de pièce uniquement.

import { color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { DocumentRowData, KycDocMeta } from "./documents-meta";
import { CameraIcon } from "./icons";

export interface RejectedDocCardProps {
  meta: KycDocMeta;
  doc: DocumentRowData;
  replacing: boolean;
  onReplace: () => void;
}

export function RejectedDocCard({ meta, doc, replacing, onReplace }: RejectedDocCardProps) {
  const { t } = useTranslation();
  const accord = t(`kyc:statut.refuse${meta.feminine ? "F" : "M"}`);
  return (
    <View style={styles.card} testID={`rejected-${meta.type}`}>
      <Text style={styles.title}>
        {t("kyc:verification.refuseLigne", { doc: t(`kyc:docs.${meta.type}`), accord })}
      </Text>
      {doc.note ? (
        <Text style={styles.motif} testID={`rejected-${meta.type}-motif`}>
          {t("kyc:verification.motif", { note: doc.note })}
        </Text>
      ) : null}
      <Pressable
        onPress={onReplace}
        disabled={replacing}
        accessibilityRole="button"
        accessibilityState={{ disabled: replacing }}
        testID={`replace-${meta.type}`}
        style={({ pressed }) => [styles.replace, pressed && styles.replacePressed]}
      >
        {replacing ? (
          <ActivityIndicator color={color.neutral[0]} />
        ) : (
          <>
            <CameraIcon size={16} />
            <Text style={styles.replaceLabel}>{t("kyc:verification.remplacerPhoto")}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: color.semantic.error.light,
    borderWidth: 1.5,
    borderColor: color.semantic.error.default,
    borderRadius: 16,
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.semantic.error.dark,
  },
  motif: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: color.neutral[600],
  },
  replace: {
    height: 44,
    borderRadius: 20,
    backgroundColor: color.semantic.error.default,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  replacePressed: { opacity: 0.88 },
  replaceLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.neutral[0],
  },
});
