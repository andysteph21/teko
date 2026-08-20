# 04 — Cartographie : comparatif et stack retenue

Ce document fournit les **éléments d'évaluation** demandés pour comparer Google Maps aux alternatives, puis détaille la stack recommandée et le pipeline de routes crowdsourcées.

---

## 1. Le besoin Teko (rappel) et son implication décisive

Teko ne veut pas seulement *afficher* une carte : il veut **ajouter ses propres routes** (manuellement + via les traces GPS des chauffeurs) puis **calculer des itinéraires et des prix dessus**, là où les cartes grand public sont incomplètes (quartiers récents, petites routes).

**Conséquence technique majeure :** le moteur de calcul d'itinéraire doit pouvoir **router sur un graphe routier que Teko contrôle**. Or **Google Maps (et Mapbox dans une large mesure) ne permettent pas d'injecter vos propres routes dans leur moteur de routing.** On peut dessiner des lignes *par-dessus* la carte (overlay visuel), mais Google continuera d'ignorer ces routes pour ses calculs d'itinéraire/distance/ETA — qui servent justement à la **tarification**. C'est rédhibitoire pour le cœur de Teko.

> Autrement dit : avec Google Maps, la fonctionnalité différenciante de Teko (router sur des routes ajoutées) **n'est pas réalisable**. C'est le critère qui oriente toute la décision.

---

## 2. Critères d'évaluation (grille de lecture)

Pour comparer objectivement, voici les critères pertinents pour Teko, par ordre d'importance :

1. **Routes custom routables** — peut-on ajouter des routes et router/tarifer dessus ? *(critère éliminatoire pour Teko)*
2. **Ingestion de traces GPS / map-matching** — recaler les traces sur le réseau, détecter des segments hors-graphe.
3. **Sobriété data & hors-ligne** — tuiles vectorielles légères, cache/offline (réseau 3G payé au crédit).
4. **Modèle de coût à l'échelle** — coût par chargement de carte / requête de routing quand le volume monte.
5. **Couverture & éditabilité au Gabon** — qualité initiale + capacité à corriger soi-même.
6. **Propriété et localisation des données** — maîtrise des données (routes, traces) et auto-hébergement possible.
7. **Écosystème mobile (Expo/RN) & web** — qualité des SDK, New Architecture, maintenance.
8. **Navigation virage-par-virage** — guidage (utile chauffeur), même si secondaire au MVP.
9. **Effort d'exploitation** — qui héberge/maintient (managé vs self-hosted).

---

## 3. Comparatif des options

### Option A — Google Maps (`react-native-maps`)
- **Routes custom routables :** ❌ Non. Overlay visuel seulement ; le routing/ETA/distance restent ceux de Google. *(éliminatoire ici)*
- **Map-matching/traces :** API Roads payante et limitée ; pas de contrôle du graphe ; certaines données non publiées sous un seuil de trafic.
- **Data/offline :** tuiles surtout raster, offline limité ; peu favorable au contexte 3G.
- **Coût à l'échelle :** facturation par appel/affichage (crédit mensuel puis coût croissant) — peut devenir cher.
- **Couverture Gabon :** bonne sur les axes, mais **mêmes lacunes** que ce que Teko veut corriger, **sans pouvoir les corriger**.
- **Données :** propriétaires, pas d'auto-hébergement.
- **Écosystème RN :** `react-native-maps` très répandu et simple (Apple/Google natif).
- **Verdict :** simple et familier, mais **incompatible avec le cœur de Teko**.

### Option B — Mapbox (`@rnmapbox/maps` + Navigation SDK)
- **Routes custom routables :** ⚠️ Partiel. Styles et données custom puissants pour l'**affichage** ; le routing sur **votre propre graphe** n'est pas le cas d'usage natif (routing sur données Mapbox). Contournements complexes/coûteux.
- **Map-matching/traces :** API Map Matching disponible (sur réseau Mapbox), mais sans contrôle total du graphe Teko.
- **Data/offline :** **excellent** — tuiles vectorielles, offline, navigation soignée.
- **Coût à l'échelle :** modèle à l'usage (ex. ~0,50 $/1000 chargements après palier gratuit) — maîtrisable mais croissant.
- **Couverture Gabon :** OSM-based + données Mapbox ; éditabilité indirecte.
- **Données :** propriétaire (SDK), tuiles Mapbox.
- **Écosystème RN :** très bon (rendu, navigation).
- **Verdict :** superbe pour le rendu/navigation, mais **ne résout pas proprement le routing sur routes Teko**.

### Option C — MapLibre + OSM auto-hébergé + moteur de routing self-hosted *(recommandé)*
- **Routes custom routables :** ✅ **Oui, pleinement.** Le graphe de routing est construit depuis **OSM + la couche de routes Teko** ; on route et on tarife sur **nos** routes.
- **Map-matching/traces :** ✅ via un moteur self-hosted (ex. **Valhalla/Meili**) : recalage des traces GPS sur le réseau, base du pipeline de détection de routes.
- **Data/offline :** ✅ **tuiles vectorielles** (MapLibre) auto-hébergées, **cache/offline** (MBTiles/PMTiles) → **sobriété data** maximale.
- **Coût à l'échelle :** coût d'**infrastructure** (serveurs tuiles + routing) au lieu d'un coût par appel — **prévisible**, avantageux à volume.
- **Couverture Gabon :** OSM (incomplet en périphérie de Libreville) **mais entièrement corrigible par Teko** — c'est tout l'intérêt.
- **Données :** **propriété et localisation totales** (routes, traces) ; MapLibre est **MIT**.
- **Écosystème RN :** **MapLibre React Native** (Expo/Android/iOS) + **MapLibre GL JS** (admin web) ; accepte n'importe quelle source de tuiles.
- **Navigation :** routing self-hosted fournit les itinéraires ; guidage virage-par-virage possible (à intégrer).
- **Verdict :** **seule option qui satisfait le critère éliminatoire** ; bonus majeurs sur data, coût et souveraineté des données. **Contrepartie : exploitation à assurer** (héberger/maintenir tuiles + routing + pipeline).

### Tableau de synthèse

| Critère (poids) | Google Maps | Mapbox | **MapLibre + OSM self-hosted** |
|---|---|---|---|
| Routes custom **routables** *(éliminatoire)* | ❌ | ⚠️ | ✅ |
| Map-matching / traces GPS | ⚠️ payant/limité | ⚠️ | ✅ (Valhalla/Meili) |
| Sobriété data & offline | ⚠️ | ✅ | ✅✅ |
| Coût à l'échelle | par appel (croissant) | par appel (modéré) | infra (prévisible) |
| Couverture **+ éditable** Gabon | bonne, non éditable | bonne, indirecte | éditable à 100 % |
| Propriété/localisation données | ❌ | ⚠️ | ✅ |
| Écosystème Expo/RN + web | ✅✅ | ✅ | ✅ |
| Navigation virage-par-virage | ✅✅ | ✅✅ | ✅ (à intégrer) |
| Effort d'exploitation | faible | faible | **plus élevé** |

---

## 4. Stack cartographique retenue

> **Décision actée (ADR-07, 5 juin 2026)** : MapLibre + OSM auto-hébergé + moteur de routing self-hosted (Valhalla).


- **Rendu mobile :** **MapLibre React Native** (Expo SDK 56, New Architecture).
- **Rendu admin web :** **MapLibre GL JS** (édition des routes, revue des propositions).
- **Tuiles vectorielles :** **auto-hébergées** à partir d'OSM + couche Teko (format **PMTiles/MBTiles**), servies avec cache CDN et **paquets offline** par zone pour la sobriété data. *(Alternative de démarrage : tuiles managées MapTiler/Stadia, puis bascule self-hosted.)*
- **Moteur de routing :** **Valhalla** (self-hosted) — adapté aux **machines modestes**, **costing dynamique** (différencier voiture/moto), et **map-matching Meili** pour les traces GPS. *(Alternatives : GraphHopper pour du routing national performant sur serveur modeste ; OSRM si l'on privilégie surtout des matrices rapides.)*
- **Géodonnées applicatives :** **PostGIS** dans Supabase (`zones`, `road_segments`, `road_proposals`, `gps_traces`, **`landmarks`**, **`landmark_proposals`**).
- **Couche repères :** points de repère rendus par MapLibre et exploités pour l'adressage et le **guidage par repères** (voir §5bis).

> Choix de Valhalla motivé par : faible empreinte serveur, tuilage incrémental, costing par profil (voiture/moto), et **map-matching intégré** — exactement les briques du pipeline crowdsourcé.

---

## 5. Pipeline de routes crowdsourcées

```
Traces GPS chauffeurs (consenties)
        │  (échantillonnées, sobres en data)
        ▼
[road-detect]  map-matching (Valhalla/Meili)
        │   • recale les traces sur le réseau connu
        │   • isole les segments récurrents HORS graphe
        ▼
road_proposals (status: proposed)   ← seuils: nb passages, nb chauffeurs distincts, fenêtre
        │
        ▼
Console admin (MapLibre GL JS) : revue → validée / rejetée
        │
        ▼ (validée)
road_segments (source: admin/proposed, status: validated)
        │
        ▼
Reconstruction : tuiles vectorielles + graphe Valhalla
        │
        ▼
Routes utilisables pour le rendu, le routing et la TARIFICATION
```

**Règles clés :**

- Aucune route **publiée/routable** sans **validation admin** (pas d'auto-publication).
- Traces **agrégées/anonymisées** ; pas d'exposition de trajets individuels ; collecte soumise au **consentement** du chauffeur.
- Une **zone** n'est ouverte au service qu'au-dessus d'un **seuil de couverture** (`zones.coverage_status`).
- Reconstruction du graphe/tuiles **incrémentale et planifiée** (job), pour ne pas perturber le service.

---

## 5bis. Navigation par points de repère (landmarks)

Au Gabon, on s'oriente par repères, pas par noms de rue. La stack self-hosted permet de greffer une **couche repères** sur le rendu ET sur le guidage — ce que Google Maps ne permet pas de faire sur nos données. (Modèle inspiré de la navigation par landmarks de Google Maps en Inde.)

### 5bis.1 Données
- Repères stockés dans **`landmarks`** (PostGIS, point + nom + alias + catégorie + **saillance**), proposés via **`landmark_proposals`** (chauffeurs/clients), validés par l'admin (voir `02-backend-et-donnees.md`).
- Affichés via MapLibre (icônes par catégorie) ; **légers en données** → embarqués dans les paquets hors-ligne par zone.

### 5bis.2 Adressage par repère
- Côté client : recherche de repère (nom/alias) mise en avant → sélection → **affinage par épingle** + précision texte (`origin_hint`/`dest_hint`). La **position exacte (épingle)** reste ce qui est routé/tarifé ; le repère est l'étiquette compréhensible.
- Géocodage « inverse par repère » : pour une position donnée, retrouver le repère saillant le plus proche (requête PostGIS `ST_DWithin` + tri par saillance/distance) afin d'afficher « près de \<repère\> ».

### 5bis.3 Guidage par repères (Edge Function `guidance`)
1. Le routing Valhalla renvoie l'itinéraire et ses **manœuvres** (points de décision + géométrie).
2. Pour chaque manœuvre, on cherche dans `landmarks` le **repère le plus saillant** à proximité du point de décision (rayon paramétrable), pondéré par catégorie/saillance/visibilité par rapport au sens de circulation.
3. On **génère l'instruction** par gabarit i18n : « tournez à droite **après \<repère\>** », « continuez jusqu'au **\<rond-point/repère\>** », avec le **nom de rue ajouté s'il existe**.
4. **Repli** : si aucun repère pertinent, instruction classique (distance/direction).

### 5bis.4 Point de rendez-vous (Edge Function `landmark-suggest`)
Pour la prise en charge, suggère le repère validé saillant le plus proche du point de départ comme lieu de rencontre (`meeting_landmark_id`), visible côté client et chauffeur.

### 5bis.5 Crowdsourcing & saillance
- Même pipeline `proposé → validé/rejeté` que les routes ; doublons fusionnés.
- La **saillance** est calculée à partir de la catégorie (poids de base), de l'`usage_count` (fréquence de sélection comme repère/destination) et du statut de validation ; recalcul périodique. Elle pilote le choix des repères en guidage et en suggestion de RDV.

---

## 6. Conséquences sur la tarification

La tarification « estimée distance/temps GPS » (cf. produit) s'appuie sur le **routing self-hosted** : à mesure que la carte s'enrichit, les estimations se précisent. Tant qu'une zone est peu couverte, on s'appuie sur la **grille par zones** comme garde-fou (cohérent avec `../product/02-regles-metier.md`).

---

## 7. Risques & mitigations (cartographie)

| Risque | Mitigation |
|---|---|
| Exploitation self-hosted (tuiles + routing) à maintenir | Démarrer avec tuiles managées (MapTiler/Stadia) + Valhalla conteneurisé ; IaC dans `infra/` ; bascule progressive |
| OSM incomplet au lancement d'une zone | Édition manuelle admin prioritaire + ouverture par seuil de couverture |
| Qualité des propositions issues du GPS | Seuils (passages, chauffeurs distincts), revue humaine, géométrie contrôlée |
| Vandalisme/erreurs OSM | Filtrage qualité, snapshot OSM maîtrisé, couche Teko prioritaire |
| Coût infra | Prévisible et mutualisé ; cache/offline réduit la charge tuiles |
