// Fournisseurs de versement (D-07) : Airtel Money sélectionné, Moov Money
// grisé « Bientôt » (une seule option au MVP — la radio est décorative).

import { color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

export function PayoutProviders() {
  const { t } = useTranslation();
  return (
    <View style={styles.list}>
      <View style={[styles.provider, styles.providerOn]} testID="provider-airtel">
        <View style={styles.logoAirtel}>
          <Text style={styles.logoText}>AM</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name}>{t("kyc:versements.airtel")}</Text>
          <Text style={styles.sub}>{t("kyc:versements.airtelSub")}</Text>
        </View>
        <View style={styles.radioOn}>
          <View style={styles.radioDot} />
        </View>
      </View>
      <View style={[styles.provider, styles.providerOff]} testID="provider-moov">
        <View style={styles.logoMoov}>
          <Text style={styles.logoMoovText}>MM</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name}>{t("kyc:versements.moov")}</Text>
          <Text style={styles.sub}>{t("kyc:versements.moovSub")}</Text>
        </View>
        <View style={styles.soon}>
          <Text style={styles.soonText}>{t("kyc:versements.bientot")}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  provider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
  },
  providerOn: { borderColor: color.brand[500] },
  providerOff: { borderColor: color.neutral[200], opacity: 0.55 },
  logoAirtel: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: color.semantic.error.default,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: color.neutral[0], fontSize: typography.fontSize.xs, fontWeight: "800" },
  logoMoov: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  logoMoovText: { color: color.neutral[500], fontSize: typography.fontSize.xs, fontWeight: "800" },
  body: { flex: 1 },
  name: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  sub: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 1 },
  radioOn: {
    width: 20,
    height: 20,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: color.brand[500],
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: color.brand[500] },
  soon: {
    borderRadius: 9999,
    backgroundColor: color.neutral[100],
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  soonText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: color.neutral[500],
  },
});
