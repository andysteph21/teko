// Liste des trajets C-19 — sections par jour (À venir / Aujourd'hui / Hier /
// date), lignes RideRow du kit avec puce d'état et montant chasse fixe.

import type { RideRow } from "@teko/types";
import { color, typography } from "@teko/ui";
import { RideRow as RideItemRow, StatusChip } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import {
  dayLabelText,
  rideAmountText,
  rideChip,
  rideHint,
  type RideSection,
  rideTitle,
} from "./ride-display";

export interface HistoryListProps {
  sections: RideSection[];
  now: Date;
  onPressRide: (ride: RideRow) => void;
}

export function HistoryList({ sections, now, onPressRide }: HistoryListProps) {
  const { t } = useTranslation();
  return (
    <View>
      {sections.map((section) => (
        <View key={section.key}>
          <Text style={styles.section}>{dayLabelText(section.label, t)}</Text>
          {section.rides.map((ride) => {
            const chip = rideChip(ride, now);
            return (
              <RideItemRow
                key={ride.id}
                title={
                  rideTitle(ride) ??
                  t("history:liste.course", {
                    categorie: t(`history:categorie.${ride.category}`),
                  })
                }
                hint={rideHint(ride, now, t)}
                amountText={rideAmountText(ride)}
                chip={<StatusChip label={t(chip.labelKey)} tone={chip.tone} />}
                onPress={() => onPressRide(ride)}
                testID={`ride-${ride.id}`}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing.wider,
    color: color.neutral[500],
    marginTop: 12,
    marginBottom: 4,
  },
});
