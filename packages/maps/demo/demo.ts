// Démo visuelle @teko/maps — scènes multiples pilotées par l'URL :
//   ?scene=commande    sélection du départ (C-08/C-09) : repères + point client
//   ?scene=course      suivi de course (C-13) : itinéraire + véhicule (défaut)
//   ?scene=eco         même course en mode éco (C-25) : aucune tuile
//   ?scene=flotte      vue d'ensemble chauffeurs en ligne (admin A-02)
//   ?scene=route-teko  route crowdsourcée servie EN DIRECT par Martin (A-04)
// Ajouter &tiles=<url TileJSON Martin> pour le fond self-hosted
// (ex. ?scene=course&tiles=http://127.0.0.1:3333/gabon).

import "maplibre-gl/dist/maplibre-gl.css";
import { TekoMapController } from "../src/web/controller.js";
import { landmarksToGeoJson, type LandmarkRow } from "../src/geojson.js";
import { MAP_COLORS } from "../src/tokens.js";

function ewkbHex(lon: number, lat: number): string {
  const buf = new ArrayBuffer(25);
  const view = new DataView(buf);
  view.setUint8(0, 1);
  view.setUint32(1, 0x20000001, true);
  view.setUint32(5, 4326, true);
  view.setFloat64(9, lon, true);
  view.setFloat64(17, lat, true);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const lm = (id: string, name: string, category: string, lon: number, lat: number): LandmarkRow => ({
  id, name, category, geom: ewkbHex(lon, lat), aliases: [], salience: 5, usage_count: 0, photo_url: null,
});

const landmarks: LandmarkRow[] = [
  lm("l1", "Marché de Mont-Bouët", "market", 9.457, 0.399),
  lm("l2", "Rond-point de la Démocratie", "roundabout", 9.454, 0.392),
  lm("l3", "Station Total Glass", "fuel_station", 9.449, 0.408),
  lm("l4", "Pharmacie du Gros-Bouquet", "pharmacy", 9.4536, 0.4032),
];

const origin = { lon: 9.4536, lat: 0.4032 }; // Pharmacie du Gros-Bouquet
const dest = { lon: 9.4671, lat: 0.4148 }; // Lycée Léon Mba

const params = new URLSearchParams(location.search);
const scene = params.get("scene") ?? "course";
const tilesUrl = params.get("tiles") ?? undefined;

const map = new TekoMapController(document.getElementById("map")!, {
  eco: scene === "eco" || !tilesUrl,
  tilesUrl,
});

switch (scene) {
  case "commande": {
    // C-08/C-09 : choisir le départ — repères proches + position, pas de course.
    map.setLandmarks(landmarksToGeoJson(landmarks));
    map.setClientPosition(origin);
    map.fitTo([origin, { lon: 9.457, lat: 0.399 }], 250);
    break;
  }
  case "flotte": {
    // A-02 : chauffeurs en ligne sur la ville (positions arrondies, teal).
    map.setVehicles([
      { id: "d1", lon: 9.4512, lat: 0.4009, bearing: 120 },
      { id: "d2", lon: 9.4598, lat: 0.4102, bearing: 30 },
      { id: "d3", lon: 9.4472, lat: 0.3951, bearing: 200 },
      { id: "d4", lon: 9.4643, lat: 0.4033, bearing: 80 },
      { id: "d5", lon: 9.4551, lat: 0.4168, bearing: 300 },
      { id: "d6", lon: 9.4703, lat: 0.4090, bearing: 10 },
    ]);
    map.setLandmarks(landmarksToGeoJson(landmarks.slice(0, 3)));
    map.fitTo([{ lon: 9.4472, lat: 0.3951 }, { lon: 9.4703, lat: 0.4168 }], 300);
    break;
  }
  case "route-teko": {
    // A-04 : la couche teko_roads servie EN DIRECT par Martin (PostGIS) —
    // le « Passage Akébé » validé apparaît sans aucun rebuild de tuiles.
    map.map.on("load", () => {
      map.map.addSource("teko-live-roads", {
        type: "vector",
        url: tilesUrl ? tilesUrl.replace(/\/gabon$/, "/teko_roads") : "http://127.0.0.1:3333/teko_roads",
      });
      map.map.addLayer({
        id: "teko-live-roads-line",
        type: "line",
        source: "teko-live-roads",
        "source-layer": "teko_roads",
        layout: { "line-cap": "round" },
        paint: {
          "line-color": MAP_COLORS.routeLine,
          "line-width": 5,
          "line-dasharray": [1.2, 1.6],
        },
      });
    });
    map.setLandmarks(landmarksToGeoJson([lm("l5", "Passage Akébé (Teko)", "junction", 9.4568, 0.4055)]));
    map.fitTo([{ lon: 9.4535, lat: 0.4028 }, { lon: 9.4600, lat: 0.4082 }], 120);
    break;
  }
  default: {
    // « course » et « eco » : suivi de course complet (C-13 / C-25).
    map.setLandmarks(landmarksToGeoJson(landmarks.slice(0, 3)));
    map.setRoute([origin, { lon: 9.458, lat: 0.406 }, { lon: 9.463, lat: 0.409 }, dest]);
    map.setVehicles([{ id: "boris", lon: 9.4585, lat: 0.4068, bearing: 45 }]);
    map.setClientPosition(origin);
    map.fitTo([origin, dest, { lon: 9.449, lat: 0.392 }], 300);
  }
}

map.onIdle(() => {
  document.title = "Teko carte — rendu terminé";
  (document.getElementById("status") as HTMLElement).textContent = `scène : ${scene} — rendu terminé`;
});
