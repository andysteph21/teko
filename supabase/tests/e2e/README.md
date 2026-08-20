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
| `ride-lifecycle.test.ts` | estimation, commande, acceptation exclusive, PIN, clôture, commission ledger, notes, annulations |
| `security-rls.test.ts` | isolation RLS entre utilisateurs, gardes anti-escalade, RPC admin fermées, immuabilité du ledger |
| `finance-daily-close.test.ts` | solde négatif après course cash, `daily_close`, règlement Airtel simulé (callback service), idempotence |
| `landmarks.test.ts` | proposition de repère, refus client, validation admin carto, visibilité `nearest_landmarks` |

Les tests documentent aussi les **écarts connus** (`docs/architecture/08-ecarts-backend-ux.md`) :
l'id de course passe « hors bande » au chauffeur (écart E-01, pas de dispatch)
et l'absence de frais d'annulation est assertée telle quelle (écart E-03) —
ces assertions devront être inversées quand les écarts seront comblés.
