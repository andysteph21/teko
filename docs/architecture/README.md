# Architecture système — Teko

**Version :** 0.1 (brouillon) · **Date :** 5 juin 2026 · MVP *ride-hailing*

Ce dossier décrit l'architecture technique de Teko, en s'appuyant sur la documentation produit (`../product/`) et les évaluations paiement (`../integrations/`). Il vise à préparer l'implémentation : structure du monorepo, backend et données, module de paiement Airtel, stack cartographique, sobriété réseau, sécurité, déploiement, et décisions techniques argumentées.

## Plan de lecture

1. **[01-vue-ensemble.md](01-vue-ensemble.md)** — stack et versions (juin 2026), structure du monorepo Turborepo/pnpm, applications et packages partagés, vue d'ensemble des flux.
2. **[02-backend-et-donnees.md](02-backend-et-donnees.md)** — Supabase (Auth, Postgres, Realtime, Edge Functions, Storage), modèle de données, RLS, jobs planifiés.
3. **[03-module-paiements.md](03-module-paiements.md)** — abstraction paiement, intégration Airtel Money, machine à états, idempotence, réconciliation, moteur de solde.
4. **[04-cartographie.md](04-cartographie.md)** — **comparatif Google Maps / Mapbox / MapLibre+OSM**, stack retenue, pipeline de routes crowdsourcées (traces GPS → map-matching → validation admin).
5. **[05-decisions-et-transverses.md](05-decisions-et-transverses.md)** — sobriété data & temps réel, sécurité, i18n, observabilité, déploiement/CI, registre de décisions (ADR) et questions ouvertes techniques.
6. **[06-infra-cartographie.md](06-infra-cartographie.md)** — infrastructure carto self-hosted (`infra/`) : génération de tuiles (Planetiler/PMTiles), serveur Martin, routing Valhalla, pipeline de reconstruction, hors-ligne, hébergement.
7. **[07-evaluation-stack.md](07-evaluation-stack.md)** — évaluation contradictoire de la stack (août 2026) : Supabase + Expo confirmés face aux alternatives (Firebase, backend custom, Flutter…), risques réels, garde-fous, seuils de réévaluation (ADR-12 à 14).
8. **[08-ecarts-backend-ux.md](08-ecarts-backend-ux.md)** — confrontation backend ↔ 79 maquettes : couverture, écarts E-01→E-17 (dispatch/offres, jobs, suppression de compte, SOS, grants DML, garde `daily_close`…), vérifiés par les tests e2e (`supabase/tests/e2e/`).
9. **[09-veille-expo.md](09-veille-expo.md)** — veille écosystème Expo (août 2026) : cibler SDK 57+ (régression Hermes en 56), cadence rapide, API 36/edge-to-edge, FCM v1, dev clients obligatoires (MapLibre), paquets à jour par besoin.
10. **[10-regles-ingenierie.md](10-regles-ingenierie.md)** — règles d'ingénierie des apps (25 août 2026, actées) : Biome, nommage anglais, architecture d'état (Zustand + TanStack Query + expo-sqlite), styling, stratégie de tests et paliers de couverture, parc d'appareils adb.

## Synthèse des choix structurants

| Domaine | Choix | Pourquoi (résumé) |
|---|---|---|
| Monorepo | **Turborepo 2.7 + pnpm 10** (catalogs) | Cache de build, versions partagées, packages communs aux 3 apps |
| Mobile (client & chauffeur) | **Expo, dernier SDK stable au lancement** (57+, RN 0.86+, New Arch, Hermes V1) | Perf, OTA, build cloud ; cadence de veille : `09-veille-expo.md` |
| Admin web | **Next.js 16.2** (App Router) | SSR, écosystème React, déploiement simple |
| Backend | **Supabase** (Postgres 17, Edge Functions Deno, Realtime, Storage, Auth OTP) | BaaS complet, temps réel, logique sensible côté serveur |
| Paiement | **Airtel Money** derrière une **abstraction commune** | MVP Airtel ; Moov branché plus tard sans refonte |
| Cartographie | **MapLibre + tuiles vectorielles OSM auto-hébergées + moteur de routing self-hosted (Valhalla)** | **Seule voie permettant de router sur des routes custom** + sobriété data + maîtrise des coûts |
| Navigation | **Par points de repère** (adressage + guidage), repères collaboratifs validés | Au Gabon on s'oriente par repères, pas par adresses ; greffé sur la stack carto (impossible avec Google Maps) |
| Langues | **i18n dès le départ** (français livré) | Ajout des langues locales sans refonte |

> Détails, alternatives et compromis dans chaque document. Les valeurs métier (commission, seuils, tarifs) restent définies dans `../product/`.
