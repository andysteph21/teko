# Teko — instructions de travail

Plateforme de transport à la demande pour le Gabon (MVP ride-hailing Libreville, Android, français). Backend Supabase livré et testé ; les 3 apps (`apps/client`, `apps/driver`, `apps/admin`) sont le chantier en cours.

## Sources d'autorité (dans cet ordre)

1. **[docs/plan/06-demarrage-apps.md](docs/plan/06-demarrage-apps.md)** — point d'entrée : quoi construire, dans quel ordre, pièges connus.
2. **[docs/architecture/10-regles-ingenierie.md](docs/architecture/10-regles-ingenierie.md)** — comment coder : Biome, frontières d'imports, architecture d'état, tests/couverture, parc d'appareils.
3. **Le backend fait autorité** : tout passe par les RPC ([supabase/README.md](supabase/README.md)) ; les 52 tests `supabase/tests/e2e/` sont la doc vivante des appels — **lire le test du flux avant de coder un écran**.
4. **`docs/design/design-tokens.json` fait autorité sur toute UI** ; maquettes dans `docs/design/maquettes/` (79), parcours dans `docs/design/parcours/`, langage carte figé dans `docs/design/08-carte-langage.md`. Tout écart maquette/code est un bug.
5. Règles métier : [docs/product/02-regles-metier.md](docs/product/02-regles-metier.md) (+ addendum 25 août).

## Règles de code (résumé — détail dans le doc 10)

- **Code et dossiers en anglais** (`apps/driver`, pas `chauffeur`) ; docs et textes UI en français.
- **Biome** (pas ESLint/Prettier) : fichier ≤ 300 lignes, fonction ≤ 60, ≤ 4 paramètres, complexité cognitive bornée — ce sont des gates CI, pas des suggestions.
- `@supabase/supabase-js` confiné à `packages/api-client` (+ `packages/maps`) ; `ui` n'importe jamais `api-client` ; les apps ne s'importent pas entre elles ; positions temps réel via `PositionsChannel` (ADR-13).
- État mobile : TanStack Query (serveur + mutations hors-ligne) · Zustand 5 (client, `useShallow` obligatoire, abonnements transitoires pour la carte) · expo-sqlite (file GPS). Jamais de logique métier sensible côté client.
- Tests d'abord pensés par construction : logique dans les packages purs (gate 95 %), écrans testés par variantes de maquette (~90 %), Maestro sur appareils réels pour les parcours critiques. 95 % = objectif, pas dogme.

## Environnement local

- `supabase start` puis `eval "$(supabase status -o env | sed 's/^/export /')"` ; carto : `infra/compose` (Martin :3333, Valhalla :8002).
- **3 appareils Android réels via adb USB** (OPPO A15 = vérité perf, Pixel 3, Tab A8) ; pas d'émulateur (pas de /dev/kvm). `adb reverse` : 8081, 54321, 3333, 8002.
- Builds Android : **JDK 17 portable** (`~/.local/jdk/`) — le JDK système casse AGP. MapLibre RN exige un dev client (pas d'Expo Go).

## Pièges à ne pas repayer

- `seed.sql` s'exécute **après** les migrations et écrase `app_config` — garder les deux alignés.
- Géométries : PostgREST et Realtime sérialisent en GeoJSON — toujours `toLonLat()` de `@teko/maps` ; entrée en EWKT `SRID=4326;POINT(lon lat)`. Les numériques reviennent en **strings** via supabase-js.
- Erreurs backend = messages français + code `42501` — passer par le mapper d'erreurs d'`api-client`, jamais de string-match dans l'UI.
- MapLibre refuse toute couche texte sans `glyphs` ; le style généré les dérive de l'origine des tuiles.
- En plpgsql, `row is not null` est faux dès qu'un champ est null — utiliser `found`.
- GoTrue expose les numéros **sans « + »** : rapprochements téléphone en **chiffres seuls**, normalisés à l'écriture (cf. `invite_admin`) — jamais d'égalité avec un E.164 brut (vécu : invitation admin jamais réclamée).
- **Metro ne résout PAS `./x.js` → `x.ts`** : dans les packages livrés en source, imports internes **sans extension** (seul format commun Metro/Vite/vitest/Turbopack).
- **Libs natives Expo : épingler aux versions de `expo/bundledNativeModules.json`** (reanimated, worklets, gesture-handler…). `auto-install-peers` tire sinon la dernière version → erreurs C++ (`executeSync` absent de WorkletRuntime, vécu).
- Auth téléphone locale : GoTrue ne l'active que si un **fournisseur SMS est déclaré** — bloc twilio factice dans `config.toml`, les numéros `test_otp` court-circuitent tout appel réel.
- Builds Android : `-PreactNativeArchitectures=arm64-v8a` (le parc est 100 % arm64) + `--max-workers=2-3` (28 Go partagés avec Docker) — build ×3 plus court.
- `expo prebuild --clean` **efface `android/local.properties`** → gradle échoue en « SDK location not found » : recréer `sdk.dir=$HOME/Android/Sdk` après chaque prebuild propre (vécu, lot 4).
- Edge-to-edge Android (obligatoire, RN 0.86) : tout panneau ancré `bottom: 0` doit réserver `paddingBottom: insets.bottom + spacing[5]`, sinon sa dernière rangée passe **sous la barre système** — peinte mais intouchable (bounds accessibilité [0,0], taps → home/recents ; vécu OPPO A15, P1 ride-cancel).

## Interdits

- `templates/` (Taxido) = référence visuelle uniquement, jamais de code repris.
- `envoi-client/` : le PDF coûts marqué INTERNE ne part jamais chez le client.
- Docs en français ; toute décision datée et tracée dans `docs/product/05-questions-ouvertes.md` (produit) ou le doc 10 (ingénierie) — jamais supprimée, toujours clôturée.
- Échanges client : toujours via `docs/plan/04-suivi-client.md`.
