// En-tête des écrans du quotidien (maquettes C-18→C-22) : bouton retour
// rond 40 sur fond neutre + titre 20/700 encre de marque, élément de
// droite optionnel (puce d'état du détail C-20).

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BackIcon } from "@teko/ui/native";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface ScreenHeaderProps {
  title: string;
  trailing?: ReactNode;
}

export function ScreenHeader({ title, trailing }: ScreenHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <View style={styles.nav}>
      <Pressable
        onPress={() => router.back()}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel={t("history:entete.retour")}
        testID="nav-back"
      >
        <BackIcon size={18} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
  },
  trailing: { marginLeft: "auto" },
});
