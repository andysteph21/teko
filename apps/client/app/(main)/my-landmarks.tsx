// C-31 Mes repères proposés — compteur d'impact (repères acceptés), liste
// des propositions avec statut (Accepté / En validation / Refusé), état
// vide, CTA « Proposer un nouveau repère ».

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BackIcon, Button } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MyLandmarksBody } from "../../src/features/places/my-landmarks-body";
import { useMyProposals } from "../../src/features/places/use-my-proposals";

export default function MyLandmarks() {
  const router = useRouter();
  const { t } = useTranslation();
  const { proposals, loading, error, refetch } = useMyProposals();

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={t("places:mesReperes.retour")}
          testID="my-landmarks-back"
        >
          <BackIcon size={18} />
        </Pressable>
        <Text style={styles.h1}>{t("places:mesReperes.titre")}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <MyLandmarksBody proposals={proposals} loading={loading} error={error} onRetry={refetch} />
        <Button
          label={t("places:mesReperes.cta")}
          onPress={() => router.push("/(main)/propose-landmark" as Href)}
          testID="my-landmarks-propose"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  h1: { fontSize: typography.fontSize.lg, fontWeight: "700", color: color.brand[900] },
  content: { flex: 1 },
  contentInner: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[5],
  },
});
