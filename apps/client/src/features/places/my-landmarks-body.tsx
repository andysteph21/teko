// Corps de C-31 : compteur d'impact (repères acceptés), chargement, erreur
// avec réessai, état vide, puis cartes de propositions.

import type { TableRow } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button, LandmarkPinIcon } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ProposalCard } from "./proposal-card";
import { isAcceptedProposal } from "./use-my-proposals";

export interface MyLandmarksBodyProps {
  proposals: TableRow<"landmark_proposals">[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function MyLandmarksBody({ proposals, loading, error, onRetry }: MyLandmarksBodyProps) {
  const { t } = useTranslation();
  const acceptedCount = proposals.filter((p) => isAcceptedProposal(p.status)).length;

  return (
    <>
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
            onPress={onRetry}
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
        <ProposalCard key={proposal.id} proposal={proposal} testID={`proposal-${proposal.id}`} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
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
