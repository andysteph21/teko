// Mouvements du jour (D-15) — chaque ligne est une écriture du grand livre
// (append-only) : libellé français par `kind`, heure de Libreville, montant
// signé coloré (rouge débit / vert crédit), chasse fixe.

import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { heureLibreville, type LedgerRow, ledgerKindKey } from "./display";

function LedgerLine({ ligne }: { ligne: LedgerRow }) {
  const { t } = useTranslation();
  const montant = Number(ligne.amount_signed);
  return (
    <View style={styles.line} testID={`ledger-line-${ligne.id}`}>
      <View style={styles.lineText}>
        <Text style={styles.lineLabel}>{t(ledgerKindKey(ligne.kind))}</Text>
        <Text style={styles.lineSub}>{heureLibreville(ligne.created_at)}</Text>
      </View>
      <Text
        style={[styles.lineValue, montant < 0 ? styles.neg : styles.pos]}
        testID={`ledger-amount-${ligne.id}`}
      >
        {formatXaf(montant)}
      </Text>
    </View>
  );
}

/** Carte blanche des mouvements — état vide explicite, jamais un trou. */
export function LedgerCard({ lignes }: { lignes: LedgerRow[] }) {
  const { t } = useTranslation();
  if (lignes.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>{t("money:solde.aucunMouvement")}</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      {lignes.map((ligne, i) => (
        <View key={ligne.id} style={i > 0 ? styles.separated : undefined}>
          <LedgerLine ligne={ligne} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: 11,
  },
  separated: { borderTopWidth: 1, borderTopColor: color.neutral[100] },
  lineText: { flex: 1 },
  lineLabel: { fontSize: typography.fontSize.sm, fontWeight: "500", color: color.neutral[700] },
  lineSub: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 1 },
  lineValue: { fontSize: typography.fontSize.sm, fontWeight: "700", fontVariant: ["tabular-nums"] },
  neg: { color: color.semantic.error.default },
  pos: { color: color.semantic.success.dark },
  empty: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    paddingVertical: spacing[3],
    textAlign: "center",
  },
});
