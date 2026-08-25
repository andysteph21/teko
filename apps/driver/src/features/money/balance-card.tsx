// Carte de solde D-15 — QUATRE états visuels (doc parcours I) : créditeur
// vert « Teko vous doit », débiteur neutre (échéance lointaine), urgence
// rouge (< 4 h, compte à rebours + règlement à un tap — état maquetté),
// suspendu (bloquant mais réversible : montant dû + CTA, jamais un écran
// mort). Montants signés via formatXaf (« − » typographique).

import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { BalanceState } from "./display";
import { formatCountdown } from "./display";

function ClockIcon({ stroke }: { stroke: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2.4}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 3" />
    </Svg>
  );
}

interface StateStyle {
  border: string;
  labelColor: string;
  amountColor: string;
  labelKey: string;
  texteKey: string;
}

const STATE_STYLES: Record<BalanceState, StateStyle> = {
  crediteur: {
    border: color.semantic.success.default,
    labelColor: color.semantic.success.dark,
    amountColor: color.semantic.success.dark,
    labelKey: "money:solde.crediteur",
    texteKey: "money:solde.crediteurTexte",
  },
  debiteur: {
    border: color.neutral[200],
    labelColor: color.neutral[500],
    amountColor: color.neutral[700],
    labelKey: "money:solde.debiteur",
    texteKey: "money:solde.pourquoi",
  },
  urgence: {
    border: color.semantic.error.default,
    labelColor: color.semantic.error.dark,
    amountColor: color.semantic.error.default,
    labelKey: "money:solde.debiteur",
    texteKey: "money:solde.pourquoi",
  },
  suspendu: {
    border: color.semantic.error.default,
    labelColor: color.semantic.error.dark,
    amountColor: color.semantic.error.default,
    labelKey: "money:solde.suspendu",
    texteKey: "money:solde.suspenduTexte",
  },
};

function DeadlineChip({ etat, msRestant }: { etat: BalanceState; msRestant: number }) {
  const { t } = useTranslation();
  const urgent = etat === "urgence" || etat === "suspendu";
  const fg = urgent ? color.semantic.error.dark : color.neutral[600];
  return (
    <View style={[styles.deadline, urgent ? styles.deadlineUrgent : styles.deadlineNeutre]}>
      <ClockIcon stroke={urgent ? color.semantic.error.default : color.neutral[500]} />
      <Text style={[styles.deadlineText, { color: fg }]} testID="balance-countdown">
        {t(urgent ? "money:solde.urgenceCloture" : "money:solde.cloture")}{" "}
        <Text style={styles.mono}>{formatCountdown(msRestant)}</Text>
      </Text>
    </View>
  );
}

export interface BalanceCardProps {
  etat: BalanceState;
  montantXaf: number;
  msRestant: number;
  onRegler: () => void;
}

/** La couleur appuie l'état, le libellé le porte ; le CTA de règlement est
 *  présent dans tous les états débiteurs (à un tap), jamais en créditeur. */
export function BalanceCard({ etat, montantXaf, msRestant, onRegler }: BalanceCardProps) {
  const { t } = useTranslation();
  const s = STATE_STYLES[etat];
  const debiteur = etat !== "crediteur";
  return (
    <View style={[styles.card, { borderColor: s.border }]} testID={`balance-card-${etat}`}>
      <Text style={[styles.label, { color: s.labelColor }]}>{t(s.labelKey)}</Text>
      <Text style={[styles.amount, { color: s.amountColor }]} testID="balance-amount">
        {formatXaf(montantXaf, "FCFA")}
      </Text>
      {debiteur ? <DeadlineChip etat={etat} msRestant={msRestant} /> : null}
      {debiteur ? (
        <Button
          label={t("money:solde.regler")}
          variant={etat === "debiteur" ? "primary" : "danger"}
          accent="driver"
          onPress={onRegler}
          testID="settle-cta"
        />
      ) : null}
      <Text style={styles.why}>{t(s.texteKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderRadius: borderRadius.xl,
    padding: 18,
    marginBottom: spacing[3],
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing[1],
  },
  amount: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    marginBottom: spacing[2],
  },
  deadline: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    marginBottom: spacing[3],
  },
  deadlineUrgent: { backgroundColor: color.semantic.error.light },
  deadlineNeutre: { backgroundColor: color.neutral[100] },
  deadlineText: { fontSize: typography.fontSize.sm, fontWeight: "600", flex: 1 },
  mono: { fontVariant: ["tabular-nums"], fontWeight: "900" },
  why: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[500],
    lineHeight: 17,
    textAlign: "center",
    marginTop: spacing[2],
  },
});
