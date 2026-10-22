// C-08 Recherche destination — champ autofocus, résultats en direct
// (anti-rebond 300 ms), lieux enregistrés (D/T/★), récents, et ligne
// « Proposer un repère » (toujours offerte, y compris sans résultat).

import { distanceM, type LonLat } from "@teko/maps";
import { color, spacing } from "@teko/ui";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBookingStore } from "../../src/features/booking/store";
import { formatDistanceText } from "../../src/features/places/format";
import { SearchHeader } from "../../src/features/places/search-header";
import { IdleSections, SearchResults } from "../../src/features/places/search-sections";
import { useLandmarkSearch } from "../../src/features/places/use-landmark-search";
import { useRecentDestinations } from "../../src/features/places/use-recent-destinations";
import { useSavedPlaces } from "../../src/features/places/use-saved-places";

export default function Search() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const origin = useBookingStore((s) => s.origin);
  const setOrigin = useBookingStore((s) => s.setOrigin);
  const [choosingOrigin, setChoosingOrigin] = useState(!origin);
  const setDestination = useBookingStore((s) => s.setDestination);
  const search = useLandmarkSearch(query);
  const savedPlaces = useSavedPlaces();
  const recents = useRecentDestinations();

  const pick = (position: LonLat, label: string, landmarkId?: string) => {
    if (choosingOrigin) {
      setOrigin({ position, label, landmarkId });
      setChoosingOrigin(false);
      setQuery("");
      return;
    }
    setDestination({ position, label, landmarkId });
    router.push("/(main)/refine" as Href);
  };

  const goPropose = () => {
    const name = query.trim();
    router.push({ pathname: "/(main)/propose-landmark", params: name ? { name } : {} } as Href);
  };

  const distanceFor = (position: LonLat): string | undefined =>
    origin ? formatDistanceText(distanceM(origin.position, position)) : undefined;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <SearchHeader
        originLabel={origin?.label ?? t("places:recherche.choisirDepart")}
        onOriginPress={() => {
          setChoosingOrigin(true);
          setQuery("");
        }}
        choosingOrigin={choosingOrigin}
        placeholder={t(
          choosingOrigin ? "places:recherche.chercherDepart" : "places:recherche.chercherRepere",
        )}
        backLabel={t("places:recherche.retour")}
        query={query}
        onQueryChange={setQuery}
        onBack={() => {
          if (choosingOrigin && origin) {
            setChoosingOrigin(false);
            setQuery("");
          } else router.back();
        }}
      />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {search.active ? (
          <SearchResults
            query={query}
            results={search.results}
            distanceFor={distanceFor}
            onPick={pick}
            onPropose={goPropose}
          />
        ) : (
          <IdleSections
            savedPlaces={savedPlaces}
            recents={recents}
            onPick={pick}
            onPickRecent={(recent) => setQuery(recent.label)}
            onPropose={goPropose}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  list: { flex: 1, paddingHorizontal: spacing[4] },
});
