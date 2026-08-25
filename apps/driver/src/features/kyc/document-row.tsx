// Ligne de pièce du dossier (D-05) : icône, libellé, état (à fournir /
// ajoutée ✓ / refusée + motif) et action Ajouter / Remplacer.

import { color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { DocumentRowData, KycDocMeta } from "./documents-meta";
import { CheckIcon, DocTypeIcon } from "./icons";

export interface DocumentRowProps {
  meta: KycDocMeta;
  doc?: DocumentRowData;
  uploading?: boolean;
  onAdd: () => void;
}

type RowState = "missing" | "added" | "rejected";

function stateOf(doc?: DocumentRowData): RowState {
  if (!doc) return "missing";
  return doc.status === "rejected" ? "rejected" : "added";
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const ICON_COLORS: Record<RowState, string> = {
  missing: color.neutral[600],
  added: color.semantic.success.dark,
  rejected: color.semantic.error.default,
};

function Subtitle({ meta, doc }: { meta: KycDocMeta; doc?: DocumentRowData }) {
  const { t } = useTranslation();
  const genderKey = meta.feminine ? "F" : "M";
  const state = stateOf(doc);
  if (state === "added" && doc) {
    const label = t(
      doc.status === "validated"
        ? `kyc:statut.valide${genderKey}`
        : `kyc:statut.ajoute${genderKey}`,
    );
    const fileName = doc.storage_path.split("/").pop() ?? "";
    return <Text style={styles.hint}>{`${label} · ${fileName}`}</Text>;
  }
  if (state === "rejected" && doc) {
    const refused = capitalize(t(`kyc:statut.refuse${genderKey}`));
    return (
      <Text style={styles.motif} testID={`doc-${meta.type}-motif`}>
        {doc.note ? `${refused} · ${doc.note}` : refused}
      </Text>
    );
  }
  return <Text style={styles.hint}>{t(`kyc:docsAide.${meta.type}`)}</Text>;
}

function Trailing({ state, uploading }: { state: RowState; uploading: boolean }) {
  const { t } = useTranslation();
  if (uploading) return <ActivityIndicator color={color.role.driver.accent} />;
  if (state === "added") {
    return (
      <View style={styles.check}>
        <CheckIcon />
      </View>
    );
  }
  return (
    <Text style={[styles.action, state === "rejected" && styles.actionRejected]}>
      {t(state === "rejected" ? "kyc:documents.remplacer" : "kyc:documents.ajouter")}
    </Text>
  );
}

export function DocumentRow({ meta, doc, uploading = false, onAdd }: DocumentRowProps) {
  const { t } = useTranslation();
  const state = stateOf(doc);
  const added = state === "added";
  return (
    <Pressable
      onPress={added ? undefined : onAdd}
      disabled={added || uploading}
      accessibilityRole="button"
      testID={`doc-${meta.type}`}
      style={[styles.row, added && styles.rowDone, state === "rejected" && styles.rowRejected]}
    >
      <View
        style={[styles.icon, added && styles.iconDone, state === "rejected" && styles.iconRejected]}
      >
        <DocTypeIcon type={meta.type} color={ICON_COLORS[state]} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{t(`kyc:docs.${meta.type}`)}</Text>
        <Subtitle meta={meta} doc={doc} />
      </View>
      <Trailing state={state} uploading={uploading} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  rowDone: { borderColor: color.semantic.success.default },
  rowRejected: { borderColor: color.semantic.error.default },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  iconDone: { backgroundColor: color.semantic.success.light },
  iconRejected: { backgroundColor: color.semantic.error.light },
  body: { flex: 1 },
  title: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  hint: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 1 },
  motif: { fontSize: typography.fontSize.xs, color: color.semantic.error.dark, marginTop: 1 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    backgroundColor: color.semantic.success.default,
    alignItems: "center",
    justifyContent: "center",
  },
  action: { fontSize: typography.fontSize.sm, fontWeight: "700", color: color.brand[800] },
  actionRejected: { color: color.semantic.error.default },
});
