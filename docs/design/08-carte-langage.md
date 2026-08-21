# 08 — Langage carte Teko (spécification UI/UX)

**Date :** 21 août 2026 · **Implémentation de référence : `packages/maps`
(`@teko/maps`)** — ce document fige les décisions de design de la carte pour
la construction des applications (client, chauffeur, admin). Les captures et
vidéos de référence sont dans [`carte/`](carte/). Tout est verrouillé par les
**44 tests unitaires** du paquet : un écart code/spec est un bug.

## 1. Vocabulaire visuel — compréhensible sans lire

Conçu pour rester lisible par un utilisateur qui ne lit pas : chaque état a
une forme, une couleur et un mouvement propres.

| Élément | Rendu | Sens |
|---|---|---|
| Position du client | Point **magenta** `#8C238A` cerclé blanc + **anneau qui pulse** | « C'est vous, maintenant » |
| Départ | **Épingle-goutte magenta, silhouette de personne** (canvas, ancrée à la pointe) | « Quelqu'un attend ici » |
| Arrivée | **Épingle-goutte brand-900 `#3D0F5C`, drapeau** | « On va là » |
| Repère (landmark) | Cercle **ambre** `#F5A623`, **taille ∝ saillance**, **initiale de catégorie** au centre (`M` marché, `P` pharmacie, `É` école, `E` église, `S` station, `R` rond-point, `B` bar, `■` bâtiment, `C` carrefour, `●` autre) | Le repère connu de tous est plus gros |
| Lieu favori / départ habituel | Pastille **blanche cerclée magenta** + `D` (domicile), `T` (travail), `★` (favori) + étiquette | Langage « client », jamais confondu avec un repère |
| Véhicule | Cercle **teal** `#00BFA5` cerclé blanc + **flèche ▲ orientée par le cap** (pivote avec la carte) | On voit dans quel sens il roule |
| Véhicule en attente | **Halo teal qui respire** | « Il vous attend » / « J'attends le client » |
| Client à bord | **Cœur magenta dans le cercle teal** (le point client disparaît) | « Vous êtes dedans » |
| Itinéraire | Ligne **violette token `#5A1A80`, liseré blanc** ; la partie parcourue devient **gris-violet** `#C6C0D8` | Reste net sur tout fond ; le trajet « se consomme » |
| Route « à confirmer » | **Pointillé violet-gris** `#8B7FB0` + « à confirmer · N passages » le long du tracé (z14+) | Jamais confondable avec de la voirie réelle |
| Zone de départ fréquente | **Halo magenta très doux**, rayon ∝ fréquence | Aide au positionnement chauffeur, pas un marqueur |

**Règle anti-écrémage (verrouillée)** : côté chauffeur, le drapeau destination
et l'itinéraire n'apparaissent qu'**après acceptation** de l'offre.

## 2. Grammaire animée (vidéos `carte/Teko-demo-*.mp4`)

Chaque phase correspond 1-à-1 à un état backend (`accepted → arrived →
started → completed`) — à brancher sur `subscribeRideStatus` :

1. **Approche** — la voiture roule réellement l'itinéraire (interpolation par
   distance, cap suivi, ease in-out) ; la position du client pulse au départ.
2. **Attente** — halo teal qui respire autour du véhicule.
3. **Prise en charge** — le point client s'éteint, le cœur magenta s'allume.
4. **Course** — le tracé se consomme derrière la voiture.
5. **Arrivée** — le point client réapparaît au drapeau.

API : `setEndpoints`, `setVehicleWaiting`, `setClientAboard`,
`driveVehicleAlong(id, route, ms, {consumeRoute})`, `setRouteProgress(t)`.

## 3. Fond de carte (mode complet)

- **Liserés partout** : c'est le liseré (`#CDC9DD` mineur / `#E3B76F` majeur)
  qui rend les petites rues lisibles, pas le remplissage.
- **Largeurs exponentielles** (base 1,6) : ruelle fine à z12, large à z17.
- Contexte : bâtiments (z14,5+), végétation/parcs, landuse, eau `#BFD3ED`,
  cours d'eau, pistes d'aéroport, sentiers pointillés (z15+).
- Fond `#EDECF5` (un cran sous le token `#F2F1F7`).
- **Étiquettes hiérarchisées par zoom** : villes (z8, gras) → quartiers (z12,
  capitales espacées) → aéroports (z10,5) → équipements majeurs (z13,5 :
  hôpitaux, universités, stades… ; les cabinets/cliniques sont rétrogradés
  par `subclass`) → équipements de quartier (z15) → noms de rues le long des
  tracés (z12,5 majeures / z15). Contraste texte **≥ 4,5:1**, halo 1,7.
- **Densité réglable** `labelDensity: "faible" | "normale" | "dense"`
  (padding de collision 26/14/6 + décalage de zoom des équipements) ;
  la collision MapLibre fait l'élagage, `symbol-sort-key` = rang OSM
  (repères Teko : saillance).
- Polices servies par Martin (`infra/tiles/martin/fonts/`) : **DejaVu Sans**
  (pile par défaut) et **Noto Sans** (cible prod) — vérifier les noms exposés
  par `/catalog` avant de changer `fonts` dans `buildMapStyle`.

## 4. Régimes éco / auto / complet (C-25)

Préférence utilisateur **3 positions** ; `resolveMapMode(pref, réseau)` :

- **complet** — tout ce qui précède.
- **éco** — même langage visuel (liserés, eau, végétation — issus des MÊMES
  tuiles, coût nul) mais : source **plafonnée à z13** (sur-zoom au-delà →
  zéro requête tuile en zoomant), **aucune police téléchargée** (les
  initiales et D/T/★ sont des images canvas en police système), pas de
  bâtiments/POI/noms. Hors-ligne total (pas d'URL) : fond uni token.
- **auto** — éco si réseau `2g`/`slow-2g` **ou** économiseur de données du
  système ; raison affichable fournie (`{mode, raison}`). Sur le web,
  `watchMapMode` suit `navigator.connection` ; en RN, brancher NetInfo sur
  la même fonction pure.

**Mesures** (proxy compteur, Libreville, gzip) : session ouverture+zoom
783 Ko → 472 Ko (−40 %) ; **suivi de course à zoom rue : 300 Ko → 0 Ko**.
L'argument n'est pas le prix (~2-3 F/course) mais **la carte qui ne bloque
jamais** sur 2G/EDGE et la batterie des téléphones chauffeurs.

## 5. Accessibilité

- Contraste texte ≥ 4,5:1 sur fond clair ; lettres des épingles `#4A2F03`
  sur ambre, `#5A1A80` sur blanc.
- Redondance forme+couleur+mouvement : aucun état porté par la couleur seule.
- Attribution OSM obligatoire : contrôle compact (`ⓘ`), portée par la source.
- Le sélecteur de régime est un `radiogroup` avec état résolu en
  `aria-live="polite"` (voir labo).

## 6. Captures de référence (`carte/`)

| Fichier | Montre |
|---|---|
| `design-ville/inter/quartier.png` | Fond complet aux 3 échelles (étiquettes hiérarchisées) |
| `sc-client-depart.png` | Choix du départ : favoris D/T/★ + repères lettrés |
| `sc-client-course.png` | En course : itinéraire liseré, véhicule orienté |
| `sc-chauffeur-attente.png` | Chauffeur en attente : halos de départs fréquents, routes à confirmer |
| `sc-chauffeur-navigation.png` | Navigation : itinéraire Valhalla réel + « à confirmer · 14 passages » |
| `eco2-depart.png` | Éco v2 : utile et soigné, zéro police |
| `auto-2g.png` | Auto sur 2G : bascule éco + raison affichée |
| `Teko-demo-course-client.mp4` | Grammaire animée, point de vue client |
| `Teko-demo-chauffeur.mp4` | Point de vue chauffeur (destination cachée avant acceptation) |
| `Teko-demo-eco.mp4` | La même course en éco |

## 7. Reprise pour les apps

- Web/admin : `@teko/maps/web` (`TekoMapController`) — tout est prêt.
- React Native : consommer le cœur (`buildMapStyle`, convertisseurs,
  `resolveMapMode`, `pointAlong`…) avec MapLibre Native ; refaire les
  fabriques canvas (`makePin`, `makePulse`, `makeLetterImage`) côté natif.
- Données : `TekoMapData` (repères, heartbeat, positions Realtime) ;
  favoris/routes proposées/hotspots via les setters du contrôleur.
- Alignements maquettes à faire au passage : C-25 (« sans tuiles » →
  « allégée » ; deux interrupteurs → sélecteur 3 positions).
