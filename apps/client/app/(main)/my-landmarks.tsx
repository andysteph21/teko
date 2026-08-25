// C-31 Mes repères proposés — compteur d'impact (repères acceptés), liste
// des propositions avec statut (Accepté / En validation / Refusé), état
// vide, CTA « Proposer un nouveau repère ».

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BackIcon, Button, LandmarkPinIcon } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProposalCard } from "../../src/features/places/proposal-card";
import { isAcceptedProposal, useMyProposals } from "../../src/features/places/use-my-proposals";

export default function MyLandmarks() {
  const router = useRouter();
  const { t } = useTranslation();
  const { proposals, loading, error, refetch } = useMyProposals();
  const acceptedCount = proposals.filter((p) => isAcceptedProposal(p.status)).length;

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
        {acceptedCount > 0 ? (
          <View style={styles.impact} testID="my-landmarks-impact">
            <Text style={styles.impactCount}>{acceptedCount}</Text>
            <Text style={styles.impactText}>
              {t("places:mesReperes.impact", { count: acceptedCount })}
            </Text>
          </View>
        ) : null}

        {loading ? <ActivityIndicator color={color.brand[500]} style={styles.spinner} /> : null}

        {error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t("erreurs.generique")}</Text>
            <Button
              label={t("commun.reessayer")}
              variant="secondary"
              onPress={refetch}
              testID="my-landmarks-retry"
            />
          </View>
        ) : null}

        {!loading && !error && proposals.length === 0 ? (
          <View style={styles.empty} testID="my-landmarks-empty">
            <View style={styles.emptyMedallion}>
              <LandmarkPinIcon size={26} />
            </View>
            <Text style={styles.emptyTitle}>{t("places:mesReperes.videTitre")}</Text>
            <Text style={styles.emptyText}>{t("places:mesReperes.videTexte")}</Text>
          </View>
        ) : null}

        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            testID={`proposal-${proposal.id}`}
          />
        ))}

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
  contentInner: { paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[5] },
  impact: {
    backgroundColor: color.brand[50],
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing[4],
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  impactCount: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize["2xl"],
    fontWeight: "900",
    color: color.brand[800],
    fontVariant: ["tabular-nums"],
  },
  impactText: {
    flex: 1,
    fontSize: typography.fontSize.xs + 1.5,
    color: color.neutral[500],
    lineHeight: 18,
  },
  spinner: { marginVertical: spacing[6] },
  empty: { alignItems: "center", gap: spacing[2], paddingVertical: spacing[6] },
  emptyMedallion: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.warning.light,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[1],
  },
  emptyTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[2],
  },
});
