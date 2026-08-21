// Laboratoire carte — TEMPORAIRE. Teste de bout en bout :
//   @teko/maps (style, contrôleur, adaptateur) ↔ Martin (fond + repères) ↔
//   Valhalla (itinéraire réel) ↔ Supabase (repères, barème tarifaire).
// Cliquer sur la carte définit le départ puis l'arrivée (ou éditer les
// champs lon, lat). URL : ?o=lon,lat&d=lon,lat pour préremplir ;
// ?tiles= ?valhalla= ?supabase= pour viser d'autres environnements.

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type LonLat,
  MAP_COLORS,
  TekoMapData,
  decodePolyline6,
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
  const [eco, setEco] = useState(false);
  const [resume, setResume] = useState<{ km: number; min: number } | null>(null);
  const [prix, setPrix] = useState<number | null>(null);
  const [nbReperes, setNbReperes] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

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

  // Départ : point client magenta + repères proches (Supabase RPC).
  useEffect(() => {
    mapRef.current?.setClientPosition(depart);
    if (!depart) return;
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
      <div className="panneau">
        <h1>Teko — labo carte</h1>
        <p className="note">
          Temporaire · fond Martin + itinéraire Valhalla + tarifs Supabase
        </p>
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
      </div>
      <div className="aide">
        Clic = {mode === "depart" ? "définir le DÉPART" : "définir l'ARRIVÉE"}
      </div>
    </div>
  );
}
