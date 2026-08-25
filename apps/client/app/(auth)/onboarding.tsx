// C-02 Onboarding — 3 diapositives passables dès la première (repères,
// prix ferme, sobriété data). « Passer » et la fin mènent au numéro.

import { color, spacing, typography } from "@teko/ui";
import { Button, CarIcon, DataBarsIcon, LandmarkPinIcon } from "@teko/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SLIDES = [
  { key: "slide1", icon: <LandmarkPinIcon size={64} /> },
  { key: "slide2", icon: <CarIcon size={64} color={color.brand[800]} /> },
  { key: "slide3", icon: <DataBarsIcon size={64} color={color.brand[500]} /> },
] as const;

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const { t } = useTranslation();
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index] ?? SLIDES[0];

  const next = () => {
    if (last) router.replace("/(auth)/phone");
    else setIndex((i) => i + 1);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        onPress={() => router.replace("/(auth)/phone")}
        style={styles.skip}
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>{t("account:onboarding.passer")}</Text>
      </Pressable>
      <View style={styles.body}>
        <View style={styles.illustration}>{slide.icon}</View>
        <Text style={styles.title}>{t(`account:onboarding.${slide.key}Titre`)}</Text>
        <Text style={styles.text}>{t(`account:onboarding.${slide.key}Texte`)}</Text>
      </View>
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <Button label={t("commun.continuer")} onPress={next} testID="onboarding-next" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing[5], backgroundColor: color.neutral[50] },
  skip: { alignSelf: "flex-end", padding: spacing[2] },
  skipText: { color: color.neutral[500], fontSize: typography.fontSize.base, fontWeight: "600" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[4] },
  illustration: {
    width: 132,
    height: 132,
    borderRadius: 9999,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    textAlign: "center",
  },
  text: {
    fontSize: typography.fontSize.base,
    color: color.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing[4],
  },
  dots: { flexDirection: "row", gap: 8, alignSelf: "center", marginBottom: spacing[5] },
  dot: { width: 8, height: 8, borderRadius: 9999, backgroundColor: color.neutral[200] },
  dotActive: { backgroundColor: color.brand[500], width: 20 },
});
