// Ligne de résultat C-08 : médaillon ambre, partie de nom qui correspond à
// la requête surlignée en magenta (mark de la maquette), distance à droite
// en chasse fixe. LandmarkRow du kit n'a ni surlignage ni colonne droite.

import { borderRadius, color, typography } from "@teko/ui";
import { LandmarkPinIcon } from "@teko/ui/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { splitOnQuery } from "./format";

export interface LandmarkResultRowProps {
  name: string;
  query: string;
  subtitle: string;
  distanceText?: string;
  onPress: () => void;
  testID?: string;
}

export function LandmarkResultRow({
  name,
  query,
  subtitle,
  distanceText,
  onPress,
  testID,
}: LandmarkResultRowProps) {
  const parts = splitOnQuery(name, query);
  return (
    <Pressable onPress={onPress} style={styles.row} testID={testID} accessibilityRole="button">
      <View style={styles.medallion}>
        <LandmarkPinIcon size={16} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {parts.before}
          {parts.match ? <Text style={styles.mark}>{parts.match}</Text> : null}
          {parts.after}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {distanceText ? <Text style={styles.distance}>{distanceText}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: color.neutral[100],
  },
  medallion: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.warning.light,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  title: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  mark: { color: color.brand[500] },
  subtitle: { fontSize: typography.fontSize.xs + 1, color: color.neutral[500], marginTop: 1 },
  distance: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xs + 1,
    color: color.neutral[400],
    fontVariant: ["tabular-nums"],
  },
});
