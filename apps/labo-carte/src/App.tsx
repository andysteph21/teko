// Laboratoire carte — TEMPORAIRE. Teste de bout en bout :
//   @teko/maps (style, contrôleur, adaptateur) ↔ Martin (fond + repères) ↔
//   Valhalla (itinéraire réel) ↔ Supabase (repères, barème tarifaire).
// Cliquer sur la carte définit le départ puis l'arrivée (ou éditer les
// champs lon, lat). URL : ?o=lon,lat&d=lon,lat pour préremplir ;
// ?tiles= ?valhalla= ?supabase= pour viser d'autres environnements.

import { createClient } from "@supabase/supabase-js";
import {
  decodePolyline6,
  type LandmarkRow,
  type LonLat,
  landmarksToGeoJson,
  MAP_COLORS,
  type MapModePreference,
  resolveMapMode,
  roundPosition,
  TekoMapData,
} from "@teko/maps";
import { TekoMapController } from "@teko/maps/web";
import { currentNetworkHint, watchMapMode } from "@teko/maps/web/network";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  | "demo-chauffeur"
  | "demo-adresses"
  | "demo-poi"
  | "demo-admin";

const gj = (lon: number, lat: number) => ({ type: "Point" as const, coordinates: [lon, lat] });
const MOCK_LANDMARKS: LandmarkRow[] = [
  {
    id: "m1",
    name: "Marché de Mont-Bouët",
    aliases: [],
    category: "market",
    geom: gj(9.457, 0.399),
    salience: 9,
    usage_count: 214,
    photo_url: null,
  },
  {
    id: "m2",
    name: "Pharmacie du Gros-Bouquet",
    aliases: [],
    category: "pharmacy",
    geom: gj(9.4536, 0.4032),
    salience: 7,
    usage_count: 88,
    photo_url: null,
  },
  {
    id: "m3",
    name: "Station Total Glass",
    aliases: [],
    category: "fuel_station",
    geom: gj(9.449, 0.408),
    salience: 6,
    usage_count: 41,
    photo_url: null,
  },
  {
    id: "m4",
    name: "École Publique d'Akébé",
    aliases: [],
    category: "school",
    geom: gj(9.4602, 0.4051),
    salience: 4,
    usage_count: 12,
    photo_url: null,
  },
  {
    id: "m5",
    name: "Rond-point de la Démocratie",
    aliases: [],
    category: "roundabout",
    geom: gj(9.454, 0.392),
    salience: 10,
    usage_count: 156,
    photo_url: null,
  },
  {
    id: "m6",
    name: "Église Saint-Michel",
    aliases: [],
    category: "church",
    geom: gj(9.4631, 0.4092),
    salience: 5,
    usage_count: 23,
    photo_url: null,
  },
];
const MOCK_SAVED = [
  { id: "s1", kind: "home" as const, label: "Domicile", geom: gj(9.4512, 0.4009) },
  { id: "s2", kind: "work" as const, label: "Travail", geom: gj(9.4665, 0.413) },
  { id: "s3", kind: "other" as const, label: "Chez maman", geom: gj(9.4585, 0.3968) },
];
const MOCK_PROPOSED = [
  {
    id: "p1",
    coordinates: [
      { lon: 9.455, lat: 0.404 },
      { lon: 9.457, lat: 0.4055 },
      { lon: 9.4585, lat: 0.407 },
    ],
    supportCount: 14,
  },
  {
    id: "p2",
    coordinates: [
      { lon: 9.4625, lat: 0.4022 },
      { lon: 9.4648, lat: 0.4038 },
    ],
    supportCount: 6,
  },
];
const MOCK_HOTSPOTS = [
  { id: "h1", lon: 9.457, lat: 0.399, count: 30 },
  { id: "h2", lon: 9.4536, lat: 0.4032, count: 18 },
  { id: "h3", lon: 9.4665, lat: 0.413, count: 9 },
];

// Pictogrammes de phase — compréhensibles sans lire (SVG inline).
function Picto({ k }: { k: string }) {
  const c = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (k) {
    case "voiture":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...c}>
          <path d="M4 15l1.5-5.5A2 2 0 0 1 7.4 8h9.2a2 2 0 0 1 1.9 1.5L20 15" />
          <path d="M3 15h18v3h-2.5M3 18h2.5" />
          <circle cx="7.5" cy="18" r="1.6" />
          <circle cx="16.5" cy="18" r="1.6" />
        </svg>
      );
    case "attente":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...c}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2.2" />
        </svg>
      );
    case "personne":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...c}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "drapeau":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...c}>
          <path d="M6 21V4" />
          <path d="M6 5h11l-2.5 3.5L17 12H6" />
        </svg>
      );
    case "coche":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...c}>
          <path d="M4.5 12.5l5 5 10-11" />
        </svg>
      );
    case "onde":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...c}>
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <path d="M7.5 16.5a6.4 6.4 0 0 1 0-9M16.5 7.5a6.4 6.4 0 0 1 0 9" />
          <path d="M4.8 19.2a10.2 10.2 0 0 1 0-14.4M19.2 4.8a10.2 10.2 0 0 1 0 14.4" />
        </svg>
      );
    case "route":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...c}>
          <path d="M5 21c4-4 4-8 0-12 5-5 9-5 14 0" strokeDasharray="3 3" />
        </svg>
      );
    default:
      return null;
  }
}

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
  const [modePref, setModePref] = useState<MapModePreference>(
    (params.get("mode") as MapModePreference) ?? (params.get("eco") === "1" ? "eco" : "auto"),
  );
  const reseauForce = params.get("reseau"); // test : ?reseau=2g simule un réseau lent
  const resolu = useMemo(
    () =>
      resolveMapMode(modePref, reseauForce ? { effectiveType: reseauForce } : currentNetworkHint()),
    [modePref, reseauForce],
  );
  const eco = resolu.mode === "eco";
  // En « auto », suit les changements réels du réseau (C-25).
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (modePref !== "auto" || reseauForce) return;
    const w = watchMapMode("auto", () => forceTick((n) => n + 1));
    return w.stop;
  }, [modePref, reseauForce]);
  const [resume, setResume] = useState<{ km: number; min: number } | null>(null);
  const [prix, setPrix] = useState<number | null>(null);
  const [nbReperes, setNbReperes] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario>((params.get("sc") as Scenario) ?? "libre");
  // Habillage vidéo : ?rec=1 masque le chrome du labo et affiche la marque
  // + l'indicateur de phase (pictogramme, lisible sans lire).
  const rec = params.get("rec") === "1";
  const [phase, setPhase] = useState<{ picto: string; texte: string } | null>(null);

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
      map.map.addSource("labo-valide", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.map.addLayer({
        id: "labo-valide-line",
        type: "line",
        source: "labo-valide",
        layout: { "line-cap": "round" },
        paint: { "line-color": "#5A1A80", "line-width": 4 },
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

  // --- Doigt simulé (vidéos) : tap avec onde, swipe qui entraîne la carte ---
  const doigtRef = useRef<HTMLDivElement>(null);
  const doigt = useMemo(() => {
    const el = () => doigtRef.current;
    const move = (x: number, y: number) => {
      const d = el();
      if (d) d.style.transform = `translate(${x - 17}px, ${y - 17}px)`;
    };
    const visible = (v: boolean) => {
      const d = el();
      if (d) d.style.opacity = v ? "1" : "0";
    };
    const dodo = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const tap = async (x: number, y: number) => {
      move(x, y);
      visible(true);
      await dodo(180);
      el()?.classList.add("tap");
      await dodo(400);
      el()?.classList.remove("tap");
      visible(false);
      await dodo(150);
    };
    const tapLngLat = async (p: LonLat) => {
      const m = mapRef.current;
      if (!m) return;
      const pt = m.map.project([p.lon, p.lat]);
      await tap(pt.x, pt.y);
    };
    // Swipe : le doigt glisse et la carte SUIT le doigt (drag réel).
    const swipe = async (x1: number, y1: number, x2: number, y2: number, ms: number) => {
      const m = mapRef.current;
      if (!m) return;
      move(x1, y1);
      visible(true);
      await dodo(160);
      const start = performance.now();
      let px = x1;
      let py = y1;
      await new Promise<void>((res) => {
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / ms);
          const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
          const nx = x1 + (x2 - x1) * e;
          const ny = y1 + (y2 - y1) * e;
          m.map.panBy([px - nx, py - ny], { duration: 0, animate: false });
          move(nx, ny);
          px = nx;
          py = ny;
          if (t < 1) requestAnimationFrame(tick);
          else res();
        };
        requestAnimationFrame(tick);
      });
      visible(false);
      await dodo(150);
    };
    // Amène un lieu au centre de l'écran par un swipe naturel.
    const swipeVers = async (p: LonLat, ms = 1100) => {
      const m = mapRef.current;
      if (!m) return;
      const c = m.map.getContainer();
      const cx = c.clientWidth / 2;
      const cy = c.clientHeight / 2;
      const pt = m.map.project([p.lon, p.lat]);
      await swipe(pt.x, pt.y, cx, cy, ms);
    };
    return { tap, tapLngLat, swipe, swipeVers };
  }, []);

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
        body: JSON.stringify({
          locations: [
            { lat: a.lat, lon: a.lon },
            { lat: b.lat, lon: b.lon },
          ],
          costing: "auto",
        }),
      }).then((x) => x.json());
      return decodePolyline6(r.trip.legs[0].shape) as LonLat[];
    };
    const dodo = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      const [approche, course] = await Promise.all([
        fetchRoute(CAR_START, PICKUP),
        fetchRoute(PICKUP, DEST),
      ]);
      m.setLandmarks(landmarksToGeoJson(MOCK_LANDMARKS.slice(0, 4)));
      m.fitTo([{ lon: 9.4515, lat: 0.3955 }, DEST], 260);
      while (alive()) {
        // 0 — L'utilisateur compose sa course : tap départ, tap destination.
        m.setClientAboard(false);
        m.setVehicleWaiting(false);
        m.setRouteProgress(null);
        m.setRoute([]);
        m.setEndpoints(null, null);
        m.setClientPosition(null);
        m.setVehicles([]);
        setPhase({ picto: "personne", texte: "Choisissez votre départ" });
        await dodo(700);
        await doigt.tapLngLat(PICKUP);
        m.setEndpoints(PICKUP, null);
        m.setClientPosition(PICKUP);
        setPhase({ picto: "drapeau", texte: "Choisissez l'arrivée" });
        await dodo(650);
        if (!alive()) return;
        await doigt.tapLngLat(DEST);
        m.setEndpoints(PICKUP, DEST);
        m.setRoute(course);
        await dodo(900);
        if (!alive()) return;
        // 1 — La voiture arrive vers vous.
        setPhase({ picto: "voiture", texte: "Votre chauffeur arrive" });
        const a1 = m.driveVehicleAlong("demo", approche, 7000);
        await a1.done;
        if (!alive()) return;
        // 2 — Elle vous attend (halo qui respire).
        setPhase({ picto: "attente", texte: "Votre chauffeur vous attend" });
        m.setVehicleWaiting(true);
        await dodo(2600);
        if (!alive()) return;
        // 3 — Vous montez à bord (votre point rejoint la voiture).
        setPhase({ picto: "personne", texte: "Montez à bord" });
        m.setVehicleWaiting(false);
        m.setClientAboard(true);
        m.setClientPosition(null);
        await dodo(1100);
        if (!alive()) return;
        // 4 — En course : le tracé se consomme derrière la voiture.
        setPhase({ picto: "voiture", texte: "En course" });
        const a2 = m.driveVehicleAlong("demo", course, 9000, { consumeRoute: true });
        await a2.done;
        if (!alive()) return;
        // 5 — Arrivée : le drapeau a gagné ; petite pause puis on rejoue.
        setPhase({ picto: "coche", texte: "Vous êtes arrivé" });
        m.setClientAboard(false);
        m.setClientPosition(DEST);
        await dodo(2200);
      }
    } catch {
      /* Valhalla absent : la démo s'arrête silencieusement */
    }
  }, [doigt.tapLngLat]);

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
        body: JSON.stringify({
          locations: [
            { lat: a.lat, lon: a.lon },
            { lat: b.lat, lon: b.lon },
          ],
          costing: "auto",
        }),
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
        // En attente : le chauffeur consulte les zones de départ fréquentes.
        setPhase({ picto: "onde", texte: "En ligne — en attente" });
        m.setDepartureHotspots(MOCK_HOTSPOTS);
        await dodo(900);
        await doigt.swipeVers({ lon: 9.457, lat: 0.399 }, 1100);
        await dodo(700);
        if (!alive()) return;
        // 1 — Offre : quelqu'un vous attend LÀ (pulse) — destination cachée.
        setPhase({ picto: "personne", texte: "Nouvelle offre — 12 s" });
        m.setClientPosition(PICKUP);
        m.setEndpoints(PICKUP, null);
        await doigt.swipeVers(PICKUP, 900);
        await dodo(900);
        if (!alive()) return;
        // 2 — Le chauffeur TAPE sur l'offre pour accepter : le drapeau et
        // l'itinéraire apparaissent, on roule.
        await doigt.tapLngLat(PICKUP);
        m.setDepartureHotspots([]);
        setPhase({ picto: "voiture", texte: "Vers le client" });
        m.setEndpoints(PICKUP, DEST);
        m.setRoute(versClient);
        const a1 = m.driveVehicleAlong("moi", versClient, 6500, { consumeRoute: true });
        await a1.done;
        if (!alive()) return;
        // 3 — Arrivé : « j'attends le client » (halo).
        setPhase({ picto: "attente", texte: "Sur place — j'attends le client" });
        m.setVehicleWaiting(true);
        await dodo(2400);
        if (!alive()) return;
        // 4 — Client à bord.
        setPhase({ picto: "personne", texte: "Client à bord" });
        m.setVehicleWaiting(false);
        m.setClientAboard(true);
        m.setClientPosition(null);
        await dodo(1000);
        if (!alive()) return;
        // 5 — Course vers le drapeau, tracé consommé.
        setPhase({ picto: "voiture", texte: "En course" });
        m.setRoute(course);
        m.setRouteProgress(null);
        const a2 = m.driveVehicleAlong("moi", course, 8000, { consumeRoute: true });
        await a2.done;
        if (!alive()) return;
        setPhase({ picto: "coche", texte: "Course terminée" });
        m.setClientAboard(false);
        await dodo(2000);
      }
    } catch {
      /* Valhalla absent : la démo s'arrête silencieusement */
    }
  }, [doigt.swipeVers, doigt.tapLngLat]);

  // Démo « adresses » : la course en mode COMPLET, caméra qui SUIT la
  // voiture au zoom rue — les noms d'avenues, de rues et de quartiers
  // défilent, lisibles, pendant tout le trajet.
  const runDemoAdresses = useCallback(async () => {
    const runId = ++demoRunRef.current;
    const alive = () => demoRunRef.current === runId && mapRef.current;
    const m = mapRef.current!;
    const PICKUP = { lon: 9.4512, lat: 0.4009 };
    const DEST = { lon: 9.4665, lat: 0.413 };
    const dodo = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      const r = await fetch(`${VALHALLA}/route`, {
        method: "POST",
        body: JSON.stringify({
          locations: [
            { lat: PICKUP.lat, lon: PICKUP.lon },
            { lat: DEST.lat, lon: DEST.lon },
          ],
          costing: "auto",
        }),
      }).then((x) => x.json());
      const course = decodePolyline6(r.trip.legs[0].shape) as LonLat[];
      while (alive()) {
        m.setClientAboard(false);
        m.setVehicleWaiting(false);
        m.setEndpoints(null, null);
        m.setRoute([]);
        m.setRouteProgress(null);
        m.setVehicles([]);
        m.setSavedPlaces(MOCK_SAVED.slice(0, 2));
        // L'utilisateur part de son quartier : tap sur « Domicile » (D)…
        m.map.jumpTo({ center: [PICKUP.lon, PICKUP.lat], zoom: 14.6 });
        m.setClientPosition(PICKUP);
        setPhase({ picto: "personne", texte: "Choisissez votre départ" });
        await dodo(1100);
        await doigt.tapLngLat(PICKUP);
        m.setEndpoints(PICKUP, null);
        setPhase({ picto: "drapeau", texte: "Choisissez l'arrivée" });
        await dodo(600);
        if (!alive()) return;
        // …swipe vers « Travail » (T), puis tap pour poser le drapeau.
        await doigt.swipeVers(DEST, 1300);
        await dodo(350);
        await doigt.tapLngLat(DEST);
        m.setEndpoints(PICKUP, DEST);
        m.setRoute(course);
        await dodo(900);
        if (!alive()) return;
        // La course démarre : caméra au zoom rue, les adresses défilent.
        setPhase({ picto: "voiture", texte: "En course — suivez les rues" });
        m.setClientAboard(true);
        m.setClientPosition(null);
        m.map.jumpTo({ center: [PICKUP.lon, PICKUP.lat], zoom: 16 });
        await dodo(700);
        const a = m.driveVehicleAlong("moi", course, 20000, {
          consumeRoute: true,
          follow: { zoom: 16 },
        });
        await a.done;
        if (!alive()) return;
        setPhase({ picto: "coche", texte: "Vous êtes arrivé" });
        m.setClientAboard(false);
        m.setClientPosition(DEST);
        await dodo(2200);
      }
    } catch {
      /* Valhalla absent */
    }
  }, [doigt.tapLngLat, doigt.swipeVers]);

  // Démo « POI » : choisir départ et destination PAR points d'intérêt — la
  // caméra visite les repères candidats, s'arrête sur le choix, puis la
  // course relie le marché à l'école.
  const runDemoPoi = useCallback(async () => {
    const runId = ++demoRunRef.current;
    const alive = () => demoRunRef.current === runId && mapRef.current;
    const m = mapRef.current!;
    const MARCHE = { lon: 9.457, lat: 0.399 };
    const ECOLE = { lon: 9.4602, lat: 0.4051 };
    const dodo = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const ease = (c: LonLat, z: number, ms: number) =>
      new Promise<void>((res) => {
        m.map.easeTo({ center: [c.lon, c.lat], zoom: z, duration: ms });
        m.map.once("moveend", () => res());
      });
    try {
      const r = await fetch(`${VALHALLA}/route`, {
        method: "POST",
        body: JSON.stringify({
          locations: [
            { lat: MARCHE.lat, lon: MARCHE.lon },
            { lat: ECOLE.lat, lon: ECOLE.lon },
          ],
          costing: "auto",
        }),
      }).then((x) => x.json());
      const course = decodePolyline6(r.trip.legs[0].shape) as LonLat[];
      while (alive()) {
        m.setClientAboard(false);
        m.setVehicleWaiting(false);
        m.setVehicles([]);
        m.setRoute([]);
        m.setRouteProgress(null);
        m.setEndpoints(null, null);
        m.setClientPosition(null);
        m.setLandmarks(landmarksToGeoJson(MOCK_LANDMARKS));
        m.map.jumpTo({ center: [9.457, 0.401], zoom: 13.6 });
        setPhase({ picto: "onde", texte: "Explorez les repères de la ville" });
        await dodo(1600);
        if (!alive()) return;
        // L'utilisateur explore au doigt, amène le Marché au centre, et TAPE
        // sur le repère M pour en faire son départ.
        await doigt.swipeVers(MARCHE, 1200);
        await ease(MARCHE, 15.6, 900);
        await dodo(400);
        await doigt.tapLngLat(MARCHE);
        m.setEndpoints(MARCHE, null);
        m.setClientPosition(MARCHE);
        setPhase({ picto: "personne", texte: "Départ : Marché de Mont-Bouët" });
        await dodo(1100);
        if (!alive()) return;
        // Swipe vers l'École (É), tap : le drapeau se pose sur le POI.
        await doigt.swipeVers(ECOLE, 1300);
        await dodo(350);
        await doigt.tapLngLat(ECOLE);
        m.setEndpoints(MARCHE, ECOLE);
        setPhase({ picto: "drapeau", texte: "Arrivée : École d'Akébé" });
        await dodo(1100);
        if (!alive()) return;
        m.setRoute(course);
        m.map.jumpTo({
          center: [(MARCHE.lon + ECOLE.lon) / 2, (MARCHE.lat + ECOLE.lat) / 2],
          zoom: 15.1,
        });
        m.setClientAboard(true);
        m.setClientPosition(null);
        setPhase({ picto: "voiture", texte: "En course" });
        const a = m.driveVehicleAlong("moi", course, 9000, { consumeRoute: true });
        await a.done;
        if (!alive()) return;
        setPhase({ picto: "coche", texte: "Vous êtes arrivé" });
        m.setClientAboard(false);
        m.setClientPosition(ECOLE);
        await dodo(2200);
      }
    } catch {
      /* Valhalla absent */
    }
  }, [doigt.swipeVers, doigt.tapLngLat]);

  // Démo ADMIN (console carto, A-04) : surveiller la flotte, puis VALIDER
  // au doigt les routes détectées — le pointillé « à confirmer » devient un
  // trait plein, visible pour tous, sans rebuild.
  const runDemoAdmin = useCallback(async () => {
    const runId = ++demoRunRef.current;
    const alive = () => demoRunRef.current === runId && mapRef.current;
    const m = mapRef.current!;
    const dodo = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const milieu = (p: { coordinates: LonLat[] }) =>
      p.coordinates[Math.floor(p.coordinates.length / 2)]!;
    const setValide = (lignes: LonLat[][]) => {
      (m.map.getSource("labo-valide") as { setData: (d: unknown) => void } | undefined)?.setData({
        type: "FeatureCollection",
        features: lignes.map((l) => ({
          type: "Feature",
          geometry: { type: "LineString", coordinates: l.map((p) => [p.lon, p.lat]) },
          properties: {},
        })),
      });
    };
    const ease = (c: LonLat, z: number, ms: number) =>
      new Promise<void>((res) => {
        m.map.easeTo({ center: [c.lon, c.lat], zoom: z, duration: ms });
        m.map.once("moveend", () => res());
      });
    try {
      while (alive()) {
        // 0 — Vue d'ensemble : flotte, zones de départ, repères.
        setPhase({ picto: "onde", texte: "Flotte en direct — 4 chauffeurs" });
        m.setLandmarks(landmarksToGeoJson(MOCK_LANDMARKS));
        m.setDepartureHotspots(MOCK_HOTSPOTS);
        m.setProposedRoads(MOCK_PROPOSED);
        setValide([]);
        m.setVehicles([
          { id: "d1", lon: 9.4512, lat: 0.4009, bearing: 120 },
          { id: "d2", lon: 9.4598, lat: 0.4102, bearing: 30 },
          { id: "d3", lon: 9.4643, lat: 0.4033, bearing: 80 },
          { id: "d4", lon: 9.4551, lat: 0.4168, bearing: 300 },
        ]);
        m.setEndpoints(null, null);
        m.setClientPosition(null);
        m.setRoute([]);
        m.setRouteProgress(null);
        m.map.jumpTo({ center: [9.457, 0.404], zoom: 13.7 });
        await dodo(2400);
        if (!alive()) return;
        // 1 — Première route détectée : l'admin s'en approche et la valide.
        setPhase({ picto: "route", texte: "Route détectée — 14 passages GPS" });
        await doigt.swipeVers(milieu(MOCK_PROPOSED[0]!), 1200);
        await ease(milieu(MOCK_PROPOSED[0]!), 15.2, 800);
        await dodo(500);
        await doigt.tapLngLat(milieu(MOCK_PROPOSED[0]!));
        m.setProposedRoads([MOCK_PROPOSED[1]!]);
        setValide([MOCK_PROPOSED[0]!.coordinates]);
        setPhase({ picto: "coche", texte: "Validée — visible pour tous" });
        await dodo(2000);
        if (!alive()) return;
        // 2 — Seconde route : même geste.
        setPhase({ picto: "route", texte: "Route détectée — 6 passages GPS" });
        await doigt.swipeVers(milieu(MOCK_PROPOSED[1]!), 1100);
        await dodo(400);
        await doigt.tapLngLat(milieu(MOCK_PROPOSED[1]!));
        m.setProposedRoads([]);
        setValide([MOCK_PROPOSED[0]!.coordinates, MOCK_PROPOSED[1]!.coordinates]);
        setPhase({ picto: "coche", texte: "Réseau à jour — routable au prochain rebuild" });
        await dodo(2000);
        if (!alive()) return;
        // 3 — Retour à la surveillance.
        await ease({ lon: 9.457, lat: 0.404 }, 13.7, 1100);
        setPhase({ picto: "onde", texte: "Surveillance de la flotte" });
        await dodo(2200);
      }
    } catch {
      /* rien */
    }
  }, [doigt.tapLngLat, doigt.swipeVers]);

  // Scénarios client/chauffeur : injecte le vocabulaire carte correspondant.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    demoRunRef.current++; // stoppe une éventuelle démo en cours
    setPhase(null);
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
      case "demo-adresses":
        void runDemoAdresses();
        break;
      case "demo-poi":
        void runDemoPoi();
        break;
      case "demo-admin":
        void runDemoAdmin();
        break;
      case "client-depart":
        // C-08 : choisir le départ — favoris D/T/★, repères par catégorie.
        m.setSavedPlaces(MOCK_SAVED);
        m.setLandmarks(landmarksToGeoJson(MOCK_LANDMARKS));
        setDepart({ lon: 9.4512, lat: 0.4009 });
        setDepartTxt("9.45120, 0.40090");
        m.fitTo(
          [
            { lon: 9.449, lat: 0.392 },
            { lon: 9.467, lat: 0.413 },
          ],
          250,
        );
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
        m.fitTo(
          [
            { lon: 9.449, lat: 0.394 },
            { lon: 9.468, lat: 0.412 },
          ],
          220,
        );
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
  }, [scenario, runDemo, runDemoChauffeur, runDemoAdresses, runDemoPoi, runDemoAdmin]);

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
  }, [depart, mapData, scenario]);

  // Arrivée : pastille brand-900.
  useEffect(() => {
    const src = mapRef.current?.map.getSource("labo-dest") as
      | { setData: (d: unknown) => void }
      | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: arrivee
        ? [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [arrivee.lon, arrivee.lat] },
              properties: {},
            },
          ]
        : [],
    });
  }, [arrivee]);

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
  }, [depart, arrivee, categorie, supabase]);

  const onChampEnter = (which: "depart" | "arrivee", txt: string) => {
    const p = parsePoint(txt);
    if (p) setPoint(which, p);
  };

  const role =
    scenario === "demo-chauffeur" ? "chauffeur" : scenario === "demo-admin" ? "admin" : "";
  return (
    <div className={`labo${rec ? " rec" : ""}`}>
      <div ref={containerRef} className="carte" />
      <div ref={doigtRef} className="doigt" />
      {rec && (
        <div className={`marque ${role}`}>
          Teko
          <span className="sous">
            {role === "chauffeur" ? "chauffeur" : role === "admin" ? "console carto" : "client"}
          </span>
        </div>
      )}
      {rec && phase && (
        <div className={`phase ${role}`} aria-live="polite">
          <span className="rond">
            <Picto k={phase.picto} />
          </span>
          {phase.texte}
        </div>
      )}
      <div className={`panneau ${scenario.startsWith("demo-") ? "panneau--mini" : ""}`}>
        <h1>Teko — labo carte</h1>
        <p className="note">Temporaire · fond Martin + itinéraire Valhalla + tarifs Supabase</p>
        {scenario.startsWith("demo-") && (
          <div className="rangee">
            <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
              <option value="libre">Scénario : libre</option>
              <option value="demo-course">Démo animée — la course du client</option>
              <option value="demo-chauffeur">Démo animée — côté chauffeur</option>
              <option value="demo-adresses">Démo — course guidée par les adresses</option>
              <option value="demo-poi">Démo — choisir par point d'intérêt</option>
              <option value="demo-admin">Démo — console admin (validation carto)</option>
            </select>
          </div>
        )}
        {!scenario.startsWith("demo-") && (
          <>
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
            <div className="rangee modes" role="radiogroup" aria-label="Régime de la carte">
              {(["eco", "auto", "complet"] as const).map((p) => (
                <button
                  key={p}
                  role="radio"
                  aria-checked={modePref === p}
                  className={modePref === p ? "on" : ""}
                  onClick={() => setModePref(p)}
                >
                  {p === "eco" ? "Éco" : p === "auto" ? "Auto" : "Complet"}
                </button>
              ))}
            </div>
            <div className="info modes-etat" aria-live="polite">
              {resolu.mode === "eco" ? "🍃 " : ""}Carte {resolu.mode} — {resolu.raison}
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
                <option value="demo-adresses">Démo — course guidée par les adresses</option>
                <option value="demo-poi">Démo — choisir par point d'intérêt</option>
                <option value="demo-admin">Démo — console admin (validation carto)</option>
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
                {nbReperes} repère{nbReperes > 1 ? "s" : ""} autour du départ (RPC
                nearest_landmarks)
              </div>
            )}
            {erreur && <div className="erreur">{erreur}</div>}
          </>
        )}
      </div>
      <div className="aide">
        Clic = {mode === "depart" ? "définir le DÉPART" : "définir l'ARRIVÉE"}
      </div>
    </div>
  );
}
