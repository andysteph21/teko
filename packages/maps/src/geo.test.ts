import { describe, expect, it } from "vitest";
import {
  bboxAround,
  decodePolyline6,
  distanceM,
  ewktPoint,
  parseEwkbPoint,
  pointAlong,
  roundPosition,
  toLonLat,
} from "./geo.js";

// Encodeur polyline6 de référence (test uniquement) — pour l'aller-retour.
function encodePolyline6(points: Array<{ lon: number; lat: number }>): string {
  let out = "";
  let prevLat = 0;
  let prevLon = 0;
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    return s + String.fromCharCode(n + 63);
  };
  for (const p of points) {
    const lat = Math.round(p.lat * 1e6);
    const lon = Math.round(p.lon * 1e6);
    out += enc(lat - prevLat) + enc(lon - prevLon);
    prevLat = lat;
    prevLon = lon;
  }
  return out;
}

// Encodeur EWKB de référence (test uniquement) — construit ce que PostGIS/
// PostgREST renvoie, pour vérifier le décodeur par aller-retour.
function encodeEwkbPoint(
  lon: number,
  lat: number,
  opts: { srid?: boolean; littleEndian?: boolean } = {},
): string {
  const { srid = true, littleEndian = true } = opts;
  const buf = new ArrayBuffer(srid ? 25 : 21);
  const view = new DataView(buf);
  view.setUint8(0, littleEndian ? 1 : 0);
  view.setUint32(1, srid ? 0x20000001 : 1, littleEndian);
  let off = 5;
  if (srid) {
    view.setUint32(5, 4326, littleEndian);
    off = 9;
  }
  view.setFloat64(off, lon, littleEndian);
  view.setFloat64(off + 8, lat, littleEndian);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

describe("ewktPoint", () => {
  it("formate un point PostGIS SRID 4326", () => {
    expect(ewktPoint({ lon: 9.4536, lat: 0.4032 })).toBe("SRID=4326;POINT(9.4536 0.4032)");
  });
});

describe("parseEwkbPoint", () => {
  it("décode un point EWKB little-endian avec SRID (format PostgREST)", () => {
    const hex = encodeEwkbPoint(9.457, 0.399);
    expect(parseEwkbPoint(hex)).toEqual({ lon: 9.457, lat: 0.399 });
  });

  it("décode aussi sans SRID et en big-endian", () => {
    expect(parseEwkbPoint(encodeEwkbPoint(-0.5, 12.25, { srid: false }))).toEqual({
      lon: -0.5,
      lat: 12.25,
    });
    expect(parseEwkbPoint(encodeEwkbPoint(9.1, 0.2, { littleEndian: false }))).toEqual({
      lon: 9.1,
      lat: 0.2,
    });
  });

  it("rejette autre chose qu'un Point", () => {
    // type 2 = LineString
    const hex = `0102000000${"00".repeat(16)}`;
    expect(() => parseEwkbPoint(hex)).toThrow(/pas un Point/);
  });
});

describe("decodePolyline6 (shape Valhalla)", () => {
  it("aller-retour sur un trajet Libreville", () => {
    const pts = [
      { lon: 9.4536, lat: 0.4032 },
      { lon: 9.458, lat: 0.406 },
      { lon: 9.4671, lat: 0.4148 },
      { lon: 9.4669, lat: 0.4147 },
    ];
    const decoded = decodePolyline6(encodePolyline6(pts));
    expect(decoded).toHaveLength(4);
    decoded.forEach((p, i) => {
      expect(p.lon).toBeCloseTo(pts[i]!.lon, 6);
      expect(p.lat).toBeCloseTo(pts[i]!.lat, 6);
    });
  });
  it("chaîne vide → aucun point", () => {
    expect(decodePolyline6("")).toEqual([]);
  });
});

describe("toLonLat (formats Supabase)", () => {
  it("accepte l'objet GeoJSON de PostgREST/Realtime (format vérifié sur la stack locale)", () => {
    expect(toLonLat({ type: "Point", coordinates: [9.457, 0.399] })).toEqual({
      lon: 9.457,
      lat: 0.399,
    });
  });
  it("accepte l'EWKB hexadécimal", () => {
    expect(toLonLat(encodeEwkbPoint(9.457, 0.399))).toEqual({ lon: 9.457, lat: 0.399 });
  });
  it("rejette le reste avec un message utile", () => {
    expect(() => toLonLat({ type: "Point", coordinates: [] } as never)).toThrow(/invalide/);
  });
});

describe("roundPosition (sobriété)", () => {
  it("5 décimales en mode normal (~1 m)", () => {
    expect(roundPosition({ lon: 9.4536789, lat: 0.4032111 })).toEqual({
      lon: 9.45368,
      lat: 0.40321,
    });
  });
  it("4 décimales en mode éco (~11 m)", () => {
    expect(roundPosition({ lon: 9.4536789, lat: 0.4032111 }, true)).toEqual({
      lon: 9.4537,
      lat: 0.4032,
    });
  });
});

describe("distanceM", () => {
  it("Pharmacie du Gros-Bouquet → Lycée Léon Mba ≈ 2 km", () => {
    const d = distanceM({ lon: 9.4536, lat: 0.4032 }, { lon: 9.4671, lat: 0.4148 });
    expect(d).toBeGreaterThan(1800);
    expect(d).toBeLessThan(2200);
  });
  it("distance nulle pour un même point", () => {
    expect(distanceM({ lon: 9.45, lat: 0.4 }, { lon: 9.45, lat: 0.4 })).toBe(0);
  });
});

describe("bboxAround", () => {
  it("englobe les points avec une marge", () => {
    const [w, s, e, n] = bboxAround([
      { lon: 9.45, lat: 0.4 },
      { lon: 9.47, lat: 0.41 },
    ]);
    expect(w).toBeLessThan(9.45);
    expect(e).toBeGreaterThan(9.47);
    expect(s).toBeLessThan(0.4);
    expect(n).toBeGreaterThan(0.41);
  });
  it("refuse une liste vide", () => {
    expect(() => bboxAround([])).toThrow();
  });
});

describe("pointAlong / bearingBetween (animations)", () => {
  const route = [
    { lon: 9.45, lat: 0.4 },
    { lon: 9.46, lat: 0.4 }, // segment est-ouest…
    { lon: 9.46, lat: 0.41 }, // …puis plein nord
  ];
  it("t=0 et t=1 tombent sur les extrémités", () => {
    expect(pointAlong(route, 0).position).toEqual(route[0]);
    expect(pointAlong(route, 1).position.lat).toBeCloseTo(0.41, 9);
  });
  it("paramétré par la distance : t=0.5 est à mi-chemin réel", () => {
    const { position } = pointAlong(route, 0.5);
    const total = distanceM(route[0]!, route[1]!) + distanceM(route[1]!, route[2]!);
    const parcouru =
      distanceM(route[0]!, route[1]!) >= total / 2
        ? distanceM(route[0]!, position)
        : distanceM(route[0]!, route[1]!) + distanceM(route[1]!, position);
    expect(parcouru).toBeCloseTo(total / 2, 0);
  });
  it("le cap suit le segment courant (est ≈ 90°, nord ≈ 0°)", () => {
    expect(pointAlong(route, 0.1).bearing).toBeCloseTo(90, 0);
    expect(pointAlong(route, 0.9).bearing).toBeCloseTo(0, 0);
  });
  it("t hors bornes est borné, itinéraire vide refusé", () => {
    expect(pointAlong(route, -1).position).toEqual(route[0]);
    expect(() => pointAlong([], 0.5)).toThrow();
  });
});
