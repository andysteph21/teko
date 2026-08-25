// En-têtes du parcours I : bandeau teal identité chauffeur (D-15/D-17,
// fond color.role.driver.accent, texte blanc) et nav retour (D-16 —
// rond 40 neutre + titre 20/700 encre de marque, comme les maquettes).

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BackIcon } from "@teko/ui/native";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface TealHeaderProps {
  title: string;
  subtitle?: string;
  /** Rangée de stats (D-17) sous le titre. */
  children?: ReactNode;
}

export function TealHeader({ title, subtitle, children }: TealHeaderProps) {
  return (
    <View style={styles.teal}>
      <Text style={styles.tealTitle}>{title}</Text>
      {subtitle ? <Text style={styles.tealSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function NavHeader({ title }: { title: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <View style={styles.nav}>
      <Pressable
        onPress={() => router.back()}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel={t("money:entete.retour")}
        testID="nav-back"
      >
        <BackIcon size={18} />
      </Pressable>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  teal: {
    backgroundColor: color.role.driver.accent,
    paddingHorizontal: spacing[5],
    paddingTop: 22,
    paddingBottom: 18,
  },
  tealTitle: { fontSize: typography.fontSize.lg, fontWeight: "700", color: color.neutral[0] },
  tealSubtitle: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[0],
    opacity: 0.85,
    marginTop: 2,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
  },
});
