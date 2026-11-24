// Nature de la proposition D-10 : covoiturage à la place (places demandées,
// places déjà prises quand l'offre arrive pendant un trajet — lot R4) ou
// livraison (taille du colis, JAMAIS le destinataire — lot R5). Rien pour
// une course classique.

import type { OfferDetails } from "@teko/api-client";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

/** Places au plus dans le véhicule en covoiturage (règle du service). */
export const SHARED_MAX_SEATS = 3;

type OfferKind = Pick<
  OfferDetails,
  "category" | "serviceType" | "parcelSize" | "seats" | "sharedSeatsTaken"
>;

export function isDeliveryOffer(offer: Pick<OfferDetails, "serviceType">): boolean {
  return offer.serviceType === "delivery";
}

function Tag({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <View style={[styles.tag, strong && styles.tagStrong]}>
      <Text style={[styles.tagText, strong && styles.tagTextStrong]}>{label}</Text>
    </View>
  );
}

export function OfferService({ offer }: { offer: OfferKind }) {
  const { t } = useTranslation();
  if (isDeliveryOffer(offer)) {
    return (
      <View style={styles.row} testID="offer-service">
        <Tag label={t("work:offre.livraison")} strong />
        {offer.parcelSize ? (
          <Tag label={t("work:offre.colis", { taille: t(`work:tailles.${offer.parcelSize}`) })} />
        ) : null}
      </View>
    );
  }
  if (offer.category !== "covoiturage") return null;
  const taken = offer.sharedSeatsTaken ?? 0;
  return (
    <View style={styles.row} testID="offer-service">
      <Tag label={t("work:offre.covoiturage")} strong />
      <Tag label={t("work:offre.places", { count: offer.seats ?? 1 })} />
      {taken > 0 ? (
        <Tag label={t("work:offre.placesPrises", { count: taken, max: SHARED_MAX_SEATS })} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], marginBottom: spacing[3] },
  tag: {
    backgroundColor: color.neutral[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  tagStrong: { backgroundColor: color.role.driver.accentLight },
  tagText: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[700] },
  tagTextStrong: { color: color.role.driver.accentDark },
});
