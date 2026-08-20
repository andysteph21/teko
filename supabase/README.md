# Supabase — base de données Teko

Schéma initial du MVP (Postgres 17 + PostGIS), aligné sur `docs/architecture/02-backend-et-donnees.md`.

## Migrations

Fichiers SQL versionnés dans `migrations/`, appliqués dans l'ordre lexicographique (horodatage) :

| Fichier | Contenu |
|---|---|
| `…120100_extensions_and_helpers.sql` | PostGIS, types (enums), `set_updated_at()`, `business_day()` (coupure 04:00) |
| `…120200_profiles.sql` | `profiles`, helpers de rôle (`is_admin`…), création auto du profil, garde anti-escalade, RLS |
| `…120300_drivers_vehicles_kyc.sql` | `drivers`, `vehicles`, `driver_documents`, garde champs sensibles, RLS |
| `…120400_geo_referentials.sql` | `zones`, `landmarks`(+propositions), `road_segments`(+propositions), `gps_traces`, index GiST, RLS |
| `…120500_pricing_and_config.sql` | `pricing_rules`, `app_config`(+historique), valeurs par défaut, RLS |
| `…120600_rides.sql` | `rides`, `ride_events`, `ride_locations`, `ratings`, FK `gps_traces.ride_id`, RLS |
| `…120700_finance.sql` | `payments`, `ledger` (immuable), `daily_statements`, RLS |
| `…120800_notifications_devices_audit.sql` | `devices`, `notifications`, `data_usage`, `audit_log`, RLS |

Validées avec le parseur officiel Postgres (libpg_query / `pglast`).

## Conventions

- **Géométries** PostGIS en **SRID 4326**, type qualifié `extensions.geometry(...)` (PostGIS dans le schéma `extensions`, convention Supabase). Index **GiST** sur chaque colonne géométrique.
- **Clés** : `gen_random_uuid()` (natif PG17) pour les entités métier ; `identity` pour les journaux à fort volume.
- **`updated_at`** maintenu par trigger `set_updated_at()`.
- **Jour ouvré** : `business_day(ts)` rattache une transaction au bon jour (coupure 04:00 Africa/Libreville) — socle du solde journalier.

## Modèle RLS (résumé)

- Activée sur toutes les tables. Helpers `SECURITY DEFINER` (`is_admin()`, `is_driver()`, `has_admin_role()`, `is_ride_participant()`) pour éviter la récursion de politiques.
- **Client** : ses `rides`, `ratings`, son `profile`, ses `devices`/`data_usage` ; lecture des `landmarks`/`road_segments`/`zones` **validés**.
- **Chauffeur** : sa fiche `drivers` (champs KYC/activation/solde **protégés** par trigger), ses documents, son `ledger` et ses `daily_statements`, ses `gps_traces` (si consentement).
- **Admin** : accès élargi (sous-rôles ops/carto/finance via `admin_role`), actions journalisées (`audit_log`).
- **Finance** : `ledger` **append-only** (UPDATE/DELETE interdits) ; écritures financières réalisées par les **Edge Functions** (service role, hors RLS). Aucune écriture directe ouverte aux clients/chauffeurs.

## À faire ensuite (hors de ce lot)

- **Storage** : créer le bucket privé `kyc` (documents chauffeurs) avec policies d'accès admin + propriétaire (URLs signées courtes).
- **Realtime** : activer la publication sur `ride_locations` et les changements de statut de `rides`.
- **Edge Functions** : `price-quote`, `ride-complete`, `airtel-*`, `daily-close`, `road-detect`, `guidance`, `landmark-suggest` (cf. `docs/architecture/`).
- **Seed** : zones initiales + barème `pricing_rules` (à fournir une fois la tarification arrêtée).
- **Génération des types TS** : `packages/types` à partir de ce schéma.

## Tests automatisés (local + CI)

Deux niveaux :

1. **Validation de syntaxe** (rapide, sans base) — parseur officiel Postgres :
   ```bash
   pip install pglast
   python3 - <<'PY'
   import glob, pglast
   for f in glob.glob("supabase/**/*.sql", recursive=True):
       pglast.parse_sql(open(f).read()); print("OK", f)
   PY
   ```

2. **Exécution réelle + RLS** (Postgres + PostGIS via Docker) — **pgTAP** :
   ```bash
   supabase start          # applique toutes les migrations sur une base neuve
   supabase db lint --level warning
   supabase test db        # exécute supabase/tests/database/*.test.sql
   ```

### Ce que couvrent les tests (`tests/database/`)
- **`00_schema.test.sql`** : présence des tables clés, colonnes structurantes, **`business_day()`** (coupure 04:00), **immuabilité du `ledger`** (UPDATE/DELETE rejetés), garde anti-escalade de rôle.
- **`01_rls.test.sql`** : isolation RLS — un client ne voit que ses courses, seuls les **repères validés** sont visibles, un client ne lit pas le `ledger`, on ne crée pas une course au nom d'autrui, un chauffeur **ne peut pas s'auto-activer**.

> Les tests s'exécutent dans une transaction annulée (`rollback`) : aucune donnée résiduelle.

### Intégration continue
`.github/workflows/db-ci.yml` rejoue, à chaque PR touchant `supabase/`, `supabase start` (migrations) → `supabase db lint` → `supabase test db`. À activer en **required check** sur la branche `main`.

## Application locale (rappel)

Avec la CLI Supabase : `supabase start` puis `supabase migration up` (ou `supabase db reset` pour repartir de zéro). En remote : `supabase db push`.
