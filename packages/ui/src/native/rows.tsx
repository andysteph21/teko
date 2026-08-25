// Lignes de listes (maquette components/cartes.html) : résultat de repère
// (C-08), trajet d'historique (C-19), fiche chauffeur (C-13). Jamais la
// couleur seule pour un état — toujours icône ou libellé.

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, color, typography } from "../tokens";
import { LandmarkPinIcon } from "./icons";

export interface LandmarkRowProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Fond du médaillon (ambre par défaut — repère). */
  iconBackground?: string;
  onPress?: () => void;
  testID?: string;
}

/** Ligne repère / suggestion — médaillon 36, titre 15/600, sous-titre 12. */
export function LandmarkRow({
  title,
  subtitle,
  icon,
  iconBackground = color.semantic.warning.light,
  onPress,
  testID,
}: LandmarkRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row} testID={testID} accessibilityRole="button">
      <View style={[styles.medallion, { backgroundColor: iconBackground }]}>
        {icon ?? <LandmarkPinIcon />}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export interface RideRowProps {
  title: string;
  hint: string;
  amountText: string;
  chip: ReactNode;
  onPress?: () => void;
  testID?: string;
}

/** Trajet d'historique : colonne départ (magenta) → arrivée (ambre). */
export function RideRow({ title, hint, amountText, chip, onPress, testID }: RideRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.rideRow} testID={testID} accessibilityRole="button">
      <View style={styles.dotColumn}>
        <View style={[styles.dot, { backgroundColor: color.map.markerClient }]} />
        <View style={styles.dotLine} />
        <View style={[styles.dot, { backgroundColor: color.map.markerLandmark }]} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rideTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle}>{hint}</Text>
      </View>
      <View style={styles.rideRight}>
        {chip}
        <Text style={styles.rideAmount}>{amountText}</Text>
      </View>
    </Pressable>
  );
}

export interface DriverCardProps {
  name: string;
  /** Initiales affichées dans l'avatar (photos → initiales en mode éco). */
  initials: string;
  detail: string;
  plate?: string;
  testID?: string;
}

/** Fiche chauffeur (C-13) : avatar initiales, note ★, plaque en chasse fixe. */
export function DriverCard({ name, initials, detail, plate, testID }: DriverCardProps) {
  return (
    <View style={styles.driver} testID={testID}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.rowSubtitle}>{detail}</Text>
      </View>
      {plate ? <Text style={styles.plate}>{plate}</Text> : null}
    </View>
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
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  rowSubtitle: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 1 },
  rideRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.neutral[100],
    alignItems: "flex-start",
  },
  dotColumn: { alignItems: "center", paddingTop: 5, alignSelf: "stretch" },
  dot: { width: 8, height: 8, borderRadius: borderRadius.full },
  dotLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: color.neutral[200],
    marginVertical: 2,
  },
  rideTitle: { fontSize: typography.fontSize.sm + 1, fontWeight: "600", color: color.neutral[700] },
  rideRight: { alignItems: "flex-end", gap: 6 },
  rideAmount: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.sm + 1,
    fontWeight: "700",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  driver: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: color.brand[800], fontWeight: "700", fontSize: typography.fontSize.md },
  plate: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.sm,
    fontWeight: "700",
    backgroundColor: color.neutral[100],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: color.neutral[700],
  },
});
