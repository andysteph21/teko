// Route du spike carte — chargement PARESSEUX : l'import MapLibre ne
// s'évalue qu'à l'ouverture de l'écran (les binaires sans le module natif
// peuvent ainsi charger le reste de l'app, expo-router évalue tout sinon).

import { lazy, Suspense } from "react";

const MapSpikeInner = lazy(() => import("../../src/features/map/map-spike-inner"));

export default function MapSpike() {
  return (
    <Suspense fallback={null}>
      <MapSpikeInner />
    </Suspense>
  );
}
