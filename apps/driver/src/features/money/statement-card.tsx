// Carte de relevé quotidien (D-17) — titre du jour, puce d'état (open «
// En cours », settled « Réglée », overdue « En retard », paid_out « Versée »),
// net en tête et lignes ouverture / clôture / commission / crédits Airtel /
// versement formatées via formatXaf.

import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { StatusChip } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { jourTitre, type StatementRow, statementChip, statementNet } from "./display";

function Ligne({ labelKey, montant }: { labelKey: string; montant: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.ligne}>
      <Text style={styles.ligneLabel}>{t(labelKey)}</Text>
      <Text style={styles.ligneValeur}>{formatXaf(montant)}</Text>
    </View>
  );
}

export interface StatementCardProps {
  releve: StatementRow;
  aujourdhuiIso: string;
}

export function StatementCard({ releve, aujourdhuiIso }: StatementCardProps) {
  const { t } = useTranslation();
  const chip = statementChip(releve.status);
  const net = statementNet(releve);
  return (
    <View style={styles.card} testID={`statement-${releve.business_day}`}>
      <View style={styles.head}>
        <Text style={styles.titre}>{jourTitre(releve.business_day, aujourdhuiIso)}</Text>
        <Text
          style={[styles.net, net < 0 && styles.netNegatif]}
          testID={`statement-net-${releve.business_day}`}
        >
          {net > 0 ? `+${formatXaf(net)}` : formatXaf(net)}
        </Text>
      </View>
      <View style={styles.lignes}>
        <Ligne labelKey="money:gains.ouverture" montant={Number(releve.opening)} />
        <Ligne labelKey="money:gains.cloture" montant={Number(releve.closing)} />
        <Ligne labelKey="money:gains.commission" montant={Number(releve.total_commission)} />
        <Ligne labelKey="money:gains.creditsAirtel" montant={Number(releve.total_mobile_credit)} />
        {releve.payout_amount !== null ? (
          <Ligne labelKey="money:gains.versement" montant={Number(releve.payout_amount)} />
        ) : null}
      </View>
      <StatusChip label={t(chip.labelKey)} tone={chip.tone} />
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
    paddingVertical: 14,
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  head: { flexDirection: "row", alignItems: "center" },
  titre: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: "700",
    color: color.neutral[700],
  },
  net: {
    fontSize: typography.fontSize.base,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    color: color.semantic.success.dark,
  },
  netNegatif: { color: color.semantic.error.default },
  lignes: { gap: 4 },
  ligne: { flexDirection: "row", alignItems: "center" },
  ligneLabel: { flex: 1, fontSize: typography.fontSize.xs, color: color.neutral[500] },
  ligneValeur: {
    fontSize: typography.fontSize.xs,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: color.neutral[700],
  },
});
