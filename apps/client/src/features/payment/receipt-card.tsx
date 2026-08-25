// Carte-reçu du C-17 : trajet à deux points, lignes course/chauffeur/
// paiement, total mono et pastille verte. Fidèle à c17-recu.html.

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  categorieLabel,
  dureeMin,
  heureFr,
  kmFr,
  montantCourse,
  refCourte,
} from "./format";
import type { PaymentRow } from "./hooks";

function Check({ size, stroke }: { size: number; stroke: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2.6}>
      <Path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}

function Ligne({ label, valeur, mono }: { label: string; valeur: string; mono?: boolean }) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.ligneLabel}>{label}</Text>
      <Text style={[styles.ligneValeur, mono && styles.mono]}>{valeur}</Text>
    </View>
  );
}

export interface ReceiptCardProps {
  ride: RideRow;
  payment: PaymentRow | null;
  nomChauffeur: string | null;
}

export function ReceiptCard({ ride, payment, nomChauffeur }: ReceiptCardProps) {
  const { t } = useTranslation();
  const montant = formatXaf(montantCourse(ride), "FCFA");
  const depart = ride.origin_hint ?? t("payment:paiement.departDefaut");
  const arrivee = ride.dest_hint ?? t("payment:paiement.arriveeDefaut");
  const airtelOk = ride.payment_method === "airtel" && payment?.status === "success";
  const refPaiement = airtelOk ? (payment.provider_txn_id ?? payment.partner_txn_id) : null;

  return (
    <View style={styles.carte}>
      <View style={styles.route}>
        <View style={styles.dotcol}>
          <View style={[styles.dot, { backgroundColor: color.brand[500] }]} />
          <View style={styles.vline} />
          <View style={[styles.dot, { backgroundColor: color.semantic.warning.default }]} />
        </View>
        <View style={styles.etapes}>
          <Text style={styles.etape}>
            {depart}
            {ride.started_at ? ` · ${heureFr(ride.started_at)}` : ""}
          </Text>
          <Text style={[styles.etape, styles.etapeDerniere]}>
            {arrivee}
            {ride.completed_at ? ` · ${heureFr(ride.completed_at)}` : ""}
          </Text>
        </View>
      </View>

      <Ligne
        label={t("payment:recu.course", {
          categorie: categorieLabel(ride.category),
          duree: dureeMin(ride),
          km: kmFr(Number(ride.distance_est_m ?? 0)),
        })}
        valeur={montant}
        mono
      />
      <Ligne label={t("payment:recu.chauffeur")} valeur={nomChauffeur ?? "—"} />
      <Ligne
        label={t("payment:recu.paiement")}
        valeur={
          airtelOk && refPaiement
            ? `${t("payment:recu.airtel")} · ${refCourte(refPaiement)}`
            : t("payment:recu.especes")
        }
      />

      <View style={styles.total}>
        <Text style={styles.totalLabel}>{t("payment:recu.totalPaye")}</Text>
        <Text style={styles.totalMontant}>{montant}</Text>
      </View>

      <View style={styles.pastille}>
        <Check size={13} stroke={color.semantic.success.dark} />
        <Text style={styles.pastilleTexte}>{t("payment:recu.confirme")}</Text>
      </View>
    </View>
  );
}

export function CheckBadge() {
  return (
    <View style={styles.check}>
      <Check size={30} stroke={color.semantic.success.default} />
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  route: {
    flexDirection: "row",
    gap: spacing[3],
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: color.neutral[200],
    marginBottom: 14,
  },
  dotcol: { alignItems: "center", paddingTop: 5 },
  dot: { width: 8, height: 8, borderRadius: borderRadius.full },
  vline: { width: 2, flex: 1, minHeight: 16, backgroundColor: color.neutral[200], marginVertical: 2 },
  etapes: { flex: 1 },
  etape: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
    marginBottom: 10,
  },
  etapeDerniere: { marginBottom: 0 },
  ligne: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing[2],
    marginVertical: 6,
  },
  ligneLabel: { fontSize: typography.fontSize.sm, color: color.neutral[500], flexShrink: 1 },
  ligneValeur: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[700] },
  mono: { fontVariant: ["tabular-nums"] },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderTopWidth: 1,
    borderTopColor: color.neutral[100],
    marginTop: 10,
    paddingTop: spacing[3],
  },
  totalLabel: { fontSize: typography.fontSize.base, fontWeight: "700", color: color.neutral[700] },
  totalMontant: {
    fontSize: typography.fontSize.xl,
    fontWeight: "900",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  pastille: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    alignSelf: "center",
    backgroundColor: color.semantic.success.light,
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  pastilleTexte: {
    fontSize: typography.fontSize.xs,
    fontWeight: "600",
    color: color.semantic.success.dark,
  },
  check: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.success.light,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing[3],
  },
});
