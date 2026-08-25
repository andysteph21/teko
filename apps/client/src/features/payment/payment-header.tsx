// En-tête du C-15 : sur-titre « Arrivée · … », titre, montant énorme en
// chasse fixe (le prix qui fait foi) et rappel du trajet.

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { categorieLabel, dureeMin, montantCourse } from "./format";

export function PaymentHeader({ ride }: { ride: RideRow }) {
  const { t } = useTranslation();
  const depart = ride.origin_hint ?? t("payment:paiement.departDefaut");
  const arrivee = ride.dest_hint ?? t("payment:paiement.arriveeDefaut");
  const eyebrow = ride.dest_hint
    ? `${t("payment:paiement.arrivee")} · ${ride.dest_hint}`
    : t("payment:paiement.arrivee");

  return (
    <View style={styles.entete}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.titre}>{t("payment:paiement.titre")}</Text>
      <Text style={styles.montant} testID="payment-amount">
        {formatXaf(montantCourse(ride), "FCFA")}
      </Text>
      <Text style={styles.trajet}>
        {t("payment:paiement.trajet", {
          categorie: categorieLabel(ride.category),
          depart,
          arrivee,
          duree: dureeMin(ride),
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  entete: { alignItems: "center" },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
    marginBottom: 6,
  },
  titre: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: color.brand[900],
    marginBottom: 18,
  },
  montant: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: "900",
    letterSpacing: -0.3,
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
    marginBottom: spacing[1],
  },
  trajet: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: 26,
  },
});
