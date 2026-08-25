// D-02 Onboarding chauffeur — la promesse d'abord : « vos gains, réglés
// chaque jour » (carte solde de démonstration), puis guidage par repères et
// liberté d'horaires. « Passer » et la fin mènent au numéro (D-03).

import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { Button, LandmarkPinIcon } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClockIcon } from "../../src/features/kyc/icons";

/** Carte de démonstration du solde du jour — l'illustration de la diapo 1. */
function DemoEarningsCard() {
  const { t } = useTranslation();
  return (
    <View style={styles.demoCard}>
      <Text style={styles.demoLabel}>{t("kyc:onboarding.demoSolde")}</Text>
      <Text style={styles.demoAmount}>{`+${formatXaf(12_500, "FCFA")}`}</Text>
      <View style={styles.demoLine}>
        <Text style={styles.demoLineLabel}>{t("kyc:onboarding.demoCourses")}</Text>
        <Text style={styles.demoLineValue}>{formatXaf(15_300, "FCFA")}</Text>
      </View>
      <View style={styles.demoLine}>
        <Text style={styles.demoLineLabel}>{t("kyc:onboarding.demoCommission")}</Text>
        <Text style={styles.demoLineValue}>{formatXaf(-2_800, "FCFA")}</Text>
      </View>
      <View style={styles.demoButton}>
        <Text style={styles.demoButtonText}>{t("kyc:onboarding.demoVersement")}</Text>
      </View>
    </View>
  );
}

const SLIDES = [
  { key: "slide1", art: <DemoEarningsCard /> },
  { key: "slide2", art: <LandmarkPinIcon size={64} /> },
  { key: "slide3", art: <ClockIcon size={64} color={color.role.driver.accent} strokeWidth={2} /> },
] as const;

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const { t } = useTranslation();
  const slide = SLIDES[index] ?? SLIDES[0];

  const next = () => {
    if (index === SLIDES.length - 1) router.replace("/(auth)/phone" as Href);
    else setIndex((i) => i + 1);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        onPress={() => router.replace("/(auth)/phone" as Href)}
        style={styles.skip}
        accessibilityRole="button"
        testID="onboarding-skip"
      >
        <Text style={styles.skipText}>{t("kyc:onboarding.passer")}</Text>
      </Pressable>
      <View style={styles.art}>
        {index === 0 ? slide.art : <View style={styles.iconCircle}>{slide.art}</View>}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{t(`kyc:onboarding.${slide.key}Titre`)}</Text>
        <Text style={styles.text}>{t(`kyc:onboarding.${slide.key}Texte`)}</Text>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
        <Button label={t("kyc:onboarding.cta")} onPress={next} testID="onboarding-next" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing[5], backgroundColor: color.neutral[50] },
  skip: { alignSelf: "flex-end", padding: spacing[2] },
  skipText: { color: color.neutral[500], fontSize: typography.fontSize.base, fontWeight: "600" },
  art: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconCircle: {
    width: 132,
    height: 132,
    borderRadius: 9999,
    backgroundColor: color.role.driver.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { alignItems: "center", paddingBottom: spacing[4] },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    textAlign: "center",
    marginBottom: spacing[2],
  },
  text: {
    fontSize: typography.fontSize.base,
    color: color.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: spacing[6],
  },
  dots: { flexDirection: "row", gap: 8, marginBottom: spacing[6] },
  dot: { width: 8, height: 8, borderRadius: 9999, backgroundColor: color.neutral[200] },
  dotOn: { width: 24, backgroundColor: color.role.driver.accent },
  demoCard: {
    width: 270,
    backgroundColor: color.neutral[0],
    borderRadius: 20,
    padding: spacing[5],
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  demoLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
    marginBottom: 4,
  },
  demoAmount: {
    fontFamily: typography.fontFamily.mono,
    fontVariant: ["tabular-nums"],
    fontSize: typography.fontSize["2xl"],
    fontWeight: "900",
    color: color.semantic.success.dark,
    marginBottom: 10,
  },
  demoLine: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  demoLineLabel: { fontSize: typography.fontSize.xs, color: color.neutral[500] },
  demoLineValue: {
    fontFamily: typography.fontFamily.mono,
    fontVariant: ["tabular-nums"],
    fontSize: typography.fontSize.xs,
    fontWeight: "600",
    color: color.neutral[700],
  },
  demoButton: {
    marginTop: 12,
    height: 40,
    borderRadius: 16,
    backgroundColor: color.role.driver.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  demoButtonText: { color: color.neutral[0], fontSize: typography.fontSize.sm, fontWeight: "700" },
});
