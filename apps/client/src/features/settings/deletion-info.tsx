// C-28 — cartes d'information honnêtes de la suppression de compte :
// ce qui disparaît, ce qui est conservé anonymisé, fenêtre de rétractation.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { ClockIcon, LockIcon, TrashIcon } from "./icons";

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

/** Les deux cartes « supprimé / conservé » + l'encart 30 jours. */
export function DeletionInfo({ graceDate }: { graceDate: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <TrashIcon size={14} color={color.semantic.error.default} strokeWidth={2.4} />
          <Text style={[styles.cardTitle, styles.cardTitleDanger]}>
            {t("account:suppression.supprimeTitre")}
          </Text>
        </View>
        <Bullet>{t("account:suppression.supprime1")}</Bullet>
        <Bullet>{t("account:suppression.supprime2")}</Bullet>
        <Bullet>{t("account:suppression.supprime3")}</Bullet>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <LockIcon size={14} color={color.neutral[600]} strokeWidth={2.4} />
          <Text style={styles.cardTitle}>{t("account:suppression.conserveTitre")}</Text>
        </View>
        <Bullet>{t("account:suppression.conserve1")}</Bullet>
        <Bullet>{t("account:suppression.conserve2")}</Bullet>
      </View>

      <View style={styles.grace}>
        <ClockIcon size={18} color={color.semantic.info.default} />
        <Text style={styles.graceText}>
          <Text style={styles.graceStrong}>{t("account:suppression.graceFort")}</Text>
          {t("account:suppression.graceTexte", { date: graceDate })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  card: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  cardTitle: { fontSize: typography.fontSize.sm, fontWeight: "700", color: color.neutral[600] },
  cardTitleDanger: { color: color.semantic.error.default },
  bullet: { flexDirection: "row", gap: spacing[2], paddingLeft: spacing[1], marginTop: 2 },
  bulletDot: { color: color.neutral[500], fontSize: typography.fontSize.sm },
  bulletText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: 21,
    color: color.neutral[500],
  },
  grace: {
    flexDirection: "row",
    gap: spacing[2],
    backgroundColor: color.semantic.info.light,
    borderLeftWidth: 3,
    borderLeftColor: color.semantic.info.default,
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: 14,
  },
  graceText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: color.neutral[500],
  },
  graceStrong: { fontWeight: "700", color: color.semantic.info.dark },
});
