# 06 — Infrastructure cartographique (`infra/`)

**Décision (5 juin 2026) :** **self-hosted dès le jour 1** pour le rendu (tuiles) **et** le routing, en version **lean** (extract Gabon). Offre managée (MapTiler/Stadia) conservée uniquement en **repli d'urgence** (bascule par changement d'URL de style MapLibre). Remplace l'ancienne proposition ADR-10 « managé d'abord ».

> Pourquoi pas managé pour les tuiles : (1) Valhalla est de toute façon self-hosted (pipeline OSM déjà en place) ; (2) l'extract Gabon est petit (génération en minutes) ; (3) **Martin** sert d'un seul tenant le fond PMTiles **et** les couches dynamiques PostGIS ; (4) sobriété data + **paquets hors-ligne** prioritaires ; (5) coût d'infra prévisible vs facturation par chargement.

---

## 1. Composants

| Composant | Outil | Rôle | Régime |
|---|---|---|---|
| **Génération de tuiles** | **Planetiler** | OSM (extract Gabon) → fond **PMTiles** vectoriel | Job (batch) |
| **Serveur de tuiles** | **Martin** (MapLibre, Rust) | Sert le fond **PMTiles** + **couches dynamiques PostGIS** (routes/repères/zones) | Service |
| **Routing** | **Valhalla** (docker-valhalla) | Itinéraires, costing par catégorie, **map-matching (Meili)** | Service |
| **Conflation / build graphe** | osmium + scripts | Fusionne les routes Teko validées dans l'`osm.pbf`, déclenche les rebuilds | Job (batch) |
| **Extract OSM** | osmium / Geofabrik | Télécharge/rafraîchit l'extract **Gabon** | Job (planifié) |
| **CDN / stockage** | objet + CDN | Diffuse PMTiles et **paquets hors-ligne** par zone | Infra |

Les **Edge Functions** (`price-quote`, `guidance`, `landmark-suggest`) appellent Valhalla en HTTP ; le rendu (apps + admin) tape Martin.

---

## 2. Principe clé : affichage instantané vs routing par rebuild

Deux chemins distincts pour la donnée custom (routes & repères) :

- **Affichage = instantané.** Routes et repères **validés** sont servis **en direct depuis PostGIS** par Martin (tuiles vectorielles à la volée). Dès qu'un admin valide, c'est visible — **aucun rebuild**.
- **Routing = par rebuild (batch).** Pour qu'une **nouvelle route** soit *empruntable par le moteur* (itinéraire + tarif), il faut **reconstruire le graphe Valhalla** (conflation → build). C'est un job planifié (ex. nocturne) ou à la demande.

> Conséquence produit : un repère ou une route apparaît tout de suite sur la carte ; son usage **pour calculer un trajet** intervient au rebuild suivant. À refléter dans la console admin (statut « visible » vs « routable »).

---

## 3. Pipeline de reconstruction

```
Geofabrik (extract Gabon .osm.pbf)
        │
        ▼
[extract]  rafraîchissement périodique de l'OSM de base
        │
        ▼
[conflate]  + routes Teko validées (road_segments, source=admin/proposed, status=validated)
        │     → osm.pbf enrichi
        ├───────────────► [valhalla build]  → nouveau graphe de routing (+ Meili)
        └───────────────► [planetiler]      → gabon.pmtiles (fond enrichi)
                                   │
                                   ▼
                         publication CDN + bascule (blue/green)
```

- **Blue/green** : on publie le nouveau graphe/tuiles à côté, puis on bascule sans coupure.
- **Cadence** : nocturne par défaut + déclenchement manuel admin (« publier les routes validées »).
- **Repères** : pas concernés par le rebuild routing (servis en direct par Martin) ; ils enrichissent le **guidage** dès validation.

---

## 4. Arborescence `infra/`

```
infra/
├─ tiles/
│  ├─ planetiler/        # profil + script de build → gabon.pmtiles
│  └─ martin/            # config Martin (sources: pmtiles + postgis), Dockerfile
├─ routing/
│  └─ valhalla/          # docker-valhalla, valhalla.json, custom_files/
├─ pipeline/
│  ├─ extract/           # osmium: download/refresh extract Gabon
│  ├─ conflate/          # fusion road_segments validés → osm.pbf
│  └─ rebuild/           # orchestration: conflate → valhalla + planetiler → publish (blue/green)
├─ offline/              # génération des paquets hors-ligne par zone (sous-PMTiles + repères/routes)
├─ compose/              # docker-compose pour dev/local (martin + valhalla + db)
├─ deploy/               # IaC (Terraform/Ansible), configs d'env, CDN, secrets refs
└─ README.md
```

---

## 5. Styles & rendu (MapLibre)

- **Style MapLibre** unique (JSON) partagé mobile/web : fond PMTiles (Martin) + couches `road_segments`, `landmarks`, `zones` (Martin/PostGIS).
- **Variantes** : style « plein » et style « économie de données » (moins de couches/labels) pilotés par le mode économie.
- **Repli managé** : une URL de style MapTiler de secours, activable par configuration en cas d'incident sur Martin.
- **Repères** : icônes par catégorie ; densité réduite en mode économie et aux faibles zooms.

---

## 6. Hors-ligne & sobriété

- **Paquets par zone** : sous-ensembles PMTiles + données repères/routes d'une zone, téléchargeables pour usage hors-ligne (réseau 3G/crédit).
- Tuiles **vectorielles** (légères, restylables sans retéléchargement) + cache agressif côté app.
- Le job `offline/` régénère les paquets après chaque publication.

---

## 7. Dimensionnement & hébergement (esquisse)

- **Charge légère** à l'échelle Gabon : Valhalla et Martin tiennent sur une **VM modeste** (ordre de grandeur 2–4 vCPU / 8–16 Go) ; PMTiles servable depuis **stockage objet + CDN**.
- **Région d'hébergement = Paris (`eu-west-3`)** — tranchée (ADR-11). Supabase n'a pas de région africaine ; le câble **ACE relie Libreville directement à la France**, donc Paris est l'entrée européenne la plus basse latence pour le Gabon. On co-localise Valhalla/Martin/PMTiles au plus près du Supabase de prod (Paris).
- **Build** (Planetiler/Valhalla) : machine de job ponctuelle, pas besoin d'être toujours active.
- **Sauvegardes** : extract OSM + `road_segments`/`landmarks` (déjà dans Supabase) = reconstruction reproductible.

---

## 8. Environnements & CI

- **Local/dev** : `infra/compose/` (Martin + Valhalla + Postgres/PostGIS) avec un mini-extract.
- **Staging** : pipeline complet sur l'extract Gabon, branché au Supabase de staging.
- **Production** : blue/green pour graphe + tuiles ; déploiement via `infra/deploy/` (IaC).
- **CI** : lint des configs, build des images, test d'un itinéraire de référence après chaque rebuild (non-régression du routing).

---

## 9. Décisions/à préciser

- ~~**Région d'hébergement**~~ **tranchée = Paris `eu-west-3`** (ADR-11) ; reste le **fournisseur** (VM/objet/CDN : OVH/Scaleway/AWS).
- **Cadence de rebuild** routing (nocturne + à la demande ?) et fenêtre de publication.
- **Stratégie de conflation** des routes Teko dans l'OSM (identifiants stables, gestion des conflits avec OSM en amont).
- **Politique de mise à jour** de l'extract OSM de base (fréquence Geofabrik).
- Confirmation **Valhalla** vs GraphHopper (Valhalla retenu : map-matching + costing + faible empreinte).

> Met à jour **ADR-10** : « tuiles managées d'abord » → **self-hosted lean dès le départ, managé en repli**.
