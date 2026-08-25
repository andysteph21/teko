// Sections de la liste C-08 : résultats de recherche (+ ligne « Proposer
// « requête » ») et sections au repos (lieux enregistrés D/T/★, récents,
// ligne « Proposer un nouveau repère »).

import type { GeomInput, LonLat } from "@teko/maps";
import { toLonLat } from "@teko/maps";
import type { TableRow } from "@teko/types";
import { color, typography } from "@teko/ui";
import { LandmarkRow, PlusIcon, RecentIcon } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";
import { LandmarkResultRow } from "./landmark-result-row";
import type { RecentDestination } from "./use-recent-destinations";

const SAVED_KIND = {
  home: { letter: "D", labelKey: "places:recherche.domicile" },
  work: { letter: "T", labelKey: "places:recherche.travail" },
  other: { letter: "★", labelKey: "places:recherche.favori" },
} as const;

export type PickPlace = (position: LonLat, label: string, landmarkId?: string) => void;

export interface SearchResultsProps {
  query: string;
  results: TableRow<"landmarks">[];
  distanceFor: (position: LonLat) => string | undefined;
  onPick: PickPlace;
  onPropose: () => void;
}

export function SearchResults({
  query,
  results,
  distanceFor,
  onPick,
  onPropose,
}: SearchResultsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Text style={styles.section}>{t("places:recherche.reperesProches")}</Text>
      {results.map((row) => {
        const position = toLonLat(row.geom as GeomInput);
        return (
          <LandmarkResultRow
            key={row.id}
            name={row.name}
            query={query}
            subtitle={t("places:recherche.repereValide")}
            distanceText={distanceFor(position)}
            onPress={() => onPick(position, row.name, row.id)}
            testID={`search-result-${row.id}`}
          />
        );
      })}
      <LandmarkRow
        title={t("places:recherche.proposerRequete", { nom: query.trim() })}
        subtitle={t("places:recherche.proposerSous")}
        icon={<PlusIcon size={16} />}
        iconBackground={color.neutral[100]}
        onPress={onPropose}
        testID="search-propose-query"
      />
    </>
  );
}

export interface IdleSectionsProps {
  savedPlaces: TableRow<"saved_places">[];
  recents: RecentDestination[];
  onPick: PickPlace;
  onPickRecent: (recent: RecentDestination) => void;
  onPropose: () => void;
}

export function IdleSections({
  savedPlaces,
  recents,
  onPick,
  onPickRecent,
  onPropose,
}: IdleSectionsProps) {
  const { t } = useTranslation();
  return (
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
              onPick(toLonLat(place.geom as GeomInput), place.label, place.landmark_id ?? undefined)
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
          onPress={() => onPickRecent(recent)}
          testID={`search-recent-${recent.id}`}
        />
      ))}
      <LandmarkRow
        title={t("places:recherche.proposerNouveau")}
        subtitle={t("places:recherche.proposerSous")}
        icon={<PlusIcon size={16} />}
        iconBackground={color.neutral[100]}
        onPress={onPropose}
        testID="search-propose"
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
    marginTop: 14,
    marginBottom: 4,
  },
  letter: { color: color.brand[800], fontWeight: "700", fontSize: typography.fontSize.sm },
});
