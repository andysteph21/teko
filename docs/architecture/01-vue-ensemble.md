# 01 — Vue d'ensemble & monorepo

## 1. Stack et versions (juin 2026)

| Brique | Version cible | Notes |
|---|---|---|
| **pnpm** | 10.x | Workspaces + **catalogs** (versions de deps partagées dans `pnpm-workspace.yaml`) |
| **Turborepo** | 2.7.x | Cache local/distant, `turbo devtools`, configurations composables. Préparer v3 (dépréciations) |
| **Expo SDK** | 56 | React Native 0.85, React 19.2, **New Architecture** (obligatoire depuis SDK 55), **Hermes V1** par défaut. Démarrages à froid plus rapides — utile sur Android d'entrée de gamme |
| **Expo Router** | v6 (fourni avec SDK 56) | Navigation par fichiers, partagée entre les deux apps mobiles |
| **EAS** | Build/Update/Submit | Builds cloud + **OTA updates** (correctifs sans repasser par les stores) |
| **Next.js** | 16.2.x | App Router (défaut), React 19.2, Turbopack |
| **Supabase** | Plateforme managée | **Postgres 17** (PG14 déprécié au 1ᵉʳ juil. 2026), Edge Functions (Deno), Realtime, Storage, Auth |
| **TypeScript** | 5.x | Strict, partagé via package `tsconfig` |
| **MapLibre** | MapLibre Native (RN) + MapLibre GL JS (web) | Rendu vecteur, MIT |
| **Routing** | Valhalla (self-hosted) | Routing + map-matching (voir `04-cartographie.md`) |

> Toutes ces versions sont gérées via les **catalogs pnpm** pour garantir la cohérence entre apps et packages, et facilitées par le cache Turborepo.

## 2. Structure du monorepo

```
teko/
├─ apps/
│  ├─ client/             # Expo RN — application client
│  ├─ driver/             # Expo RN — application chauffeur
│  └─ admin/              # Next.js 16 — plateforme d'administration web
├─ packages/
│  ├─ ui/                 # composants UI partagés (mobile + web si possible)
│  ├─ core/               # logique métier pure (calcul de prix, règles de solde, états de course)
│  ├─ api-client/         # client typé Supabase + wrappers d'appels
│  ├─ types/              # types/DTO partagés (générés depuis le schéma Supabase)
│  ├─ i18n/               # ressources de traduction + utilitaires
│  ├─ maps/               # abstraction carte (rendu, styles, routing client)
│  ├─ config/             # eslint, tsconfig, prettier partagés
│  └─ telemetry/          # mesure conso data + logging client
├─ supabase/
│  ├─ migrations/         # schéma SQL versionné
│  ├─ functions/          # Edge Functions (Deno) : paiements, jobs, webhooks
│  └─ seed/               # données de référence (zones, catégories, tarifs)
├─ infra/                 # IaC / configs services carto (tiles, Valhalla), CI
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

**Principes :**

- La **logique métier sensible** (calcul de prix définitif, mutations de solde, appels paiement) vit dans `supabase/functions` (serveur) ; `packages/core` contient les règles **pures et testables** réutilisées côté client pour l'affichage (estimations) et côté serveur pour l'autorité.
- `packages/types` est **généré** depuis le schéma Postgres (types Supabase) → une seule source de vérité des structures de données.
- Les deux apps mobiles partagent un maximum via `ui`, `core`, `api-client`, `maps`, `i18n` — seules les surfaces (écrans, parcours) diffèrent.

## 3. Acteurs et applications

- **App Client (Expo)** — commande, suivi, paiement, évaluation, sécurité, widget data.
- **App Chauffeur (Expo)** — disponibilité, courses, navigation, **solde journalier**, règlement Airtel, traces GPS (consenties).
- **Admin (Next.js)** — KYC, supervision temps réel, finance, **console cartographique**, modération, paramètres.
- **Backend (Supabase)** — Auth, données, temps réel, Edge Functions (paiements, jobs, webhooks), stockage KYC.
- **Services carto auto-hébergés** — serveur de tuiles vectorielles + moteur de routing (Valhalla) + pipeline de traces GPS.

## 4. Vue d'ensemble des flux (haut niveau)

1. **Commande** : le client définit départ/destination → `packages/core` estime un prix (via routing) → création d'une `ride` → appariement chauffeur.
2. **Course** : positions diffusées en **temps réel** (Supabase Realtime), transitions d'état journalisées (`ride_events`), code PIN pour démarrer.
3. **Paiement** : à la fin, selon le mode (cash / Airtel) → Edge Function `payments` → mutation **atomique** du solde (journal `ledger`).
4. **Clôture (4h)** : job planifié → relevés journaliers, désactivations pour impayé, payouts.
5. **Carte** : traces GPS chauffeurs → pipeline map-matching → propositions de routes → validation admin → reconstruction des tuiles/graphe de routing.
6. **Repères** : adressage et **guidage par points de repère** (au lieu d'adresses/rues) ; repères proposés par chauffeurs/clients, validés par l'admin ; guidage généré en associant un repère saillant à chaque manœuvre (voir `04-cartographie.md`).

Le détail de chaque flux est dans les documents dédiés (02 à 04).
