// Cartes du C-15 : encaissement Airtel Money (pulsation, renvoi, échec)
// et espèces (principale ou repli). Fidèles à c15-paiement.html.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";

function CashIcon() {
  return (
    <Svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color.neutral[600]}
      strokeWidth={2}
    >
      <Rect x={3} y={7} width={18} height={12} rx={2} />
      <Circle cx={12} cy={13} r={3} />
    </Svg>
  );
}

function Pulse() {
  return (
    <View style={styles.pulse}>
      <View style={[styles.dot, { backgroundColor: color.brand[100] }]} />
      <View style={[styles.dot, { backgroundColor: color.brand[400] }]} />
      <View style={[styles.dot, { backgroundColor: color.brand[500] }]} />
    </View>
  );
}

export interface AirtelCardProps {
  /** Numéro affiché (session) — null : copie générique « push envoyé ». */
  numero: string | null;
  echec: boolean;
  onRenvoyer: () => void;
  busy?: boolean;
  /** Pas encore de paiement à relancer (encaissement en création). */
  disabled?: boolean;
}

/** Carte Airtel Money — en attente (pulsation + consigne code secret) ou
 *  échec (renvoyer le push ; le repli espèces vit dans la carte voisine). */
export function AirtelCard({
  numero,
  echec,
  onRenvoyer,
  busy = false,
  disabled = false,
}: AirtelCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>AM</Text>
        </View>
        <Text style={styles.headTitle}>{t("payment:paiement.airtel")}</Text>
      </View>
      {echec ? (
        <>
          <Text style={styles.echec}>{t("payment:paiement.echec")}</Text>
          <Text style={styles.body}>{t("payment:paiement.echecTexte")}</Text>
        </>
      ) : (
        <>
          <Pulse />
          <Text style={styles.body}>
            {numero
              ? t("payment:paiement.envoyeeAu", { numero })
              : t("payment:paiement.pushEnvoye")}
            {"\n"}
            {t("payment:paiement.composezCode")}
          </Text>
        </>
      )}
      <View style={styles.resend}>
        <Button
          label={echec ? t("payment:paiement.renvoyerPush") : t("payment:paiement.renvoyer")}
          variant="secondary"
          onPress={onRenvoyer}
          busy={busy}
          disabled={disabled}
          testID="airtel-resend"
        />
      </View>
    </View>
  );
}

/** Carte espèces — repli tappable (mode Airtel) ou consigne principale. */
export function CashCard({
  titre,
  texte,
  onPress,
  testID,
}: {
  titre: string;
  texte: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      style={styles.alt}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      testID={testID}
    >
      <View style={styles.altIcon}>
        <CashIcon />
      </View>
      <View style={styles.altText}>
        <Text style={styles.altTitle}>{titre}</Text>
        <Text style={styles.altSub}>{texte}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderColor: color.brand[500],
    borderRadius: borderRadius.lg,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: spacing[3],
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.error.default,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: color.neutral[0], fontSize: typography.fontSize.xs, fontWeight: "800" },
  headTitle: { fontSize: typography.fontSize.base, fontWeight: "700", color: color.neutral[700] },
  pulse: { flexDirection: "row", gap: 6, marginTop: 2, marginBottom: spacing[2] },
  dot: { width: 8, height: 8, borderRadius: borderRadius.full },
  body: { fontSize: typography.fontSize.sm, lineHeight: 20, color: color.neutral[500] },
  echec: {
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.semantic.error.dark,
    marginBottom: spacing[1],
  },
  resend: { marginTop: spacing[3] },
  alt: {
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  altIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  altText: { flex: 1 },
  altTitle: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[700] },
  altSub: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 1 },
});
