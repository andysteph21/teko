// Carte d'une proposition de repère (C-31) : médaillon ambre (gris si
// refusée), nom, « catégorie · proposé le … », StatusChip et ligne de détail.
// L'état est porté par le LIBELLÉ (StatusChip), la couleur ne fait qu'appuyer.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { LandmarkPinIcon, StatusChip, type StatusChipTone } from "@teko/ui/native";
import type { TableRow } from "@teko/types";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { formatProposalDate } from "./format";
import { isAcceptedProposal } from "./use-my-proposals";

type Proposal = TableRow<"landmark_proposals">;

interface StatusView {
  tone: StatusChipTone;
  labelKey: string;
  detailKey: string | null;
}

function statusView(proposal: Proposal): StatusView {
  if (isAcceptedProposal(proposal.status)) {
    return { tone: "ok", labelKey: "statutAccepte", detailKey: "detailAccepte" };
  }
  if (proposal.status === "proposed") {
    return { tone: "pending", labelKey: "statutValidation", detailKey: "detailValidation" };
  }
  if (proposal.status === "rejected") {
    return { tone: "cancel", labelKey: "statutRefuse", detailKey: "detailRefuse" };
  }
  return { tone: "neutral", labelKey: "statutBrouillon", detailKey: null };
}

export function ProposalCard({ proposal, testID }: { proposal: Proposal; testID?: string }) {
  const { t } = useTranslation();
  const view = statusView(proposal);
  const rejected = proposal.status === "rejected";
  const subtitle = `${t(`places:proposer.categories.${proposal.category}`)} · ${t(
    "places:mesReperes.propose",
    { date: formatProposalDate(proposal.created_at) },
  )}`;

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.head}>
        <View style={[styles.medallion, rejected && styles.medallionMuted]}>
          <LandmarkPinIcon
            size={16}
            color={rejected ? color.neutral[400] : color.map.markerLandmark}
          />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {proposal.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <StatusChip label={t(`places:mesReperes.${view.labelKey}`)} tone={view.tone} />
      </View>
      {view.detailKey ? (
        <Text style={styles.detail}>{t(`places:mesReperes.${view.detailKey}`)}</Text>
      ) : null}
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
    marginBottom: spacing[2] + 2,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  medallion: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.warning.light,
    alignItems: "center",
    justifyContent: "center",
  },
  medallionMuted: { backgroundColor: color.neutral[100] },
  body: { flex: 1 },
  title: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  subtitle: { fontSize: typography.fontSize.xs + 0.5, color: color.neutral[500], marginTop: 1 },
  detail: {
    fontSize: typography.fontSize.xs + 1,
    color: color.neutral[500],
    lineHeight: 18,
    marginTop: spacing[2] + 2,
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: color.neutral[100],
  },
});
