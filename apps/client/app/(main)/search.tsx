// C-08 Recherche destination — champ autofocus, résultats en direct
// (anti-rebond 300 ms), lieux enregistrés (D/T/★), récents, et ligne
// « Proposer un repère » (toujours offerte, y compris sans résultat).

import { distanceM, type GeomInput, type LonLat, toLonLat } from "@teko/maps";
import type { TableRow } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { LandmarkRow, PlusIcon, RecentIcon } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBookingStore } from "../../src/features/booking/store";
import { formatDistanceText } from "../../src/features/places/format";
import { LandmarkResultRow } from "../../src/features/places/landmark-result-row";
import { SearchHeader } from "../../src/features/places/search-header";
import { useLandmarkSearch } from "../../src/features/places/use-landmark-search";
import { useRecentDestinations } from "../../src/features/places/use-recent-destinations";
import { useSavedPlaces } from "../../src/features/places/use-saved-places";

const SAVED_KIND = {
  home: { letter: "D", labelKey: "places:recherche.domicile" },
  work: { letter: "T", labelKey: "places:recherche.travail" },
  other: { letter: "★", labelKey: "places:recherche.favori" },
} as const;

export default function Search() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const origin = useBookingStore((s) => s.origin);
  const setDestination = useBookingStore((s) => s.setDestination);
  const search = useLandmarkSearch(query);
  const savedPlaces = useSavedPlaces();
  const recents = useRecentDestinations();

  const pick = (position: LonLat, label: string, landmarkId?: string) => {
    setDestination({ position, label, landmarkId });
    router.push("/(main)/refine" as Href);
  };

  const goPropose = () => {
    const name = query.trim();
    router.push(
      { pathname: "/(main)/propose-landmark", params: name ? { name } : {} } as Href,
    );
  };

  const distanceText = (position: LonLat): string | undefined =>
    origin ? formatDistanceText(distanceM(origin.position, position)) : undefined;

  const renderResult = (row: TableRow<"landmarks">) => {
    const position = toLonLat(row.geom as GeomInput);
    return (
      <LandmarkResultRow
        key={row.id}
        name={row.name}
        query={query}
        subtitle={t("places:recherche.repereValide")}
        distanceText={distanceText(position)}
        onPress={() => pick(position, row.name, row.id)}
        testID={`search-result-${row.id}`}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <SearchHeader
        originLabel={origin?.label ?? t("places:recherche.maPosition")}
        placeholder={t("places:recherche.chercherRepere")}
        backLabel={t("places:recherche.retour")}
        query={query}
        onQueryChange={setQuery}
        onBack={() => router.back()}
      />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {search.active ? (
          <>
            <Text style={styles.section}>{t("places:recherche.reperesProches")}</Text>
            {search.results.map(renderResult)}
            <LandmarkRow
              title={t("places:recherche.proposerRequete", { nom: query.trim() })}
              subtitle={t("places:recherche.proposerSous")}
              icon={<PlusIcon size={16} />}
              iconBackground={color.neutral[100]}
              onPress={goPropose}
              testID="search-propose-query"
            />
          </>
        ) : (
          <>
            {savedPlaces.length > 0 ? (
              <Text style={styles.section}>{t("places:recherche.lieuxEnregistres")}</Text>
            ) : null}
            {savedPlaces.map((place) => {
              const kind = SAVED_KIND[place.kind];
              return (
                <LandmarkRow
                  key={place.id}
                  title={place.label}
                  subtitle={t(kind.labelKey)}
                  icon={<Text style={styles.letter}>{kind.letter}</Text>}
                  iconBackground={color.brand[50]}
                  onPress={() =>
                    pick(
                      toLonLat(place.geom as GeomInput),
                      place.label,
                      place.landmark_id ?? undefined,
                    )
                  }
                  testID={`search-saved-${place.id}`}
                />
              );
            })}
            {recents.length > 0 ? (
              <Text style={styles.section}>{t("places:recherche.recents")}</Text>
            ) : null}
            {recents.map((recent) => (
              <LandmarkRow
                key={recent.id}
                title={recent.label}
                subtitle={`${t("places:recherche.recent")} · ${recent.when}`}
                icon={<RecentIcon />}
                onPress={() => setQuery(recent.label)}
                testID={`search-recent-${recent.id}`}
              />
            ))}
            <LandmarkRow
              title={t("places:recherche.proposerNouveau")}
              subtitle={t("places:recherche.proposerSous")}
              icon={<PlusIcon size={16} />}
              iconBackground={color.neutral[100]}
              onPress={goPropose}
              testID="search-propose"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  list: { flex: 1, paddingHorizontal: spacing[4] },
  section: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
    marginTop: 14,
    marginBottom: spacing[1],
  },
  letter: { color: color.brand[800], fontWeight: "700", fontSize: typography.fontSize.sm },
});
