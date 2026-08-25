// Sélecteur de paiement C-10 — deux pastilles (Espèces / Airtel Money),
// bordure magenta + fond brand-50 quand actif, comme la maquette.

import type { PaymentMethod } from "@teko/types";
import { borderRadius, color, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

function CashIcon({ active }: { active: boolean }) {
  const stroke = active ? color.brand[800] : color.neutral[600];
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2}>
      <Rect x={3} y={7} width={18} height={12} rx={2} />
      <Circle cx={12} cy={13} r={3} />
    </Svg>
  );
}

function PhoneIcon({ active }: { active: boolean }) {
  const stroke = active ? color.brand[800] : color.neutral[600];
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2}>
      <Rect x={6} y={3} width={12} height={18} rx={2.5} />
      <Path d="M10 18h4" />
    </Svg>
  );
}

export interface PaymentSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentSelector({ value, onChange }: PaymentSelectorProps) {
  const { t } = useTranslation();
  const chips: { method: PaymentMethod; label: string; icon: typeof CashIcon }[] = [
    { method: "cash", label: t("booking:categorie.especes"), icon: CashIcon },
    { method: "airtel", label: t("booking:categorie.airtel"), icon: PhoneIcon },
  ];
  return (
    <View style={styles.row}>
      {chips.map(({ method, label, icon: Icon }) => {
        const active = value === method;
        return (
          <Pressable
            key={method}
            onPress={() => onChange(method)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            testID={`pay-${method}`}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Icon active={active} />
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: color.neutral[0],
  },
  chipActive: { borderColor: color.brand[500], backgroundColor: color.brand[50] },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[600],
  },
  labelActive: { color: color.brand[800] },
});
