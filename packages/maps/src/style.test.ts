import { describe, expect, it } from "vitest";
import { MAP_COLORS } from "./tokens.js";
import { TEKO_SOURCES, buildMapStyle } from "./style.js";
import {
  clientPositionToGeoJson,
  landmarksToGeoJson,
  routeToGeoJson,
  vehiclesToGeoJson,
} from "./geojson.js";

type Layer = { id: string; type: string; source?: string; paint?: Record<string, unknown> };
const layers = (s: Record<string, unknown>) => s["layers"] as Layer[];
const layer = (s: Record<string, unknown>, id: string) => layers(s).find((l) => l.id === id)!;

describe("buildMapStyle", () => {
  it("contient les 4 sources Teko et le fond du langage carte", () => {
    const s = buildMapStyle({ eco: true });
    const sources = s["sources"] as Record<string, unknown>;
    for (const id of Object.values(TEKO_SOURCES)) expect(sources[id]).toBeDefined();
    expect(layer(s, "teko-background").paint?.["background-color"]).toBe(MAP_COLORS.background);
  });

  it("respecte le langage carte des maquettes : magenta client, ambre repères, violet itinéraire, teal véhicules", () => {
    const s = buildMapStyle({ eco: true });
    expect(layer(s, "teko-client-dot").paint?.["circle-color"]).toBe("#8C238A");
    expect(layer(s, "teko-landmarks-dot").paint?.["circle-color"]).toBe("#F5A623");
    expect(layer(s, "teko-route-line").paint?.["line-color"]).toBe("#5A1A80");
    expect(layer(s, "teko-vehicles-dot").paint?.["circle-color"]).toBe("#00BFA5");
  });

  it("mode éco : aucune source de tuiles, même avec une URL fournie", () => {
    const s = buildMapStyle({ eco: true, tilesUrl: "https://tiles.example/teko.json" });
    expect((s["sources"] as Record<string, unknown>)["basemap"]).toBeUndefined();
  });

  it("mode normal : la source de tuiles Martin est branchée, avec l'attribution OSM (ODbL)", () => {
    const s = buildMapStyle({ tilesUrl: "https://tiles.example/teko.json" });
    expect((s["sources"] as Record<string, unknown>)["basemap"]).toMatchObject({
      type: "vector",
      url: "https://tiles.example/teko.json",
      attribution: "© les contributeurs OpenStreetMap",
    });
  });

  it("pas de couche texte sans glyphes (MapLibre la refuserait) — l'éco reste muet", () => {
    expect(layers(buildMapStyle({ eco: true })).some((l) => l.type === "symbol")).toBe(false);
    const withGlyphs = buildMapStyle({ eco: true, glyphsUrl: "https://tiles.example/glyphs/{fontstack}/{range}.pbf" });
    expect(layers(withGlyphs).some((l) => l.type === "symbol")).toBe(true);
  });

  it("mode normal : les glyphes sont dérivés de l'origine du serveur de tuiles", () => {
    const s = buildMapStyle({ tilesUrl: "http://tiles.example:3333/gabon" });
    expect(s["glyphs"]).toBe("http://tiles.example:3333/font/{fontstack}/{range}");
  });

  it("étiquettes hiérarchisées par zoom : localités < équipements majeurs < quartier", () => {
    const s = buildMapStyle({ tilesUrl: "https://t.example/gabon" });
    const min = (id: string) => (layer(s, id) as unknown as { minzoom: number }).minzoom;
    expect(min("labels-localites-majeures")).toBeLessThan(min("labels-equipements-majeurs"));
    expect(min("labels-equipements-majeurs")).toBeLessThan(min("labels-equipements-quartier"));
    expect(min("labels-rues-majeures")).toBeLessThan(min("labels-rues"));
    const filtre = JSON.stringify(layer(s, "labels-equipements-majeurs"));
    expect(filtre).toContain("hospital");
    expect(filtre).toContain('"symbol-sort-key"');
  });

  it("labelDensity règle le padding de collision et retarde/avance les équipements", () => {
    const dense = buildMapStyle({ tilesUrl: "https://t.example/gabon", labelDensity: "dense" });
    const faible = buildMapStyle({ tilesUrl: "https://t.example/gabon", labelDensity: "faible" });
    const pad = (s: Record<string, unknown>, id: string) =>
      (layer(s, id) as unknown as { layout: Record<string, number> }).layout["text-padding"];
    const min = (s: Record<string, unknown>, id: string) =>
      (layer(s, id) as unknown as { minzoom: number }).minzoom;
    expect(pad(dense, "labels-quartiers")).toBeLessThan(pad(faible, "labels-quartiers")!);
    expect(min(dense, "labels-equipements-quartier")).toBeLessThan(min(faible, "labels-equipements-quartier"));
  });

  it("les repères Teko priorisent la saillance en cas de collision", () => {
    const s = buildMapStyle({ tilesUrl: "https://t.example/gabon" });
    const lm = layer(s, "teko-landmarks-label") as unknown as { layout: Record<string, unknown> };
    expect(JSON.stringify(lm.layout["symbol-sort-key"])).toContain("salience");
  });

  it("le point client est la couche la plus haute (toujours visible)", () => {
    const all = layers(buildMapStyle({ eco: true }));
    expect(all[all.length - 1]!.id).toBe("teko-client-dot");
  });
});

describe("convertisseurs GeoJSON", () => {
  it("landmarksToGeoJson décode la géométrie EWKB et garde nom/catégorie", () => {
    // Point (9.457, 0.399) EWKB LE + SRID — tel que renvoyé par PostgREST.
    const hex =
      "0101000020E6100000" +
      [9.457, 0.399]
        .map((v) => {
          const b = new ArrayBuffer(8);
          new DataView(b).setFloat64(0, v, true);
          return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
        })
        .join("");
    const fc = landmarksToGeoJson([
      { id: "l1", name: "Marché de Mont-Bouët", aliases: [], category: "market", geom: hex.toUpperCase(), salience: "9", usage_count: 3, photo_url: null },
    ]);
    expect(fc.features).toHaveLength(1);
    const f = fc.features[0]!;
    expect(f.geometry).toEqual({ type: "Point", coordinates: [9.457, 0.399] });
    expect(f.properties).toMatchObject({ kind: "landmark", name: "Marché de Mont-Bouët", salience: 9 });
  });

  it("routeToGeoJson : LineString, vide si moins de 2 points", () => {
    expect(routeToGeoJson([{ lon: 9.45, lat: 0.4 }]).features).toHaveLength(0);
    const fc = routeToGeoJson([
      { lon: 9.45, lat: 0.4 },
      { lon: 9.47, lat: 0.41 },
    ]);
    expect(fc.features[0]!.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [9.45, 0.4],
        [9.47, 0.41],
      ],
    });
  });

  it("client et véhicules portent leur kind (pour le débogage/QA)", () => {
    expect(clientPositionToGeoJson({ lon: 9.45, lat: 0.4 }).features[0]!.properties["kind"]).toBe("client");
    const v = vehiclesToGeoJson([{ id: "d1", lon: 9.46, lat: 0.41, bearing: 90 }]);
    expect(v.features[0]!.properties).toMatchObject({ kind: "vehicle", bearing: 90 });
  });
});
