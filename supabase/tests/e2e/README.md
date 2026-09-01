# Tests e2e — stack Supabase locale

Ces tests jouent les parcours réels contre la stack locale complète : des
**utilisateurs seed** (Nadia cliente, Boris chauffeur validé, admins ops/carto)
sont créés via l'API admin, puis chaque action passe par **PostgREST avec un
vrai JWT utilisateur** — la RLS et les gardes sont donc exercées exactement
comme depuis les apps. Les assertions vérifient **comment la base réagit** :
statuts, `ride_events`, notifications, écritures `ledger`, relevés.

Deux canaux, volontairement séparés (voir `helpers.ts`) :

- `supabase-js` + JWT → ce que les apps pourront faire ;
- connexion Postgres directe + GUC `teko.service = 'on'` → seed privilégié et
  inspection, comme les fonctions de service en production.

## Lancer en local

```bash
supabase start                       # depuis la racine du repo
eval "$(supabase status -o env | sed 's/^/export /')"
cd supabase/tests/e2e && npm install && npm test
```

## CI

`.github/workflows/e2e-ci.yml` exécute la même séquence sur chaque PR/push
touchant `supabase/`.

## Suites

| Fichier | Couvre |
|---|---|
| `ride-lifecycle.test.ts` | estimation, commande → offre au chauffeur en ligne, `offer_details` sans destination, PIN, clôture, commission ledger, notes, frais d'annulation (max(300 F, 20 %), no-show) |
| `dispatch.test.ts` | offre au plus proche, cascade sur refus, expiration par job, épuisement (client prévenu), rejeu d'offre refusé |
| `security-rls.test.ts` | isolation RLS effective (grants posés), anonyme sans accès, gardes anti-escalade, fonctions internes verrouillées, `daily_close` gardée, immuabilité du ledger |
| `finance-daily-close.test.ts` | solde négatif après course cash, `daily_close`, règlement Airtel simulé (callback service), idempotence |
| `finance-collect-edge.test.ts` | règlement à travers l'**Edge Function `airtel-collect` réelle** (provider mock) : ledger `settlement` posté, solde soldé, chauffeur réactivé, rejeu sans double crédit — régression « payé mais toujours suspendu ». Sans effet sur l'état partagé (pas de `goOnline`/`daily_close`) |
| `compte-sos.test.ts` | lieux favoris, partage de trajet public à jeton, SOS/incidents + alerte ops, suppression de compte (30 j, purge anonymisante), invitations admin, `validate_kyc`, re-vérification d'inactivité |
| `landmarks.test.ts` | proposition de repère, refus client, validation admin carto, notification du proposant, visibilité `nearest_landmarks` |

Les écarts E-01→E-17 relevés par la première version de cette suite sont
**comblés** (migrations `20260820*`, cf. `docs/architecture/08-ecarts-backend-ux.md`) ;
les anciens `it.fails` ont été inversés en assertions positives.

Convention : chaque spec qui met des chauffeurs en ligne (`goOnline`) les
repasse hors ligne en `afterAll(allOffline)` — les fichiers partagent la même
base et le dispatch vise le chauffeur en ligne le plus proche, quel que soit
le fichier qui l'a créé.
