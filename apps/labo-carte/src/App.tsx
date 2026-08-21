// Laboratoire carte — TEMPORAIRE. Teste de bout en bout :
//   @teko/maps (style, contrôleur, adaptateur) ↔ Martin (fond + repères) ↔
//   Valhalla (itinéraire réel) ↔ Supabase (repères, barème tarifaire).
// Cliquer sur la carte définit le départ puis l'arrivée (ou éditer les
// champs lon, lat). URL : ?o=lon,lat&d=lon,lat pour préremplir ;
// ?tiles= ?valhalla= ?supabase= pour viser d'autres environnements.

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type LandmarkRow,
  type LonLat,
  MAP_COLORS,
  TekoMapData,
  decodePolyline6,
  landmarksToGeoJson,
  roundPosition,
} from "@teko/maps";
import { TekoMapController } from "@teko/maps/web";

const params = new URLSearchParams(location.search);
const TILES = params.get("tiles") ?? "http://127.0.0.1:3333/gabon";
const VALHALLA = params.get("valhalla") ?? "http://127.0.0.1:8002";
const SUPABASE_URL = params.get("supabase") ?? "http://127.0.0.1:54321";
// Clé anon de la stack locale (publique par nature — c'est la clé démo du CLI).
const ANON_KEY =
  params.get("anon") ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

type Categorie = "eco" | "moto" | "confort";
const COSTING: Record<Categorie, string> = { eco: "auto", moto: "motorcycle", confort: "auto" };

// ---------------------------------------------------------------------------
// Scénarios de test (points de vue client / chauffeur) — données fictives
// mais réalistes, injectées dans les couches du composant carte.
// ---------------------------------------------------------------------------
type Scenario =
  | "libre"
  | "client-depart"
  | "client-course"
  | "chauffeur-attente"
  | "chauffeur-navigation"
  | "demo-course"
  | "demo-chauffeur";

const gj = (lon: number, lat: number) => ({ type: "Point" as const, coordinates: [lon, lat] });
const MOCK_LANDMARKS: LandmarkRow[] = [
  { id: "m1", name: "Marché de Mont-Bouët", aliases: [], category: "market", geom: gj(9.457, 0.399), salience: 9, usage_count: 214, photo_url: null },
  { id: "m2", name: "Pharmacie du Gros-Bouquet", aliases: [], category: "pharmacy", geom: gj(9.4536, 0.4032), salience: 7, usage_count: 88, photo_url: null },
  { id: "m3", name: "Station Total Glass", aliases: [], category: "fuel_station", geom: gj(9.449, 0.408), salience: 6, usage_count: 41, photo_url: null },
  { id: "m4", name: "École Publique d'Akébé", aliases: [], category: "school", geom: gj(9.4602, 0.4051), salience: 4, usage_count: 12, photo_url: null },
  { id: "m5", name: "Rond-point de la Démocratie", aliases: [], category: "roundabout", geom: gj(9.454, 0.392), salience: 10, usage_count: 156, photo_url: null },
  { id: "m6", name: "Église Saint-Michel", aliases: [], category: "church", geom: gj(9.4631, 0.4092), salience: 5, usage_count: 23, photo_url: null },
];
const MOCK_SAVED = [
  { id: "s1", kind: "home" as const, label: "Domicile", geom: gj(9.4512, 0.4009) },
  { id: "s2", kind: "work" as const, label: "Travail", geom: gj(9.4665, 0.413) },
  { id: "s3", kind: "other" as const, label: "Chez maman", geom: gj(9.4585, 0.3968) },
];
const MOCK_PROPOSED = [
  { id: "p1", coordinates: [{ lon: 9.455, lat: 0.404 }, { lon: 9.457, lat: 0.4055 }, { lon: 9.4585, lat: 0.407 }], supportCount: 14 },
  { id: "p2", coordinates: [{ lon: 9.4625, lat: 0.4022 }, { lon: 9.4648, lat: 0.4038 }], supportCount: 6 },
];
const MOCK_HOTSPOTS = [
  { id: "h1", lon: 9.457, lat: 0.399, count: 30 },
  { id: "h2", lon: 9.4536, lat: 0.4032, count: 18 },
  { id: "h3", lon: 9.4665, lat: 0.413, count: 9 },
];

const parsePoint = (v: string | null): LonLat | null => {
  const [lon, lat] = (v ?? "").split(",").map((s) => Number(s.trim()));
  return lon !== undefined && lat !== undefined && Number.isFinite(lon) && Number.isFinite(lat)
    ? { lon, lat }
    : null;
};
const fmt = (p: LonLat | null) => (p ? `${p.lon.toFixed(5)}, ${p.lat.toFixed(5)}` : "");

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<TekoMapController | null>(null);
  const modeRef = useRef<"depart" | "arrivee">("depart");

  const [mode, setMode] = useState<"depart" | "arrivee">("depart");
  const [depart, setDepart] = useState<LonLat | null>(parsePoint(params.get("o")));
  const [arrivee, setArrivee] = useState<LonLat | null>(parsePoint(params.get("d")));
  const [departTxt, setDepartTxt] = useState(fmt(parsePoint(params.get("o"))));
  const [arriveeTxt, setArriveeTxt] = useState(fmt(parsePoint(params.get("d"))));
  const [categorie, setCategorie] = useState<Categorie>("eco");
  const [eco, setEco] = useState(params.get("eco") === "1");
  const [resume, setResume] = useState<{ km: number; min: number } | null>(null);
  const [prix, setPrix] = useState<number | null>(null);
  const [nbReperes, setNbReperes] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario>(
    (params.get("sc") as Scenario) ?? "libre",
  );

  const supabase = useMemo(
    () => createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } }),
    [],
  );
  const mapData = useMemo(() => new TekoMapData(supabase), [supabase]);

  modeRef.current = mode;

  const setPoint = useCallback((which: "depart" | "arrivee", p: LonLat) => {
    const r = roundPosition(p);
    if (which === "depart") {
      setDepart(r);
      setDepartTxt(fmt(r));
      setMode("arrivee");
    } else {
      setArrivee(r);
      setArriveeTxt(fmt(r));
    }
  }, []);

  // Carte : (re)créée quand le mode éco change (le style change entièrement).
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new TekoMapController(containerRef.current, {
      eco,
      tilesUrl: TILES,
      center: { lon: 9.4536, lat: 0.4032 },
      zoom: 13,
    });
    map.map.on("load", () => {
      map.map.addSource("labo-dest", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.map.addLayer({
        id: "labo-dest-dot",
        type: "circle",
        source: "labo-dest",
        paint: {
          "circle-color": "#3D0F5C",
          "circle-radius": 8,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 3,
        },
      });
    });
    map.onClick((p) => setPoint(modeRef.current, p));
    mapRef.current = map;
    if (import.meta.env.DEV) (window as unknown as { __map: unknown }).__map = map.map;
    return () => {
      mapRef.current = null;
      map.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eco, setPoint]);

  // Démo animée : la course vue par le client, compréhensible sans lire —
  // épingle-personne (départ), épingle-drapeau (arrivée), voiture qui
  // approche, halo « il vous attend », point qui monte à bord, tracé
  // consommé pendant la course. Boucle en continu.
  const demoRunRef = useRef(0);
  const runDemo = useCallback(async () => {
    const runId = ++demoRunRef.current;
    const alive = () => demoRunRef.current === runId && mapRef.current;
    const m = mapRef.current!;
    const CAR_START = { lon: 9.4505, lat: 0.3952 };
    const PICKUP = { lon: 9.4536, lat: 0.4032 };
    const DEST = { lon: 9.4602, lat: 0.4051 };
    const fetchRoute = async (a: LonLat, b: LonLat) => {
      const r = await fetch(`${VALHALLA}/route`, {
        method: "POST",
        body: JSON.stringify({ locations: [{ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }], costing: "auto" }),
      }).then((x) => x.json());
      return decodePolyline6(r.trip.legs[0].shape) as LonLat[];
    };
    const dodo = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      const [approche, course] = await Promise.all([
        fetchRoute(CAR_START, PICKUP),
        fetchRoute(PICKUP, DEST),
      ]);
      m.setEndpoints(PICKUP, DEST);
      m.setLandmarks(landmarksToGeoJson(MOCK_LANDMARKS.slice(0, 4)));
      m.fitTo([{ lon: 9.4515, lat: 0.3955 }, DEST], 260);
      while (alive()) {
        // 1 — La voiture arrive vers vous.
        m.setClientAboard(false);
        m.setVehicleWaiting(false);
        m.setRouteProgress(null);
        m.setRoute(course);
        m.setClientPosition(PICKUP);
        const a1 = m.driveVehicleAlong("demo", approche, 7000);
        await a1.done;
        if (!alive()) return;
        // 2 — Elle vous attend (halo qui respire).
        m.setVehicleWaiting(true);
        await dodo(2600);
        if (!alive()) return;
        // 3 — Vous montez à bord (votre point rejoint la voiture).
        m.setVehicleWaiting(false);
        m.setClientAboard(true);
        m.setClientPosition(null);
        await dodo(1100);
        if (!alive()) return;
        // 4 — En course : le tracé se consomme derrière la voiture.
        const a2 = m.driveVehicleAlong("demo", course, 9000, { consumeRoute: true });
        await a2.done;
        if (!alive()) return;
        // 5 — Arrivée : le drapeau a gagné ; petite pause puis on rejoue.
        m.setClientAboard(false);
        m.setClientPosition(DEST);
        await dodo(2200);
      }
    } catch {
      /* Valhalla absent : la démo s'arrête silencieusement */
    }
  }, []);

  // Démo animée côté CHAUFFEUR — même grammaire sans texte, point de vue
  // inversé : le client qui attend pulse (quelqu'un vous attend là), le
  // drapeau n'apparaît qu'APRÈS acceptation (anti-écrémage), votre voiture
  // roule, le halo dit « j'attends le client », le cœur magenta dit
  // « client à bord ». Boucle continue.
  const runDemoChauffeur = useCallback(async () => {
    const runId = ++demoRunRef.current;
    const alive = () => demoRunRef.current === runId && mapRef.current;
    const m = mapRef.current!;
    const ME_START = { lon: 9.4585, lat: 0.3975 };
    const PICKUP = { lon: 9.4536, lat: 0.4032 };
    const DEST = { lon: 9.4602, lat: 0.4051 };
    const fetchRoute = async (a: LonLat, b: LonLat) => {
      const r = await fetch(`${VALHALLA}/route`, {
        method: "POST",
        body: JSON.stringify({ locations: [{ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }], costing: "auto" }),
      }).then((x) => x.json());
      return decodePolyline6(r.trip.legs[0].shape) as LonLat[];
    };
    const dodo = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      const [versClient, course] = await Promise.all([
        fetchRoute(ME_START, PICKUP),
        fetchRoute(PICKUP, DEST),
      ]);
      m.fitTo([{ lon: 9.4525, lat: 0.3965 }, DEST], 260);
      while (alive()) {
        // 0 — En attente, personne à bord.
        m.setClientAboard(false);
        m.setVehicleWaiting(false);
        m.setRouteProgress(null);
        m.setRoute([]);
        m.setEndpoints(null, null);
        m.setClientPosition(null);
        m.setVehicles([{ id: "moi", ...ME_START, bearing: 0 }]);
        await dodo(1200);
        if (!alive()) return;
        // 1 — Offre : quelqu'un vous attend LÀ (pulse) — destination cachée.
        m.setClientPosition(PICKUP);
        m.setEndpoints(PICKUP, null);
        await dodo(2200);
        if (!alive()) return;
        // 2 — Acceptée : le drapeau et l'itinéraire apparaissent, on roule.
        m.setEndpoints(PICKUP, DEST);
        m.setRoute(versClient);
        const a1 = m.driveVehicleAlong("moi", versClient, 6500, { consumeRoute: true });
        await a1.done;
        if (!alive()) return;
        // 3 — Arrivé : « j'attends le client » (halo).
        m.setVehicleWaiting(true);
        await dodo(2400);
        if (!alive()) return;
        // 4 — Client à bord.
        m.setVehicleWaiting(false);
        m.setClientAboard(true);
        m.setClientPosition(null);
        await dodo(1000);
        if (!alive()) return;
        // 5 — Course vers le drapeau, tracé consommé.
        m.setRoute(course);
        m.setRouteProgress(null);
        const a2 = m.driveVehicleAlong("moi", course, 8000, { consumeRoute: true });
        await a2.done;
        if (!alive()) return;
        m.setClientAboard(false);
        await dodo(2000);
      }
    } catch {
      /* Valhalla absent : la démo s'arrête silencieusement */
    }
  }, []);

  // Scénarios client/chauffeur : injecte le vocabulaire carte correspondant.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    demoRunRef.current++; // stoppe une éventuelle démo en cours
    m.setSavedPlaces([]);
    m.setProposedRoads([]);
    m.setDepartureHotspots([]);
    m.setVehicles([]);
    m.setEndpoints(null, null);
    m.setVehicleWaiting(false);
    m.setClientAboard(false);
    m.setRouteProgress(null);
    switch (scenario) {
      case "demo-course":
        void runDemo();
        break;
      case "demo-chauffeur":
        void runDemoChauffeur();
        break;
      case "client-depart":
        // C-08 : choisir le départ — favoris D/T/★, repères par catégorie.
        m.setSavedPlaces(MOCK_SAVED);
        m.setLandmarks(landmarksToGeoJson(MOCK_LANDMARKS));
        setDepart({ lon: 9.4512, lat: 0.4009 });
        setDepartTxt("9.45120, 0.40090");
        m.fitTo([{ lon: 9.449, lat: 0.392 }, { lon: 9.467, lat: 0.413 }], 250);
        break;
      case "client-course":
        // C-13 : en course — itinéraire liseré, véhicule orienté, favoris.
        m.setSavedPlaces(MOCK_SAVED);
        m.setLandmarks(landmarksToGeoJson(MOCK_LANDMARKS.slice(0, 3)));
        m.setVehicles([{ id: "boris", lon: 9.4581, lat: 0.4066, bearing: 52 }]);
        setDepart({ lon: 9.4512, lat: 0.4009 });
        setDepartTxt("9.45120, 0.40090");
        setArrivee({ lon: 9.4665, lat: 0.413 });
        setArriveeTxt("9.46650, 0.41300");
        break;
      case "chauffeur-attente":
        // D-09 : en ligne, en attente — zones de départ fréquentes (halos),
        // repères, routes détectées « à confirmer ».
        m.setDepartureHotspots(MOCK_HOTSPOTS);
        m.setLandmarks(landmarksToGeoJson(MOCK_LANDMARKS));
        m.setProposedRoads(MOCK_PROPOSED);
        m.setVehicles([{ id: "moi", lon: 9.4555, lat: 0.4028, bearing: 130 }]);
        m.fitTo([{ lon: 9.449, lat: 0.394 }, { lon: 9.468, lat: 0.412 }], 220);
        break;
      case "chauffeur-navigation":
        // D-11 : navigation — itinéraire, cap du véhicule, route à confirmer
        // croisée en chemin, repère de rendez-vous.
        m.setLandmarks(landmarksToGeoJson([MOCK_LANDMARKS[1]!, MOCK_LANDMARKS[3]!]));
        m.setProposedRoads(MOCK_PROPOSED);
        m.setVehicles([{ id: "moi", lon: 9.4548, lat: 0.4041, bearing: 48 }]);
        setDepart({ lon: 9.4536, lat: 0.4032 });
        setDepartTxt("9.45360, 0.40320");
        setArrivee({ lon: 9.4602, lat: 0.4051 });
        setArriveeTxt("9.46020, 0.40510");
        break;
      default:
        break;
    }
  }, [scenario, eco, runDemo, runDemoChauffeur]);

  // Départ : point client magenta + repères proches (Supabase RPC).
  useEffect(() => {
    mapRef.current?.setClientPosition(depart);
    if (!depart) return;
    if (scenario !== "libre") return; // les scénarios injectent leurs repères
    mapData
      .nearestLandmarks(depart, { maxM: 800, limit: 8 })
      .then((fc) => {
        mapRef.current?.setLandmarks(fc);
        setNbReperes(fc.features.length);
      })
      .catch(() => setNbReperes(null)); // Supabase absent : pas bloquant
  }, [depart, mapData, eco]);

  // Arrivée : pastille brand-900.
  useEffect(() => {
    const src = mapRef.current?.map.getSource("labo-dest") as
      | { setData: (d: unknown) => void }
      | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: arrivee
        ? [{ type: "Feature", geometry: { type: "Point", coordinates: [arrivee.lon, arrivee.lat] }, properties: {} }]
        : [],
    });
  }, [arrivee, eco]);

  // Itinéraire réel + estimation tarifaire dès que les deux points existent.
  useEffect(() => {
    if (!depart || !arrivee) {
      setResume(null);
      setPrix(null);
      mapRef.current?.setRoute([]);
      return;
    }
    let annule = false;
    setErreur(null);
    (async () => {
      try {
        const r = await fetch(`${VALHALLA}/route`, {
          method: "POST",
          body: JSON.stringify({
            locations: [
              { lat: depart.lat, lon: depart.lon },
              { lat: arrivee.lat, lon: arrivee.lon },
            ],
            costing: COSTING[categorie],
          }),
        }).then((x) => x.json());
        if (annule) return;
        if (!r.trip) throw new Error(r.error ?? "aucun itinéraire trouvé");
        const km: number = r.trip.summary.length;
        const sec: number = r.trip.summary.time;
        mapRef.current?.setRoute(decodePolyline6(r.trip.legs[0].shape));
        mapRef.current?.fitTo([depart, arrivee], 400);
        setResume({ km, min: sec / 60 });
        const est = await supabase.rpc("estimate_price", {
          p_category: categorie,
          p_distance_m: Math.round(km * 1000),
          p_duration_s: Math.round(sec),
        });
        if (!annule) setPrix(est.error ? null : Number(est.data));
      } catch (e) {
        if (!annule) {
          setResume(null);
          setPrix(null);
          setErreur(`Itinéraire indisponible : ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    })();
    return () => {
      annule = true;
    };
  }, [depart, arrivee, categorie, supabase, eco]);

  const onChampEnter = (which: "depart" | "arrivee", txt: string) => {
    const p = parsePoint(txt);
    if (p) setPoint(which, p);
  };

  return (
    <div className="labo">
      <div ref={containerRef} className="carte" />
      <div className={`panneau ${scenario.startsWith("demo-") ? "panneau--mini" : ""}`}>
        <h1>Teko — labo carte</h1>
        <p className="note">
          Temporaire · fond Martin + itinéraire Valhalla + tarifs Supabase
        </p>
        {scenario.startsWith("demo-") && (
          <div className="rangee">
            <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
              <option value="libre">Scénario : libre</option>
              <option value="demo-course">Démo animée — la course du client</option>
              <option value="demo-chauffeur">Démo animée — côté chauffeur</option>
            </select>
          </div>
        )}
        {!scenario.startsWith("demo-") && (<>
        <div className={`champ ${mode === "depart" ? "actif" : ""}`}>
          <span className="pastille" style={{ background: MAP_COLORS.markerClient }} />
          <input
            placeholder="Départ — cliquer la carte ou lon, lat"
            value={departTxt}
            onChange={(e) => setDepartTxt(e.target.value)}
            onBlur={(e) => onChampEnter("depart", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onChampEnter("depart", departTxt)}
            onFocus={() => setMode("depart")}
          />
        </div>
        <div className={`champ ${mode === "arrivee" ? "actif" : ""}`}>
          <span className="pastille" style={{ background: "#3D0F5C" }} />
          <input
            placeholder="Arrivée — cliquer la carte ou lon, lat"
            value={arriveeTxt}
            onChange={(e) => setArriveeTxt(e.target.value)}
            onBlur={(e) => onChampEnter("arrivee", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onChampEnter("arrivee", arriveeTxt)}
            onFocus={() => setMode("arrivee")}
          />
        </div>
        <div className="rangee">
          <select value={categorie} onChange={(e) => setCategorie(e.target.value as Categorie)}>
            <option value="eco">Éco</option>
            <option value="moto">Moto-taxi</option>
            <option value="confort">Confort</option>
          </select>
          <button
            onClick={() => {
              const d = depart;
              setDepart(arrivee);
              setArrivee(d);
              setDepartTxt(fmt(arrivee));
              setArriveeTxt(fmt(d));
            }}
          >
            ⇅ Inverser
          </button>
          <button
            onClick={() => {
              setDepart(null);
              setArrivee(null);
              setDepartTxt("");
              setArriveeTxt("");
              setMode("depart");
              mapRef.current?.setLandmarks({ type: "FeatureCollection", features: [] });
            }}
          >
            Effacer
          </button>
        </div>
        <div className="rangee">
          <label>
            <input type="checkbox" checked={eco} onChange={(e) => setEco(e.target.checked)} />
            Mode éco (sans tuiles)
          </label>
        </div>
        <div className="rangee">
          <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
            <option value="libre">Scénario : libre</option>
            <option value="client-depart">Client — choisir le départ</option>
            <option value="client-course">Client — en course</option>
            <option value="chauffeur-attente">Chauffeur — en attente</option>
            <option value="chauffeur-navigation">Chauffeur — navigation</option>
            <option value="demo-course">Démo animée — la course du client</option>
            <option value="demo-chauffeur">Démo animée — côté chauffeur</option>
          </select>
        </div>
        {resume && (
          <div className="resume">
            <div className="ligne1">
              {resume.km.toFixed(2).replace(".", ",")} km · {Math.round(resume.min)} min
              {prix !== null && ` · ≈ ${prix.toLocaleString("fr-FR")} F`}
            </div>
            <div className="ligne2">
              {prix !== null
                ? `Estimation ${categorie} (barème Supabase) — itinéraire Valhalla réel`
                : "Itinéraire Valhalla réel — barème indisponible (Supabase ?)"}
            </div>
          </div>
        )}
        {nbReperes !== null && depart && (
          <div className="info">
            {nbReperes} repère{nbReperes > 1 ? "s" : ""} autour du départ (RPC nearest_landmarks)
          </div>
        )}
        {erreur && <div className="erreur">{erreur}</div>}
        </>)}
      </div>
      <div className="aide">
        Clic = {mode === "depart" ? "définir le DÉPART" : "définir l'ARRIVÉE"}
      </div>
    </div>
  );
}
