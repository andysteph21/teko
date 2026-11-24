// Carte Covoiturage de C-10 (R4) : prix total à droite, prix par place en
// méta, sélecteur de 1 à 3 places et rappel que d'autres passagers peuvent
// monter en route. Affichée uniquement quand le serveur ouvre le service.

import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { CarIcon, CategoryCard } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";
import { ChoiceChips } from "../places/choice-chips";
import { MAX_SEATS, useBookingStore } from "./store";
import { useSharedEstimate } from "./use-shared-estimate";

type SeatValue = "1" | "2" | "3";
const SEAT_VALUES = Array.from({ length: MAX_SEATS }, (_, i) => String(i + 1) as SeatValue);

export interface SharedRideCardProps {
  /** Prix total serveur pour `quotedSeats` places. */
  price: number;
  /** Nombre de places du devis affiché (peut retarder sur `seats`). */
  quotedSeats: number;
  seats: number;
  selected: boolean;
  onSelect: () => void;
  onSeats: (seats: number) => void;
}

export function SharedRideCard(props: SharedRideCardProps) {
  const { price, quotedSeats, seats, selected, onSelect, onSeats } = props;
  const { t } = useTranslation();
  const perSeat = Math.round(price / Math.max(1, quotedSeats));
  return (
    <View>
      <CategoryCard
        title={t("booking:categories.covoiturage")}
        meta={t("booking:covoiturage.parPlace", { prix: formatXaf(perSeat, "FCFA") })}
        priceText={formatXaf(price, "FCFA")}
        icon={<CarIcon />}
        selected={selected}
        onPress={onSelect}
        testID="cat-covoiturage"
      />
      {selected ? (
        <View style={styles.details} testID="shared-details">
          <Text style={styles.label}>{t("booking:covoiturage.places")}</Text>
          <ChoiceChips
            options={SEAT_VALUES.map((value) => ({ value, label: value }))}
            selected={String(seats) as SeatValue}
            onSelect={(value) => onSeats(Number(value))}
            testIDPrefix="shared-seats"
          />
          <Text style={styles.notice}>{t("booking:covoiturage.autresPassagers")}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Carte branchée sur le brouillon ; absente tant que le service est fermé. */
export function SharedRideOption() {
  const { available } = useSharedEstimate();
  const draft = useBookingStore(
    useShallow((s) => ({
      price: s.estimates.covoiturage,
      quotedSeats: s.quotes.covoiturage?.seats,
      seats: s.seats,
      selected: s.category === "covoiturage",
    })),
  );
  const setSeats = useBookingStore((s) => s.setSeats);
  const setCategory = useBookingStore((s) => s.setCategory);
  if (!available || draft.price == null) return null;
  return (
    <SharedRideCard
      price={draft.price}
      quotedSeats={draft.quotedSeats ?? draft.seats}
      seats={draft.seats}
      selected={draft.selected}
      onSelect={() => setCategory("covoiturage")}
      onSeats={setSeats}
    />
  );
}

const styles = StyleSheet.create({
  details: { paddingHorizontal: spacing[1], paddingTop: spacing[2], gap: spacing[2] },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
  },
  notice: { fontSize: typography.fontSize.sm, color: color.neutral[500], lineHeight: 20 },
});
