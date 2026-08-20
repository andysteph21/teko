# 05 — Sujets transverses & décisions

## 1. Sobriété data & temps réel

Le réseau (souvent 3G, payé au crédit) impose la frugalité comme contrainte de conception, pas comme option.

- **Temps réel ciblé** : positions diffusées via **Supabase Realtime**, à **fréquence adaptative** (plus espacée hors course, plus rapprochée en approche/course), positions **arrondies** et messages compacts. Pas de polling.
- **Push plutôt que pull** : notifications via **FCM** (demandes, étapes, rappels) au lieu d'interrogations répétées.
- **Tuiles vectorielles + cache/offline** (MapLibre, PMTiles/MBTiles) : on ne télécharge que ce qui manque ; paquets de zones préchargés.
- **Mode économie de données** : réduit la fréquence GPS, la richesse cartographique et les rafraîchissements. Activable client et chauffeur.
- **Widget conso data** : mesure la consommation **de l'app** (instrumentation réseau dans `packages/telemetry`), affichée en flottant ; agrégat journalier optionnel côté serveur (`data_usage`).
- **Payloads** : images optimisées, pagination, compression, synchronisation par lots, files d'attente avec reprise sur coupure.

## 2. Sécurité & confidentialité

- **Auth** OTP SMS (Supabase) ; sessions persistantes ; rôles applicatifs.
- **RLS** stricte (cf. `02-backend-et-donnees.md`) ; logique sensible en **Edge Functions** uniquement.
- **KYC** : Storage privé, URLs signées courtes, accès admin journalisé ; documents chiffrés au repos.
- **Paiements** : secrets en secret store, callbacks signés, idempotence, audit financier.
- **Consentement GPS** explicite ; traces agrégées/anonymisées.
- **Sécurité des personnes** : SOS, partage de trajet, code PIN (produit) ; traçabilité des événements (`ride_events`).
- **Conformité** : exigences locales de protection des données (Gabon) à vérifier (consentement, conservation, droits).

## 3. Internationalisation (i18n)

- **Français livré** ; architecture **i18n-ready** dès le départ (`packages/i18n`) pour ajouter les **langues locales** sans refonte.
- `profiles.locale` par utilisateur ; chaînes externalisées ; formats nombres/dates/devise (XAF) localisés.

## 4. Observabilité & qualité

- **Logs/metrics** Edge Functions et jobs (surtout finance et `daily-close`) ; alertes sur échecs et écarts de réconciliation.
- **Tests** : unitaires `packages/core` (prix, solde, états), intégration paiements (sandbox), e2e parcours critiques.
- **Suivi produit** : indicateurs du PRD (appariement, règlement avant 04:00, conso data/course, routes validées).

## 5. Déploiement & CI/CD

- **Monorepo** : pipelines orchestrés par **Turborepo** (cache, tâches affectées seulement).
- **Mobile** : **EAS Build/Submit** (Android prioritaire vu le parc) + **EAS Update** (OTA) pour correctifs rapides.
- **Admin web** : déploiement Next.js (Vercel ou équivalent).
- **Backend** : migrations Supabase versionnées (`supabase/migrations`), déploiement des Edge Functions ; environnements **staging** (sandbox Airtel) puis **production**.
- **Services carto** : conteneurs (tuiles, Valhalla) décrits dans `infra/` (IaC), avec jobs de reconstruction.

## 6. Registre de décisions (ADR — résumé)

| # | Décision | Statut | Justification courte |
|---|---|---|---|
| ADR-01 | Monorepo **Turborepo 2.7 + pnpm 10** | Acté | Packages partagés, cache, versions cohérentes (catalogs) |
| ADR-02 | Mobile **Expo SDK 56** (New Arch, Hermes V1) | Acté | Perf sur appareils modestes, OTA, écosystème |
| ADR-03 | Admin **Next.js 16.2** | Acté | React, SSR, déploiement simple |
| ADR-04 | Backend **Supabase** (PG17 + PostGIS) | Acté | Auth/Realtime/Edge/Storage + géodonnées |
| ADR-05 | **Solde = journal `ledger` immuable** | Acté | Intégrité financière, auditabilité |
| ADR-06 | **Airtel** derrière une **abstraction paiement** | Acté | MVP Airtel ; Moov ajouté sans refonte |
| ADR-07 | **MapLibre + OSM self-hosted + Valhalla** (pas Google Maps) | **Acté** (validé 5 juin 2026) | Seule voie pour router/tarifer sur routes custom ; sobriété data ; souveraineté |
| ADR-08 | **i18n dès le départ**, français livré | Acté | Langues locales futures sans refonte |
| ADR-09 | **Android d'abord**, iOS ensuite | Proposé | Parc majoritairement Android |
| ADR-10 | **Tuiles + routing self-hosted dès le départ** (lean, extract Gabon) ; managé en repli | **Acté** (validé 5 juin 2026) | Valhalla déjà self-hosted ; extract Gabon petit ; Martin sert fond PMTiles + PostGIS ; sobriété/offline prioritaires. Voir `06-infra-cartographie.md` |
| ADR-11 | **Région d'hébergement = Europe de l'Ouest, Paris (`eu-west-3`)** pour Supabase ; infra carto/routing **co-localisée à Paris** | **Acté** (validé 5 juin 2026) | Supabase n'a **aucun datacenter africain** (régions dispo : US, EU, APAC). Le câble sous-marin **ACE atterrit directement à Libreville → Penmarch (France)**, faisant de Paris le point d'entrée européen à plus faible latence pour le Gabon. Co-localiser le self-hosted carto (OVH/Scaleway/AWS `eu-west-3`) minimise la latence inter-services. Frankfurt (`eu-central-1`) = repli équivalent. À réévaluer si une région africaine (ex. Le Cap) arrive chez Supabase. |
| ADR-12 | **Supabase managé confirmé après évaluation contradictoire** (voir `07-evaluation-stack.md`) | **Acté** (20 août 2026) | Gagne même en partant de zéro (PostGIS + ACID + ops à 1–2 devs). Réévaluation si ~1 000 chauffeurs simultanés, région africaine Supabase, ou hausse tarifaire majeure |
| ADR-13 | **Diffusion des positions derrière une abstraction `PositionsChannel`** (`packages/api-client`) | Acté (20 août 2026) | Supabase Realtime aujourd'hui ; service WebSocket/MQTT co-localisé Paris si le fan-out sature |
| ADR-14 | **Porte de sortie documentée : self-host Supabase** sur le VPS carto (OVH/Scaleway Paris) | Acté (20 août 2026) | Lock-in borné ; procédure à rédiger avant le lancement public |

## 7. Questions ouvertes techniques (à trancher)

- **Stack carto (ADR-07) : validée** (MapLibre + OSM self-hosted + Valhalla). **Stratégie de démarrage (ADR-10) : validée** = self-hosted lean dès le départ, managé en repli (voir `06-infra-cartographie.md`). Moteur retenu **Valhalla**.
- **Hébergement des services carto** : ~~région~~ **région tranchée = Paris `eu-west-3`** (ADR-11) ; restent à préciser le **fournisseur** (OVH/Scaleway/AWS), le dimensionnement, les sauvegardes et l'IaC dans `infra/` (cf. `06-infra-cartographie.md` §9).
- **Clôture journalière** : report du résiduel vs remise à zéro (impacte `ledger`/`daily_statements`).
- **Payout** : fréquence et seuil minimal ; gestion des petits montants.
- **Fournisseur SMS** (OTP) au Gabon : coût, fiabilité, sender ID, intégration provider Supabase.
- **Plateformes** : confirmer Android-only au lancement.
- **Rétention** des `gps_traces` et `ride_locations` (durée, anonymisation).
- **Vérifs Airtel** restantes (X-Country/X-Currency, idempotence, rate limits, frais, activation prod) — cf. `../integrations/airtel-money-evaluation.md`.
- **Modèle de permissions admin** (ops/carto/finance) : granularité dès le MVP ?

> Les questions **produit** (commission, tarifs, seuils, frais) restent dans `../product/05-questions-ouvertes.md`.
