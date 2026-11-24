// Liste des passagers du covoiturage en tête de la feuille de course (lot
// R4) : pour chacun, ses places et l'action suivante. Toucher un passager
// affiche SA course — arrivée, code, fin et encaissement se font un passager
// à la fois. Rappel permanent de la règle du service.

import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SHARED_MAX_SEATS } from "./offer-service";
import { passengerAction, type SharedPassenger } from "./shared-rides";
import type { SharedRides } from "./use-shared-rides";

function PassengerRow(props: { passenger: SharedPassenger; onSelect: (rideId: string) => void }) {
  const { passenger, onSelect } = props;
  const { t } = useTranslation();
  return (
    <Pressable
      style={[styles.row, passenger.current && styles.rowCurrent]}
      disabled={passenger.current}
      onPress={() => onSelect(passenger.rideId)}
      accessibilityRole="button"
      accessibilityState={{ selected: passenger.current }}
      testID={`shared-pax-${passenger.rideId}`}
    >
      <View style={styles.body}>
        <Text style={styles.name}>
          {`${t("work:covoit.passager", { n: passenger.number })} · ${t("work:covoit.places", {
            count: passenger.seats,
          })}`}
        </Text>
        <Text style={styles.action}>
          {t(`work:covoit.${passengerAction(passenger.status)}`, {
            montant: formatXaf(passenger.amount, "FCFA"),
          })}
        </Text>
      </View>
      <Text style={[styles.go, passenger.current && styles.goCurrent]}>
        {t(passenger.current ? "work:covoit.affiche" : "work:covoit.voir")}
      </Text>
    </Pressable>
  );
}

export interface SharedPassengersProps {
  shared: SharedRides;
  onSelect: (rideId: string) => void;
}

export function SharedPassengers({ shared, onSelect }: SharedPassengersProps) {
  const { t } = useTranslation();
  if (!shared.shared) return null;
  return (
    <View style={styles.section} testID="shared-passengers">
      <Text style={styles.title} testID="shared-seats">
        {t("work:covoit.titre", { pris: shared.seatsTaken, max: SHARED_MAX_SEATS })}
      </Text>
      {shared.passengers.map((passenger) => (
        <PassengerRow key={passenger.rideId} passenger={passenger} onSelect={onSelect} />
      ))}
      <Text style={styles.rule} testID="shared-rule">
        {t("work:covoit.regle")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing[3], gap: spacing[2] },
  title: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: color.neutral[500],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    minHeight: spacing[12],
    backgroundColor: color.neutral[50],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: color.neutral[50],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  rowCurrent: {
    backgroundColor: color.role.driver.accentLight,
    borderColor: color.role.driver.accent,
  },
  body: { flex: 1 },
  name: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[700] },
  action: { fontSize: typography.fontSize.xs + 1, color: color.neutral[600], marginTop: 1 },
  go: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.brand[800] },
  goCurrent: { color: color.role.driver.accentDark },
  rule: {
    fontSize: typography.fontSize.xs + 1,
    fontWeight: "600",
    color: color.semantic.warning.dark,
    backgroundColor: color.semantic.warning.light,
    borderRadius: borderRadius.md,
    padding: spacing[2],
  },
});
