# Supabase — backend Teko

PostgreSQL 17/PostGIS fait autorité pour les courses, les tarifs et les soldes.
Les migrations horodatées sont exécutables et versionnées ; les types de
`packages/types/src/database.ts` sont générés depuis le schéma réel.

## Contrats alpha

| Domaine | Contrat |
|---|---|
| Invitations | Numéro vérifié dans Auth, liste gérée par Ops/superadmin ; le téléphone du profil ne fait pas foi |
| Devis | Edge Function `price-quote` → Valhalla → `create_ride_quote` réservé au serveur ; devis propriétaire, prix figé, durée configurable de 300 s |
| Commande | `request_quoted_ride`, devis unique et répétition idempotente ; cash immédiat seulement ; ancien `request_ride` inaccessible aux utilisateurs |
| Attribution | Offres et présence en base ; nouvelles tentatives et limite configurable de 180 s |
| PIN | `private.ride_pins`, aucune valeur dans la ligne publique ou Realtime ; lecture `ride_pin` pour le passager ; démarrage `start_ride_checked` pour le chauffeur |
| Tentatives PIN | Cinq échecs puis cinq minutes de blocage. Les refus retournent un résultat explicite pour conserver le compteur malgré la transaction |
| Finance | Grand livre append-only ; jamais d’écriture directe depuis l’app. Frais en attente dans `cancellation_claims` |
| Règlements | `prepare_manual_receipt`, `approve_manual_receipt` ; preuve privée et référence unique ; Ops prépare, Finance/superadmin valide |
| Corrections | Refus motivé et versions liées, même référence, une seule validation financière possible |
| Clôture | RPC/job à 4 h Africa/Libreville ; versements dans `payout_requests`, statut payé seulement après validation réelle |
| Paiements Airtel | Endpoints réels fermés par défaut pour l’alpha. Le fournisseur simulé exige aussi un secret de banc isolé |

Les comptes `anon`/`authenticated` n’ont aucun droit sur les fonctions internes.
Les tables portent la RLS ; l’existence d’une politique ne remplace pas les
contrôles de grants et les gardes des fonctions `SECURITY DEFINER`.

Les géométries sont en SRID 4326. Les numéros sont normalisés en chiffres seuls.
Le jour métier change à 4 h en Afrique/Libreville, indépendamment du fuseau de
l’appareil. Les paramètres de déploiement, URL et secrets de webhook sont
propres à chaque environnement : le seed ne contacte aucune autre stack.

## Banc d’audit isolé

Ne pas lancer une remise à zéro contre une stack de travail contenant des
données utiles. Le banc alpha utilise le projet `teko-alpha-audit`, API 58321,
PostgreSQL 58322 ; les autres projets restent séparés.

```bash
node tools/audit/prepare-bench.mjs
supabase start --workdir /tmp/teko-alpha-bench --exclude studio,postgres-meta,logflare,vector,supavisor
supabase functions serve --workdir /tmp/teko-alpha-bench --env-file /tmp/teko-alpha-functions.env
```

Le préparateur copie les sources et crée des secrets de test locaux sans les
afficher. Valhalla doit être accessible sur le port 8002 pour le test réel de
routage. Le seed Libreville reste réservé au développement/staging.

Dans un autre terminal :

```bash
supabase test db --workdir /tmp/teko-alpha-bench
node tools/audit/run-bench.mjs
node tools/audit/check-mutations.mjs
node tools/audit/generate-types.mjs
```

Les mutations injectées ne se lancent jamais en parallèle d’autres tests de
base. Chaque faute est restaurée dans un `finally`. Le harnais E2E refuse
explicitement les URL et bases qui ne sont pas celles du banc jetable.
La génération des types remplace le fichier atomiquement pour ne pas perturber
Metro ou TypeScript pendant une vérification.

Depuis `supabase/functions` : `deno lint .`, puis `deno test --allow-env .`.
Les tests Deno couvrent les gardes réseau et les paiements ; les tests E2E
exercent Auth, PostgREST, RLS et Storage avec de vrais JWT. Les appareils et la
restauration ont leurs propres validations : des tests unitaires verts ne les
remplacent pas.

## Références

- [Plan et critères bloquants](../docs/plan/08-plan-alpha.md).
- [Décisions et points ouverts](../docs/product/05-questions-ouvertes.md).
- [Architecture](../docs/architecture/01-vue-ensemble.md).
- [Catalogue de tests](tests/README.md) et [E2E](tests/e2e/README.md).
