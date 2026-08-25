// Sélecteur de type de véhicule (D-06) : deux cartes Voiture / Moto, la
// sélection en teal ; un type hors des catégories exercées est grisé.

import { color, spacing, typography } from "@teko/ui";
import { CarIcon, MotoIcon } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type VehicleType = "car" | "moto";

export interface VehicleTypeCardsProps {
  selected: VehicleType;
  onSelect: (type: VehicleType) => void;
  carAllowed: boolean;
  motoAllowed: boolean;
}

interface TypeCardProps {
  type: VehicleType;
  on: boolean;
  disabled: boolean;
  onPress: () => void;
}

function TypeCard({ type, on, disabled, onPress }: TypeCardProps) {
  const { t } = useTranslation();
  const iconColor = on ? color.role.driver.accentDark : color.neutral[600];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled }}
      testID={`vehicle-type-${type}`}
      style={[styles.card, on && styles.cardOn, disabled && styles.cardDisabled]}
    >
      {type === "car" ? (
        <CarIcon size={26} color={iconColor} />
      ) : (
        <MotoIcon size={26} color={iconColor} />
      )}
      <Text style={styles.label}>
        {t(type === "car" ? "kyc:vehicule.voiture" : "kyc:vehicule.moto")}
      </Text>
      <Text style={styles.sub}>
        {t(type === "car" ? "kyc:vehicule.voitureSub" : "kyc:vehicule.motoSub")}
      </Text>
    </Pressable>
  );
}

export function VehicleTypeCards({
  selected,
  onSelect,
  carAllowed,
  motoAllowed,
}: VehicleTypeCardsProps) {
  return (
    <View style={styles.row}>
      <TypeCard
        type="car"
        on={selected === "car"}
        disabled={!carAllowed}
        onPress={() => onSelect("car")}
      />
      <TypeCard
        type="moto"
        on={selected === "moto"}
        disabled={!motoAllowed}
        onPress={() => onSelect("moto")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing[2] },
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    borderRadius: 16,
    backgroundColor: color.neutral[0],
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 12,
  },
  cardOn: {
    borderColor: color.role.driver.accent,
    backgroundColor: color.role.driver.accentLight,
  },
  cardDisabled: { opacity: 0.45 },
  label: {
    marginTop: 6,
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
  },
  sub: { fontSize: typography.fontSize.xs, color: color.neutral[500] },
});
