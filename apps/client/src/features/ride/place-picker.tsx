// Choix d'un lieu en cours de course (R3) : même recherche de repères que
// C-08 (anti-rebond, repères validés, lieux enregistrés, récents), sans
// toucher au brouillon de commande.

import { color, spacing } from "@teko/ui";
import { Button, LandmarkPinIcon, TextField } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import type { PlacePick } from "../booking/store";
import { IdleSections, SearchResults } from "../places/search-sections";
import { useLandmarkSearch } from "../places/use-landmark-search";
import { useRecentDestinations } from "../places/use-recent-destinations";
import { useSavedPlaces } from "../places/use-saved-places";

export interface PlacePickerProps {
  placeholder: string;
  onPick: (place: PlacePick) => void;
  onCancel: () => void;
}

export function PlacePicker({ placeholder, onPick, onCancel }: PlacePickerProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const search = useLandmarkSearch(query);
  const savedPlaces = useSavedPlaces();
  const recents = useRecentDestinations();

  const goPropose = () => {
    const name = query.trim();
    router.push({ pathname: "/(main)/propose-landmark", params: name ? { name } : {} } as Href);
  };

  return (
    <View style={styles.wrap} testID="place-picker">
      <View style={styles.field}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          icon={<LandmarkPinIcon size={16} />}
          autoFocus
          autoCorrect={false}
          testID="picker-input"
        />
      </View>
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {search.active ? (
          <SearchResults
            query={query}
            results={search.results}
            distanceFor={() => undefined}
            onPick={(position, label, landmarkId) => onPick({ position, label, landmarkId })}
            onPropose={goPropose}
          />
        ) : (
          <IdleSections
            savedPlaces={savedPlaces}
            recents={recents}
            onPick={(position, label, landmarkId) => onPick({ position, label, landmarkId })}
            onPickRecent={(recent) => {
              if (!recent.position) return setQuery(recent.label);
              onPick({
                position: recent.position,
                label: recent.label,
                landmarkId: recent.landmarkId,
              });
            }}
            onPropose={goPropose}
          />
        )}
      </ScrollView>
      <Button
        label={t("ride:modification.annulerRecherche")}
        variant="ghost"
        onPress={onCancel}
        testID="picker-cancel"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: color.neutral[50] },
  field: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  list: { flex: 1, paddingHorizontal: spacing[4] },
});
