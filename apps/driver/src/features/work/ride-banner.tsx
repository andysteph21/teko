// Bannière haute des écrans course — sombre #1E1E30 (D-11/D-13) avec pavé
// teal, teal foncé pleine largeur à l'arrivée (D-11b). L'indication C-09 du
// client (« portail bleu ») y voyage telle quelle.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export type BannerStatus = "accepted" | "enroute" | "arrived" | "started";

export interface RideBannerProps {
  status: BannerStatus;
  originHint: string | null;
  destHint: string | null;
  topInset: number;
}

function ArrowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 20V6M6 12l6-6 6 6"
        stroke={color.neutral[0]}
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M4.5 12.5l5 5 10-11"
        stroke={color.neutral[0]}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function RideBanner({ status, originHint, destHint, topInset }: RideBannerProps) {
  const { t } = useTranslation();

  if (status === "arrived") {
    return (
      <View style={[styles.banner, styles.arrived, { paddingTop: topInset + spacing[4] }]}>
        <CheckIcon />
        <View style={styles.body}>
          <Text style={styles.title}>{t("work:course.arriveTitre")}</Text>
          <Text style={styles.subArrived}>{t("work:course.arriveTexte")}</Text>
        </View>
      </View>
    );
  }

  const started = status === "started";
  const hint = started ? destHint : originHint;
  return (
    <View style={[styles.banner, styles.dark, { paddingTop: topInset + spacing[4] }]}>
      <View style={styles.pad}>
        <ArrowIcon />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>
          {started ? t("work:course.versDestination") : t("work:course.versPassager")}
        </Text>
        {hint ? (
          <Text style={styles.sub} testID="banner-hint">
            {`« ${hint} »`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dark: { backgroundColor: color.neutral[800] },
  arrived: { backgroundColor: color.role.driver.accentDark, gap: spacing[3] },
  pad: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: color.role.driver.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  title: {
    color: color.neutral[0],
    fontSize: typography.fontSize.md - 1,
    fontWeight: "700",
    lineHeight: 22,
  },
  sub: { color: "#A29EBC", fontSize: typography.fontSize.xs + 1, marginTop: 2 },
  subArrived: {
    color: color.role.driver.accentLight,
    fontSize: typography.fontSize.xs + 1,
    marginTop: 2,
  },
});
