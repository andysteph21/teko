// Style MapLibre construit depuis les design tokens.
//
// Deux régimes, conformes à la contrainte de sobriété data :
//  - normal : fond de tuiles vectorielles auto-hébergées (Martin, ADR-10),
//    URL injectée par l'app (`tilesUrl`) ;
//  - éco    : tuiles plafonnées à z13 sans texte, ou AUCUNE tuile hors-ligne —
//    fond uni + couches Teko uniquement (rendu « carte allégée » de C-25).
//
// Les couches Teko (repères, itinéraire, véhicules, client) sont présentes
// dans les deux régimes, alimentées par des sources GeoJSON nommées.
// Détail des couches : src/style/ (eco-basemap, full-basemap, labels, teko-layers).

import { ecoBasemapLayers } from "./style/eco-basemap.js";
import { fullBasemapLayers } from "./style/full-basemap.js";
import type { FontStacks, Layer } from "./style/helpers.js";
import { basemapLabelLayers } from "./style/labels.js";
import { TEKO_SOURCES } from "./style/sources.js";
import { tekoOverlayLayers } from "./style/teko-layers.js";
import { MAP_COLORS } from "./tokens.js";

export { TEKO_SOURCES };

export interface MapStyleOptions {
  /** URL du style de fond (Martin/PMTiles) — ignorée en mode éco. */
  tilesUrl?: string;
  /** Mode éco : fond uni, pas de requête tuiles (ni glyphes → pas de texte). */
  eco?: boolean;
  /** Glyphes. Défaut : dérivés de l'origine de `tilesUrl` (Martin sert
   *  /font/{fontstack}/{range}). */
  glyphsUrl?: string;
  /** Piles de polices servies par Martin (défaut : DejaVu du compose dev ;
   *  en prod, pointer les Noto déposées dans infra/_data/fonts). */
  fonts?: FontStacks;
  /** Densité des étiquettes (padding de collision + seuils de zoom des
   *  équipements) : "faible" pour les petits écrans/mode discret,
   *  "dense" pour l'admin desktop. Défaut "normale". */
  labelDensity?: "faible" | "normale" | "dense";
}

/** Glyphes : explicites, sinon dérivés du serveur de tuiles (Martin sert
 *  /font/{fontstack}/{range}). Jamais de glyphes en éco (pas de texte). */
function resolveGlyphsUrl(opts: MapStyleOptions, eco: boolean): string | undefined {
  if (opts.glyphsUrl) return opts.glyphsUrl;
  if (!eco && opts.tilesUrl) return `${new URL(opts.tilesUrl).origin}/font/{fontstack}/{range}`;
  return undefined;
}

/** Source du fond OSM — attribution ODbL obligatoire (backlog OSM-02) ;
 *  en éco, `maxzoom: 13` : sur-zoom au-delà → zéro requête en zoomant. */
function basemapSource(tilesUrl: string, eco: boolean): Record<string, unknown> {
  return {
    type: "vector",
    url: tilesUrl,
    attribution: "© les contributeurs OpenStreetMap",
    ...(eco ? { maxzoom: 13 } : {}),
  };
}

/** Style complet (sources GeoJSON vides + couches Teko). Objet compatible
 *  `StyleSpecification` de MapLibre, typé large pour rester sans dépendance. */
export function buildMapStyle(opts: MapStyleOptions = {}): Record<string, unknown> {
  const eco = opts.eco ?? false;
  const emptyGeoJson = { type: "geojson", data: { type: "FeatureCollection", features: [] } };

  const glyphsUrl = resolveGlyphsUrl(opts, eco);
  const fonts = opts.fonts ?? { regular: "DejaVu Sans Book", bold: "DejaVu Sans Bold" };
  const densite = opts.labelDensity ?? "normale";
  // Le padding de collision est LE réglage de densité de MapLibre : plus il
  // est grand, plus les étiquettes s'espacent. Le décalage de zoom retarde
  // (ou avance) l'apparition des équipements.
  const padding = { faible: 26, normale: 14, dense: 6 }[densite];
  const zShift = { faible: 1, normale: 0, dense: -0.7 }[densite];
  const halo = { "text-halo-color": MAP_COLORS.halo, "text-halo-width": 1.7 };

  const sources: Record<string, unknown> = {
    [TEKO_SOURCES.landmarks]: { ...emptyGeoJson },
    [TEKO_SOURCES.route]: { ...emptyGeoJson, lineMetrics: true },
    [TEKO_SOURCES.vehicles]: { ...emptyGeoJson },
    [TEKO_SOURCES.client]: { ...emptyGeoJson },
  };
  const layers: Layer[] = [
    // Fond un cran plus profond que le token pour que la voirie liserée
    // ressorte ; éco hors-ligne (aucune tuile) : fond uni des maquettes.
    {
      id: "teko-background",
      type: "background",
      paint: { "background-color": eco && !opts.tilesUrl ? MAP_COLORS.background : "#EDECF5" },
    },
  ];

  if (opts.tilesUrl) {
    sources.basemap = basemapSource(opts.tilesUrl, eco);
    layers.push(...(eco ? ecoBasemapLayers() : fullBasemapLayers()));
    if (!eco && glyphsUrl) {
      layers.push(...basemapLabelLayers({ fonts, padding, zShift, halo }));
    }
  }

  sources[TEKO_SOURCES.savedPlaces] = { ...emptyGeoJson };
  sources[TEKO_SOURCES.proposedRoads] = { ...emptyGeoJson };
  sources[TEKO_SOURCES.departureHotspots] = { ...emptyGeoJson };

  layers.push(...tekoOverlayLayers({ fonts, padding, halo, glyphsUrl }));

  return {
    version: 8,
    name: eco ? "Teko éco" : "Teko",
    ...(glyphsUrl ? { glyphs: glyphsUrl } : {}),
    sources,
    layers,
  };
}
