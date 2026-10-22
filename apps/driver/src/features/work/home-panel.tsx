// Bas d'écran D-09 : carte solde (« Teko vous doit » / « Vous devez ») avec
// lien D-15, bandeau de suspension explicite avec lien règlement (D-16),
// bandeau localisation (permission refusée / GPS muet), et barre d'onglets
// de l'app chauffeur.

import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { type LocationIssue, useWorkStore } from "./store";

export function BalanceCard({ balance }: { balance: number | null }) {
  const { t } = useTranslation();
  const router = useRouter();
  if (balance === null) return null;
  const owed = balance >= 0;
  return (
    <View style={styles.card} testID="balance-card">
      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>
          {owed ? t("work:accueil.tekoVousDoit") : t("work:accueil.vousDevez")}
        </Text>
        <Text style={[styles.cardAmount, owed ? styles.amountPos : styles.amountNeg]}>
          {owed ? "+" : ""}
          {formatXaf(balance, "FCFA")}
        </Text>
        <Text style={styles.cardHint}>
          {owed
            ? t("work:accueil.reglementAuto")
            : "Règlement manuel à faire valider par Finance avant 04 h 00"}
        </Text>
      </View>
      <Pressable
        style={styles.details}
        onPress={() => router.push("/(main)/balance" as Href)}
        accessibilityRole="button"
        testID="balance-details"
      >
        <Text style={styles.detailsText}>{t("work:accueil.details")}</Text>
      </Pressable>
    </View>
  );
}

const LOCATION_KEYS: Record<LocationIssue, string> = {
  denied: "refus",
  blocked: "bloquee",
  lost: "introuvable",
};

/** Position manquante (refus, refus définitif, GPS muet) : bandeau explicite
 *  — jamais d'« En ligne » silencieusement sans présence. */
export function LocationBanner() {
  const { t } = useTranslation();
  const issue = useWorkStore((s) => s.locationIssue);
  if (!issue) return null;
  const key = LOCATION_KEYS[issue];
  return (
    <View style={styles.location} testID="location-banner">
      <Text style={styles.locationTitle}>{t(`work:accueil.localisation.${key}.titre`)}</Text>
      <Text style={styles.locationText}>{t(`work:accueil.localisation.${key}.texte`)}</Text>
      {issue === "blocked" ? (
        <Pressable
          style={styles.locationLink}
          onPress={() => void Linking.openSettings()}
          accessibilityRole="button"
          testID="location-settings"
        >
          <Text style={styles.locationLinkText}>{t("work:accueil.localisation.reglages")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** drivers.is_active = false : hors ligne forcé, réversible par règlement. */
export function SuspendedBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.suspended} testID="suspended-banner">
      <Text style={styles.suspendedTitle}>{t("work:accueil.suspenduTitre")}</Text>
      <Text style={styles.suspendedText}>{t("work:accueil.suspenduTexte")}</Text>
      <Pressable
        style={styles.suspendedLink}
        onPress={() => router.push("/(main)/settlement" as Href)}
        accessibilityRole="button"
        testID="suspended-settle"
      >
        <Text style={styles.suspendedLinkText}>{t("work:accueil.suspenduLien")}</Text>
      </Pressable>
    </View>
  );
}

const TABS = [
  { key: "accueil", route: "/(main)/home" },
  { key: "courses", route: "/(main)/history" },
  { key: "solde", route: "/(main)/balance" },
  { key: "profil", route: "/(main)/profile" },
] as const;

function TabIcon({ tab, tint }: { tab: string; tint: string }) {
  const common = { stroke: tint, strokeWidth: 2.2, fill: "none" as const };
  if (tab === "accueil")
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" {...common} />
      </Svg>
    );
  if (tab === "courses")
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M5 16l1.5-5h11L19 16" {...common} />
        <Rect x={4} y={15} width={16} height={4} rx={1.5} {...common} />
        <Circle cx={7.5} cy={19.5} r={1.4} {...common} />
        <Circle cx={16.5} cy={19.5} r={1.4} {...common} />
      </Svg>
    );
  if (tab === "solde")
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Rect x={3} y={7} width={18} height={12} rx={2} {...common} />
        <Circle cx={12} cy={13} r={3} {...common} />
      </Svg>
    );
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.5} r={4} {...common} />
      <Path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" {...common} />
    </Svg>
  );
}

export function HomeTabs({ bottomInset }: { bottomInset: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={[styles.tabs, { paddingBottom: bottomInset + spacing[2] }]}>
      {TABS.map((tab) => {
        const active = tab.key === "accueil";
        const tint = active ? color.role.driver.accentDark : color.neutral[400];
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => {
              if (!active) router.push(tab.route as Href);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            testID={`tab-${tab.key}`}
          >
            <TabIcon tab={tab.key} tint={tint} />
            <Text style={[styles.tabLabel, { color: tint }]}>
              {t(`work:accueil.onglets.${tab.key}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  cardBody: { flex: 1 },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: color.neutral[700],
  },
  cardAmount: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xl,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  amountPos: { color: color.semantic.success.dark },
  amountNeg: { color: color.semantic.warning.dark },
  cardHint: { fontSize: typography.fontSize.xs + 0.5, color: color.neutral[500], marginTop: 1 },
  details: {
    height: 38,
    borderRadius: borderRadius.lg,
    backgroundColor: color.role.driver.accent,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsText: { color: color.neutral[0], fontSize: typography.fontSize.sm, fontWeight: "700" },
  location: {
    backgroundColor: color.semantic.warning.light,
    borderWidth: 1,
    borderColor: color.semantic.warning.default,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: spacing[3],
  },
  locationTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.semantic.warning.dark,
  },
  locationText: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[600],
    marginTop: 2,
    lineHeight: 18,
  },
  locationLink: { marginTop: spacing[2], alignSelf: "flex-start" },
  locationLinkText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "700",
    color: color.semantic.warning.dark,
    textDecorationLine: "underline",
  },
  suspended: {
    backgroundColor: color.semantic.error.light,
    borderWidth: 1,
    borderColor: color.semantic.error.default,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: spacing[3],
  },
  suspendedTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.semantic.error.dark,
  },
  suspendedText: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[600],
    marginTop: 2,
    lineHeight: 18,
  },
  suspendedLink: { marginTop: spacing[2], alignSelf: "flex-start" },
  suspendedLinkText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "700",
    color: color.semantic.error.dark,
    textDecorationLine: "underline",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: color.neutral[0],
    borderTopWidth: 1,
    borderTopColor: color.neutral[200],
    paddingTop: spacing[2],
  },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  tabLabel: { fontSize: 10.5, fontWeight: "600" },
});
