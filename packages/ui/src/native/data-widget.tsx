// Widget de consommation data (composant widget-data) : pastille flottante
// bas-gauche de tout écran carte (z-index 300), tap → C-25. Trois états
// selon la part du budget mensuel (n° 19 : 100 Mo, 50 %, 80 %). Le pill
// « Mode éco actif » se pose juste au-dessus quand l'éco est engagé.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, color, typography, zIndex } from "../tokens";
import { DataBarsIcon } from "./icons";

export type DataWidgetState = "normal" | "alerte" | "critique";

const STATES: Record<DataWidgetState, { ringBg: string; ringFg: string; border: string }> = {
  normal: { ringBg: color.brand[50], ringFg: color.brand[800], border: "transparent" },
  alerte: {
    ringBg: color.semantic.warning.light,
    ringFg: color.semantic.warning.dark,
    border: color.semantic.warning.default,
  },
  critique: {
    ringBg: color.semantic.error.light,
    ringFg: color.semantic.error.dark,
    border: color.semantic.error.default,
  },
};

export interface DataWidgetProps {
  /** Texte déjà formaté (formatMo de @teko/telemetry) — ex. « 12 Mo ». */
  quantityText: string;
  state?: DataWidgetState;
  onPress?: () => void;
  testID?: string;
}

export function DataWidget({ quantityText, state = "normal", onPress, testID }: DataWidgetProps) {
  const s = STATES[state];
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Consommation data : ${quantityText} ce mois`}
      style={[styles.widget, { borderColor: s.border }]}
    >
      <View style={[styles.ring, { backgroundColor: s.ringBg }]}>
        <DataBarsIcon color={s.ringFg} size={14} />
      </View>
      <View>
        <Text style={styles.qty}>{quantityText}</Text>
        <Text style={styles.cap}>ce mois</Text>
      </View>
    </Pressable>
  );
}

/** Pill sombre « Mode éco actif » (point vert) — au-dessus du widget. */
export function EcoPill() {
  return (
    <View style={styles.eco}>
      <View style={styles.ecoDot} />
      <Text style={styles.ecoText}>Mode éco actif</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: color.neutral[0],
    borderRadius: borderRadius.full,
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: 13,
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    zIndex: zIndex.widget,
    alignSelf: "flex-start",
  },
  ring: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xs + 1,
    fontWeight: "700",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  cap: { fontSize: 9, color: color.neutral[500], marginTop: -2 },
  eco: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.neutral[800],
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  ecoDot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.success.default,
  },
  ecoText: { color: color.neutral[0], fontSize: typography.fontSize.xs, fontWeight: "600" },
});
