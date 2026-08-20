# 07 — Évaluation de la stack : Supabase + Expo, est-ce le bon choix ?

**Date :** 20 août 2026 · **Statut :** évaluation à froid, demandée avant d'écrire le code des apps.

Le backend Supabase existe déjà (15 migrations, ~40 RPC, RLS, ledger, Edge Functions Airtel, tests). Cette évaluation ignore volontairement le travail déjà investi dans un premier temps : on juge la stack **comme si on partait de zéro**, puis on réintègre le coût de migration à la fin. Un choix ne doit pas être gardé parce qu'il est là, ni jeté parce qu'il est à la mode de le refaire.

## 1. Critères de décision (pondérés pour Teko)

| # | Critère | Poids | Pourquoi ce poids |
|---|---|---|---|
| C1 | **Coût mensuel MVP → croissance** | Fort | Budget serré (cf. `../plan/03-estimation-couts-ti.md`) ; chaque brique managée se paie en devises |
| C2 | **Maintenabilité par une très petite équipe** | Fort | 1–2 devs ; pas d'équipe ops. Le temps passé à administrer des serveurs est du temps volé au produit |
| C3 | **Géospatial sérieux (PostGIS)** | Fort | Repères, zones, routes crowdsourcées, map-matching : le géospatial est le cœur différenciant, pas une option |
| C4 | **Temps réel** (positions, états de course) | Fort | Cœur du produit ride-hailing |
| C5 | **Intégrité financière** (transactions, ledger) | Fort | Solde journalier, réconciliation Airtel : il faut de vraies transactions ACID |
| C6 | **Latence depuis le Gabon** | Moyen | Aucun fournisseur BaaS n'a de région africaine adaptée ; tout le monde est logé à la même enseigne (~100–150 ms vers Paris via le câble ACE) |
| C7 | **Sobriété data / offline** | Moyen | Contrainte réseau gabonaise, déjà traitée surtout côté client |
| C8 | **Verrouillage fournisseur (lock-in)** | Moyen | Marché à devises ; il faut une porte de sortie crédible |
| C9 | **Compétences de l'équipe** (TS/React) | Moyen | Recrutement local + vitesse de développement |

## 2. Backend — Supabase face aux alternatives

| Option | C1 coût | C2 ops | C3 PostGIS | C4 realtime | C5 ACID | C8 lock-in | Verdict |
|---|---|---|---|---|---|---|---|
| **Supabase managé** (actuel) | 0–25 €/mois MVP | ✅ zéro ops | ✅ natif | ✅ inclus | ✅ Postgres | 🟡 faible (open source, self-hostable) | **Retenu** |
| Firebase (Firestore) | ~équivalent puis imprévisible | ✅ | ❌ **rédhibitoire** : pas de PostGIS, geoqueries par geohash bricolées, pas de jointures | ✅ excellent | ❌ transactions limitées, pas de SQL | 🔴 total (propriétaire Google) | Éliminé sur C3+C5 |
| Backend custom (NestJS/Fastify + Postgres managé + Redis + WebSocket) | VPS 20–40 € mais **+ temps homme massif** | ❌ tout à construire : auth OTP, RLS-équivalent, realtime, storage, déploiement | ✅ | 🟡 à construire (Socket.io/MQTT) | ✅ | ✅ nul | Meilleur contrôle, mais 2–4 mois de travail pour re-livrer ce que Supabase donne le jour 1. Injustifiable à 1–2 devs |
| Supabase **self-hosted** (OVH/Scaleway) | VPS ~20–40 € | 🟡 sauvegardes, upgrades, sécurité à ta charge | ✅ | ✅ | ✅ | ✅ nul | **Pas maintenant** — c'est la **porte de sortie** documentée, pas le point de départ |
| **Nhost** (Postgres + Hasura GraphQL) | comparable | ✅ | ✅ **PostGIS supporté** | ✅ subscriptions GraphQL (bon marché à grande échelle) | ✅ | 🟡 faible (open source) | **Seul rival crédible sur le papier.** Mais workflow GraphQL-first : les ~40 RPC et la RLS seraient à re-plomber en permissions Hasura, pour un gain nul sur nos critères ; société plus petite, écosystème RN moins mûr. Écarté |
| PocketBase / Appwrite | faible | ✅ | ❌ SQLite / MariaDB, pas de PostGIS | 🟡 | 🟡 | ✅ | Éliminés sur C3 |
| AWS Amplify / AppSync | imprévisible | 🟡 complexité AWS | 🟡 via Aurora | ✅ | ✅ | 🔴 fort | Complexité et coût sans gain pour cette taille |

**Conclusion backend : Supabase managé gagne même en partant de zéro.** La raison de fond n'est pas le confort : c'est que Teko est une application **Postgres-native** — le ledger immuable, les gardes anti-escalade, le `daily_close`, les zones/repères PostGIS et le pipeline de routes sont du SQL transactionnel que Firebase ne sait pas faire et qu'un backend custom obligerait à réécrire autour. Supabase est la seule option qui donne ce Postgres-là **plus** l'auth OTP, le realtime, le storage KYC et les fonctions serveur sans embaucher un ops.

Le travail déjà investi (qui aurait dû être ignoré) va dans le même sens : ~40 RPC testées seraient à réécrire pour un gain nul.

### Risques réels du choix Supabase — et leurs garde-fous

| Risque | Réalité | Garde-fou |
|---|---|---|
| **R-A. Realtime en fan-out massif** (positions chauffeurs) | Le plan Pro plafonne les connexions concurrentes ; au-delà de quelques milliers de chauffeurs simultanés, diffuser les positions par Supabase Realtime coûtera cher ou saturera | Isoler la diffusion de positions derrière `packages/api-client` (une interface `PositionsChannel`). Si besoin : petit service WebSocket/MQTT co-localisé avec l'infra carto Paris, sans toucher au reste. **Seuil de réévaluation : ~1 000 chauffeurs en ligne simultanés** |
| **R-B. Latence Gabon → Paris** (~100–150 ms RTT) | Acceptable pour états de course et paiements ; imperceptible face aux 3–15 s d'un appariement. Aucune alternative ne fait mieux (aucun BaaS en Afrique centrale) | Déjà traité : ADR-11 (Paris `eu-west-3`, câble ACE direct Libreville→Penmarch), file offline côté client, mode éco. Réévaluer si Supabase ouvre une région africaine |
| **R-C. Lock-in** | Faible : Postgres standard + Supabase open source. Les seules adhérences : Auth (GoTrue), Realtime, Edge Functions Deno | Porte de sortie = **self-host Supabase sur OVH/Scaleway Paris**, co-localisé avec Martin/Valhalla. Les migrations SQL et RPC se rejouent telles quelles. À documenter comme procédure, jamais à improviser en crise |
| **R-D. Edge Functions Deno** (cold starts, débogage) | Gênant surtout pour les webhooks Airtel sensibles au temps | Idempotence déjà en place ; si un callback dépasse les timeouts en pratique, le déplacer vers un micro-service Node sur le VPS carto |
| **R-E. Hausse de prix Supabase** | Possible (SaaS) | Même porte de sortie que R-C ; le coût de bascule est borné et connu |

## 3. Mobile — Expo/React Native face aux alternatives

| Option | Verdict |
|---|---|
| **Expo SDK 56 (React Native)** — actuel | **Retenu.** Un seul langage (TS) sur les 3 apps + le backend ; `packages/core` (prix, solde, états) et les types générés depuis Supabase partagés partout ; **EAS Update (OTA) est décisif au Gabon** — les utilisateurs ne mettent pas à jour leurs apps (data chère), or on pourra corriger sans repasser par le Play Store ; MapLibre Native a un binding RN maintenu (`@maplibre/maplibre-react-native`) ; New Architecture + Hermes V1 tiennent bien sur l'Android d'entrée de gamme visé |
| Flutter | Meilleures perfs brutes sur très bas de gamme et carte plus fluide, mais : deuxième langage (Dart) à maintenir, **aucun partage de code** avec l'admin Next.js ni les types Supabase, binding MapLibre moins mûr, OTA limité par les politiques store (Shorebird = coût/complexité en plus). Le gain ne paie pas la fragmentation pour 1–2 devs |
| Kotlin natif (Android-first) | Perf maximale, mais double codebase dès qu'iOS arrive, pas de partage avec le web, vitesse de dev bien moindre. Pertinent seulement si RN échouait sur les téléphones cibles — à vérifier tôt (voir §6) |
| KMP (Kotlin Multiplatform) | Trop jeune côté UI partagée, compétences rares localement | Éliminé |

**Conclusion mobile : Expo est le bon choix**, principalement à cause du **partage TS de bout en bout** et de l'**OTA**, deux avantages structurels dans ce contexte précis. Le seul vrai point d'interrogation est la fluidité de la carte MapLibre sur un Android à 100 €, et il se teste en quelques jours (spike, §6).

## 4. Verdict d'ensemble

**La stack actuelle est confirmée : Supabase managé (Paris) + Expo RN + Next.js admin + carto self-hosted.** Ce n'est pas un choix par inertie : les alternatives perdent sur les critères les plus lourds (PostGIS, ACID, ops à 1–2 devs, OTA). Les faiblesses réelles de Supabase (fan-out realtime à grande échelle, latence intercontinentale, lock-in résiduel) ont chacune un garde-fou nommé et un seuil de réévaluation — aucune n'est un mur avant plusieurs milliers d'utilisateurs actifs.

Nouvelles entrées au registre ADR (`05-decisions-et-transverses.md` à amender) :

- **ADR-12 — Supabase managé confirmé après évaluation contradictoire** (ce document). Réévaluation déclenchée par : ~1 000 chauffeurs simultanés, région africaine Supabase, ou hausse tarifaire majeure.
- **ADR-13 — Diffusion des positions derrière une abstraction** (`PositionsChannel` dans `packages/api-client`) : Supabase Realtime aujourd'hui, service WebSocket/MQTT co-localisé demain si R-A se matérialise.
- **ADR-14 — Porte de sortie documentée** : procédure de self-host Supabase sur le VPS carto (OVH/Scaleway Paris), à rédiger avant le lancement public (pas avant le MVP).

## 5. Vérification en ligne (20 août 2026)

Les affirmations clés ont été contrôlées contre les sources publiques actuelles :

- **Tarifs Supabase confirmés** : Pro à 25 $/mois, **500 connexions Realtime concurrentes incluses**, puis 10 $/1 000 connexions supplémentaires — cohérent avec le seuil de réévaluation R-A ([supabase.com/pricing via analyses 2026](https://schematichq.com/blog/supabase-pricing)).
- **Région Paris `eu-west-3` disponible**, conformément à ADR-11 ([docs régions Supabase](https://supabase.com/docs/guides/platform/regions)).
- **Aucune région africaine, et rien d'annoncé** : une région Afrique du Sud a existé en alpha puis a été **retirée** pour complexité opérationnelle ; les demandes communautaires restent ouvertes sans engagement ([discussion GitHub](https://github.com/orgs/supabase/discussions/21429)). Le déclencheur « région africaine » d'ADR-12 est donc peu probable à moyen terme — la latence via Paris est la réalité durable.
- **Nhost supporte PostGIS** ([docs extensions Nhost](https://docs.nhost.io/products/database/extensions)) — c'est le seul concurrent qui passe le critère C3, d'où son ajout au tableau §2 ; il reste écarté pour les raisons indiquées (re-plomberie GraphQL/Hasura sans gain).
- **Convex / Neon** : Convex n'a ni Postgres ni PostGIS (éliminé sur C3/C5) ; Neon est une base Postgres serverless sans auth/realtime/storage — il faudrait lui adjoindre un backend custom, ce qui ramène au cas déjà éliminé.

## 6. Prochaines étapes techniques (avant/pendant le lot 1)

1. **Spike MapLibre RN** (2–3 jours) : carte + 20 marqueurs animés + tuiles PMTiles Gabon sur un Android d'entrée de gamme réel. C'est le seul test qui peut encore invalider Expo — le faire **avant** d'écrire `packages/ui`.
2. **Spike Realtime** : mesurer depuis Libreville (ou avec latence simulée ~130 ms) la fraîcheur des positions et le coût data/minute du canal — alimente le widget conso et valide R-A/R-B.
3. **Corriger R1** (signature callback Airtel placeholder — registre des risques) : indépendant de la stack, bloquant pour le go-live.
4. Monter le squelette `apps/` + `packages/` (ADR-01) une fois les 6 questions bloquantes client répondues (`../plan/04-suivi-client.md`).
