// Liste d'état du dossier (D-08/D-08b) : une ligne par pièce + le numéro
// Airtel Money — l'état est porté par le libellé, la couleur l'appuie.

import { color, spacing, typography } from "@teko/ui";
import { StyleSheet, Text, View } from "react-native";
import type { DocumentRowData, KycDocMeta } from "./documents-meta";
import { CheckIcon, ClockIcon, CrossIcon } from "./icons";

export type StatusTone = "ok" | "wait" | "bad" | "todo";

export interface StatusLineInfo {
  key: string;
  label: string;
  tone: StatusTone;
  stateLabel: string;
}

type Translate = (key: string) => string;

/** Ligne d'état d'une pièce selon son statut backend. */
export function docStatusLine(
  meta: KycDocMeta,
  doc: DocumentRowData | undefined,
  t: Translate,
): StatusLineInfo {
  const genderKey = meta.feminine ? "F" : "M";
  const label = t(`kyc:docs.${meta.type}`);
  if (!doc) return { key: meta.type, label, tone: "todo", stateLabel: t("kyc:statut.aFournir") };
  if (doc.status === "validated")
    return { key: meta.type, label, tone: "ok", stateLabel: t(`kyc:statut.valide${genderKey}`) };
  if (doc.status === "rejected")
    return { key: meta.type, label, tone: "bad", stateLabel: t("kyc:statut.aRemplacer") };
  return { key: meta.type, label, tone: "wait", stateLabel: t("kyc:statut.enCours") };
}

const DOT_BG: Record<StatusTone, string> = {
  ok: color.semantic.success.light,
  wait: color.semantic.warning.light,
  bad: color.semantic.error.light,
  todo: color.neutral[100],
};

const STATE_COLOR: Record<StatusTone, string> = {
  ok: color.semantic.success.dark,
  wait: color.semantic.warning.dark,
  bad: color.semantic.error.default,
  todo: color.neutral[500],
};

function Dot({ tone }: { tone: StatusTone }) {
  return (
    <View style={[styles.dot, { backgroundColor: DOT_BG[tone] }]}>
      {tone === "ok" ? (
        <CheckIcon size={12} color={color.semantic.success.dark} />
      ) : tone === "bad" ? (
        <CrossIcon />
      ) : (
        <ClockIcon color={tone === "todo" ? color.neutral[500] : color.semantic.warning.dark} />
      )}
    </View>
  );
}

export function StatusLines({ lines }: { lines: readonly StatusLineInfo[] }) {
  return (
    <View style={styles.card} testID="status-lines">
      {lines.map((line, i) => (
        <View key={line.key} style={[styles.line, i > 0 && styles.lineBorder]}>
          <Dot tone={line.tone} />
          <Text style={styles.label}>{line.label}</Text>
          <Text
            style={[styles.state, { color: STATE_COLOR[line.tone] }]}
            testID={`status-${line.key}`}
          >
            {line.stateLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: 16,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  lineBorder: { borderTopWidth: 1, borderTopColor: color.neutral[100] },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: typography.fontSize.sm, color: color.neutral[700] },
  state: { marginLeft: "auto", fontSize: typography.fontSize.xs, fontWeight: "700" },
});
