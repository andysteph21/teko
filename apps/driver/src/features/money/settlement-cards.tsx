// Cartes du D-16 — attente Airtel Money (pulsation teal, renvoi), repli
// « pas de solde », règlement manuel (échec — procédure DOC-01), et vue
// succès « Réglé ». Fidèles à d16-reglement.html.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

function Pulse() {
  return (
    <View style={styles.pulse}>
      <View style={[styles.dot, { backgroundColor: color.role.driver.accentLight }]} />
      <View style={[styles.dot, { backgroundColor: color.role.driver.accent }]} />
      <View style={[styles.dot, { backgroundColor: color.role.driver.accentDark }]} />
    </View>
  );
}

export interface AirtelWaitCardProps {
  /** Numéro de versement affiché — null : copie générique. */
  numero: string | null;
  echec: boolean;
  onRenvoyer: () => void;
  busy?: boolean;
}

/** Carte Airtel — en attente (pulsation + consigne code secret) ou échec
 *  (renvoyer la demande ; le règlement manuel vit dans la carte voisine). */
export function AirtelWaitCard({ numero, echec, onRenvoyer, busy = false }: AirtelWaitCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>AM</Text>
        </View>
        <Text style={styles.headTitle}>{t("money:reglement.airtel")}</Text>
      </View>
      {echec ? (
        <>
          <Text style={styles.echec}>{t("money:reglement.echec")}</Text>
          <Text style={styles.body}>{t("money:reglement.echecTexte")}</Text>
        </>
      ) : (
        <>
          <Pulse />
          <Text style={styles.body}>
            {numero
              ? t("money:reglement.envoyeeAu", { numero })
              : t("money:reglement.envoyeeGenerique")}
            {"\n"}
            {t("money:reglement.composez")}
          </Text>
        </>
      )}
      <View style={styles.resend}>
        <Button
          label={t("money:reglement.renvoyer")}
          variant="secondary"
          onPress={onRenvoyer}
          busy={busy}
          testID="settle-resend"
        />
      </View>
    </View>
  );
}

/** Repli opérationnel après échec : règlement manuel avec justificatif
 *  (procédure DOC-01). TODO(backend/DOC-01) : dépôt du justificatif
 *  depuis l'app — hors MVP, la carte explique la marche à suivre. */
export function ManualCard() {
  const { t } = useTranslation();
  return (
    <View style={styles.manual} testID="settle-manual">
      <Text style={styles.manualTitle}>{t("money:reglement.manuelTitre")}</Text>
      <Text style={styles.fallbackText}>{t("money:reglement.manuelTexte")}</Text>
    </View>
  );
}

/** « Pas de solde Airtel Money ? » — le règlement n'est jamais une impasse. */
export function FallbackInfo() {
  const { t } = useTranslation();
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>
        <Text style={styles.fallbackStrong}>{t("money:reglement.pasDeSolde")}</Text>{" "}
        {t("money:reglement.pasDeSoldeTexte")}
      </Text>
    </View>
  );
}

/** Succès — la réactivation backend est automatique ; retour au solde. */
export function SettledView({ onRetour }: { onRetour: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.settled} testID="settle-success">
      <View style={styles.check}>
        <Svg
          width={30}
          height={30}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color.neutral[0]}
          strokeWidth={3}
        >
          <Path d="M5 13l4 4L19 7" />
        </Svg>
      </View>
      <Text style={styles.settledTitle}>{t("money:reglement.succesTitre")}</Text>
      <Text style={styles.settledText}>{t("money:reglement.succesTexte")}</Text>
      <Button
        label={t("money:reglement.retourSolde")}
        accent="driver"
        onPress={onRetour}
        testID="settle-back"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderColor: color.role.driver.accent,
    borderRadius: borderRadius.lg,
    padding: 18,
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
  manual: {
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  manualTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: "700",
    color: color.neutral[700],
    marginBottom: spacing[1],
  },
  fallback: {
    backgroundColor: color.neutral[100],
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: spacing[3],
  },
  fallbackText: { fontSize: typography.fontSize.xs, lineHeight: 19, color: color.neutral[500] },
  fallbackStrong: { color: color.neutral[700], fontWeight: "700" },
  settled: { alignItems: "center", gap: spacing[3], paddingTop: spacing[8] },
  check: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.success.default,
    alignItems: "center",
    justifyContent: "center",
  },
  settledTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.neutral[700],
    textAlign: "center",
  },
  settledText: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[2],
  },
});
