// Démo visuelle autonome : style éco (aucune tuile externe), données fictives
// Libreville. Sert à vérifier le langage carte des maquettes : point client
// magenta, épingles repères ambre, itinéraire violet, véhicule teal.
// `pnpm demo:build` puis ouvrir demo/index.html.

import "maplibre-gl/dist/maplibre-gl.css";
import { TekoMapController } from "../src/web/controller.js";
import { landmarksToGeoJson, type LandmarkRow } from "../src/geojson.js";

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

const landmarks: LandmarkRow[] = [
  { id: "l1", name: "Marché de Mont-Bouët", aliases: [], category: "market", geom: ewkbHex(9.457, 0.399), salience: 9, usage_count: 12, photo_url: null },
  { id: "l2", name: "Rond-point de la Démocratie", aliases: [], category: "roundabout", geom: ewkbHex(9.454, 0.392), salience: 10, usage_count: 8, photo_url: null },
  { id: "l3", name: "Station Total Glass", aliases: [], category: "fuel_station", geom: ewkbHex(9.449, 0.408), salience: 7, usage_count: 5, photo_url: null },
];

const origin = { lon: 9.4536, lat: 0.4032 }; // Pharmacie du Gros-Bouquet
const dest = { lon: 9.4671, lat: 0.4148 }; // Lycée Léon Mba

const map = new TekoMapController(document.getElementById("map")!, { eco: true });
map.setLandmarks(landmarksToGeoJson(landmarks));
map.setRoute([origin, { lon: 9.458, lat: 0.406 }, { lon: 9.463, lat: 0.409 }, dest]);
map.setVehicles([{ id: "boris", lon: 9.4585, lat: 0.4068, bearing: 45 }]);
map.setClientPosition(origin);
map.fitTo([origin, dest, { lon: 9.449, lat: 0.392 }], 300);
map.onIdle(() => {
  document.title = "Teko carte — rendu terminé";
  (document.getElementById("status") as HTMLElement).textContent = "rendu terminé";
});
