// En-tête C-08 : retour, colonne départ (point magenta) → destination
// (point ambre), champ départ figé (« Ma position ») et champ de recherche
// actif (autofocus, icône repère ambre).

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BackIcon, LandmarkPinIcon, TextField } from "@teko/ui/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface SearchHeaderProps {
  originLabel: string;
  placeholder: string;
  backLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  onBack: () => void;
}

export function SearchHeader({
  originLabel,
  placeholder,
  backLabel,
  query,
  onQueryChange,
  onBack,
}: SearchHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        testID="search-back"
      >
        <BackIcon size={18} />
      </Pressable>
      <View style={styles.dotColumn}>
        <View style={[styles.dot, { backgroundColor: color.map.markerClient }]} />
        <View style={styles.line} />
        <View style={[styles.dot, { backgroundColor: color.map.markerLandmark }]} />
      </View>
      <View style={styles.fields}>
        <View style={styles.origin}>
          <Text style={styles.originText} numberOfLines={1}>
            {originLabel}
          </Text>
        </View>
        <TextField
          value={query}
          onChangeText={onQueryChange}
          placeholder={placeholder}
          icon={<LandmarkPinIcon size={16} />}
          autoFocus
          autoCorrect={false}
          testID="search-input"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: 14,
    backgroundColor: color.neutral[0],
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  dotColumn: { alignItems: "center", paddingTop: 26, paddingBottom: 22 },
  dot: { width: 8, height: 8, borderRadius: borderRadius.full },
  line: { width: 2, flex: 1, backgroundColor: color.neutral[200], marginVertical: spacing[1] },
  fields: { flex: 1, gap: spacing[2] },
  origin: {
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: color.neutral[100],
    justifyContent: "center",
    paddingHorizontal: spacing[3],
  },
  originText: { fontSize: typography.fontSize.base, color: color.neutral[500] },
});
