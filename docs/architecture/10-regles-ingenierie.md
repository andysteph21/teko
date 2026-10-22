# 10 — Règles d'ingénierie des applications

**Date :** 25 août 2026 · **Statut :** acté (décisions du porteur, andyedzo) · **Périmètre :** tout code sous `apps/*` et `packages/*` à partir du lot 1. Ce document complète [06-demarrage-apps.md](../plan/06-demarrage-apps.md) (quoi construire) en fixant **comment** le construire. Vérifications de versions et d'état des bibliothèques faites le 25 août 2026 (sources en fin de document).

## 1. Décisions de fond

| Sujet | Décision | Note |
|---|---|---|
| Nommage | **Code, identifiants et dossiers en anglais** → `apps/client`, `apps/driver`, `apps/admin` | Amende le §2 de 06-demarrage-apps (qui disait `apps/chauffeur`). Les IDs d'écrans (C-xx, D-xx, A-xx), les docs et les textes UI restent français |
| Lint & format | **Biome** (v2.5.x) remplace ESLint 9 + Prettier | Migration de `@teko/config` au lot 1 (§2) |
| État client (mobile) | **Zustand 5 + TanStack Query v5 + file expo-sqlite** | Architecture détaillée §4 ; issue de l'évaluation du guide Expo local-first |
| État client (admin) | **Zustand + TanStack Query** | Mêmes règles de séparation |
| Styling mobile | **`StyleSheet` + tokens générés depuis `design-tokens.json`** dans `packages/ui` — zéro dépendance de styling | Pas de NativeWind/Tamagui : fidélité tokens directe, coût runtime nul sur téléphones faibles |
| Styling admin | **Tailwind v4**, tokens exposés en variables CSS depuis la même source | |
| Couverture de tests | **Paliers** : 95 % packages (gate CI) · ~90 % apps · 100 % des parcours critiques en e2e | 95 % est un objectif, pas un dogme : jamais de test écrit « pour le chiffre » (§6) |
| Extensions backend | **Autorisées dans le périmètre des lots apps** : envoi push FCM + livraison des offres, fonction `guidance`, job `detection_routes`, purge GPS (CL-06) | Migrations + tests pgTAP/e2e obligatoires, mêmes suites que l'existant |
| Parc de test | **3 appareils physiques via adb (USB)** — §7 | Pas d'émulateur possible sur la machine (pas de `/dev/kvm`) |

## 2. Outillage — Biome

**Version :** `@biomejs/biome` 2.5.x (2.5.10 au 25 août). Config **monorepo native** : `biome.json` racine avec `"root": true`, configs par package avec `"extends": "//"` pour les surcharges locales (domaine `next` dans `apps/admin`, `reactNative` dans les apps Expo).

### Garde-fous activés (règles exactes)

| Garde-fou | Règle Biome | Réglage |
|---|---|---|
| Longueur max de fichier | `style/noExcessiveLinesPerFile` | 300 lignes (tests exclus via override) |
| Longueur max de fonction | `complexity/noExcessiveLinesPerFunction` | 60 lignes |
| Complexité | `complexity/noExcessiveCognitiveComplexity` | seuil par défaut (15) |
| Nombre max de paramètres | `complexity/useMaxParams` | 4 |
| Imports interdits | `style/noRestrictedImports` (`paths` + `patterns`) | Voir frontières §3 |
| Cycles d'imports | `correctness/noImportCycles` | activé |
| Dépendances non déclarées | `correctness/noUndeclaredDependencies` (domaine `project`) | activé |
| Imports/exports de types | `style/useImportType` + `useExportType` | autofix |
| Hooks React | `correctness/useExhaustiveDependencies` + `useHookAtTopLevel` (domaine `react`) | activé |
| React Native | domaine `reactNative` (`noReactNativeRawText`, `noReactNativeLiteralColors`…) | activé (nursery : à re-vérifier à chaque montée de version) |
| Next.js | domaine `next` | activé dans `apps/admin` |
| Accessibilité | groupe `a11y` | recommandé |
| Vars d'env turbo | domaine `turborepo` (`noUndeclaredEnvVars`) | activé |

Limites connues et assumées : pas de règle `max-depth` (couverte indirectement par la complexité cognitive ; plugin GritQL possible si besoin) ; Biome ne formate **ni Markdown ni YAML** → ces fichiers ne sont plus formatés automatiquement (Prettier est retiré, pas conservé en doublon).

**Dérogation `tools/**` (1ᵉʳ sept. 2026) :** les scripts utilitaires hors livrable (`tools/dev/` — simulateurs client/chauffeur, `tools/demo/` — enregistreur) sont hors périmètre de ce document (qui couvre `apps/*` et `packages/*`) : override dans `biome.json` racine qui coupe `noRestrictedImports` (ils simulent volontairement un client supabase-js brut), les règles de complexité et `noUndeclaredDependencies` (dépendances hissées du workspace) — même traitement que `apps/labo-carte` et `packages/maps/demo`. Le **formateur** continue de s'appliquer partout, `tools/` compris.

### Intégration

- Scripts : `lint` = `biome check .`, CI = `biome ci` (reporter GitHub, annotations inline). Tâche racine turbo (`//#lint`) plutôt que par package — Biome est assez rapide, recommandation officielle Turborepo.
- `expo lint` n'est pas utilisé (simple wrapper ESLint, rien n'en dépend). Next.js 16 a retiré `next lint` — Biome est une voie officiellement supportée.
- `turbo boundaries` (tags) reste **expérimental** : on peut le lancer à titre indicatif, on ne gate pas la CI dessus. Les frontières sont tenues par Biome (§3).
- Migration lot 1 : retirer `eslint`/`prettier` de `@teko/config` et du catalog, adapter `packages/maps` et `apps/labo-carte`, remplacer `format`/`format:check` racine.

## 3. Architecture du code

- **Écrans minces, logique extraite.** Un écran compose des composants `packages/ui` et des hooks ; la logique métier d'affichage vit dans des hooks testables ou dans `packages/core`. Structure par features dans chaque app (`features/ride/`, `features/balance/`…), pas par types techniques.
- **Frontières d'imports (tenues par `noRestrictedImports`, échec CI) :**
  - `@supabase/supabase-js` est **confiné à `packages/api-client`** (et à l'adaptateur existant de `packages/maps`). Aucun écran, composant ou hook d'app ne le touche.
  - `packages/ui` n'importe jamais `api-client` (pureté présentationnelle).
  - Les apps ne s'importent jamais entre elles ; tout partage passe par un package.
  - Les positions temps réel passent par l'abstraction **`PositionsChannel`** de `api-client` (ADR-13) — jamais Supabase Realtime en direct.
- **Erreurs backend :** le backend renvoie des messages français (« PIN incorrect », « Offre déjà traitée ») et le code `42501` pour les privilèges. `api-client` expose un **mapper d'erreurs centralisé** (par code quand il existe, par préfixe de message sinon) ; l'UI ne fait **jamais** de string-match sur `error.message`.
- **Le backend fait autorité** : aucune règle métier sensible côté client ; `packages/core` ne contient que des règles pures d'affichage/estimation (formatage XAF, journée métier 04:00, types `MobileMoneyProvider`).

## 4. État & données (apps mobiles)

**Amendement alpha du 18 octobre 2026, confirmé par le porteur :** conserver
l’historique en cache et les positions GPS temporairement ; commandes et
annulations exigent une confirmation serveur, sans rejeu tardif automatique.
La file de mutations décrite ci-dessous ne doit donc pas être appliquée à ces
deux actions pour l’alpha. Les choix de délai, rétention locale, déduplication
et traitement d’une réponse réseau perdue seront soumis au porteur avant
implémentation. Voir les [décisions produit](../product/05-questions-ouvertes.md)
et le [plan alpha](../plan/08-plan-alpha.md).

Architecture en **trois couches, un propriétaire par domaine d'état** — issue de l'évaluation du guide [Expo local-first](https://docs.expo.dev/guides/local-first/) (qui ne recommande rien et met en garde : outils « à leurs débuts ») comparé à Zustand :

1. **TanStack Query v5** — tout l'état serveur (courses, tarifs, historique, profil) **plus les actions différées hors-ligne** (commander/annuler, noter, éditer le profil) : mutations en pause (`networkMode`), `PersistQueryClientProvider` + `resumePausedMutations()`, `scope: { id }` pour l'ordre FIFO. **Obligatoire :** `queryClient.setMutationDefaults()` enregistré au niveau client (sans lui, les mutations reprises ne font *silencieusement rien*), `buster` par release, politique explicite pour les actions de plus de 24 h (`maxAge`). `onlineManager` branché sur NetInfo, `focusManager` sur AppState.
2. **Zustand 5** — l'état client : machine à états de la course en cours (store simple, transitions gardées par des fonctions d'action — testables en pur via `zustand/vanilla`), réglages, état UI/carte. **Règles :** ne jamais recopier des données Query dans Zustand ; plusieurs petits stores plutôt qu'un store-dieu ; sélecteurs multi-valeurs toujours via `useShallow` (piège v5 : « Maximum update depth exceeded ») ; **abonnements transitoires** (`subscribeWithSelector`) pour les écrans carte — les mises à jour GPS/marqueurs écrivent dans des refs / APIs impératives MapLibre / shared values Reanimated, **zéro re-render React** : c'est le motif clé pour 60 fps sur Helio P35.
3. **expo-sqlite** — la **file GPS haute fréquence** : table append-only (ring buffer **borné** — une coupure de 12 h ne doit pas la faire grossir sans limite), flush par lots via un RPC à la reconnexion, purge sur ack, `withExclusiveTransactionAsync` (les transactions async ne garantissent pas l'ordre). Les mutations Query sont le mauvais outil ici (bloat du cache, throttle de persistance 1 s, sémantique maxAge). Zustand n'y tient que les compteurs en mémoire pour l'UI.

**Persistance des réglages :** `zustand/persist` sur **`expo-sqlite/kv-store`** (API AsyncStorage + variantes sync, zéro module natif supplémentaire). **Pas de react-native-mmkv** (dépendance native Nitro évitable ; à réévaluer uniquement sur profiling). Gate d'hydratation : ne pas rendre les écrans course avant `hasHydrated` + restauration du QueryClient.

**Versions à figer au catalog (vérifiées npm, 25 août 2026) :** `zustand` 5.0.15 · `@tanstack/react-query` + `@tanstack/react-query-persist-client` 5.102.x (en lockstep) · `expo-sqlite` ~57.x (aligné SDK) · NetInfo via `npx expo install`.

**Écartés (et pourquoi) :** **Legend-State v3** — le meilleur sur le papier (réactivité fine, sync Supabase intégrée) mais **beta permanente depuis ~2,5 ans** (beta.48, juil. 2026), bus factor ≈ 1, incompatibilités React Compiler, crashs observables dans les worklets Reanimated (#518) — exactement nos écrans carte ; **TinyBase** — sain (v9.5) mais duplique le rôle de TanStack Query et son persister expo-sqlite est « experimental » ; **MMKV** — gain réel seulement pour de l'état lourd/haute fréquence que nous n'avons pas à persister. À revoir dans 6-12 mois : TanStack DB.

## 5. Styling

- **Mobile :** générateur `design-tokens.json` → module TS de tokens typés dans `packages/ui` (couleurs, espacements, rayons, typo, z-index, durées) ; composants en `StyleSheet.create` sur ces tokens. Tout écart maquette/code est un bug (règle existante du projet). Safe areas dès le premier écran (edge-to-edge API 36 sans opt-out).
- **Admin :** Tailwind v4 ; le même générateur émet les tokens en variables CSS (`--color-brand-800`…) mappées dans la config Tailwind. Breakpoints du design system (1024/768) — cf. [07-admin-responsive.md](../design/07-admin-responsive.md).

## 6. Tests & couverture

| Couche | Outil | Cible |
|---|---|---|
| `packages/*` (core, api-client, ui, i18n, telemetry, maps) | **Vitest** (+ Testing Library pour ui) | **95 % lignes — gate CI par package** |
| Apps mobiles (hooks, composants, écrans) | **jest-expo + React Native Testing Library** | ~90 % ; chaque écran testé dans ses **variantes de maquette** (C-13b, D-08b, D-11b, D-14b… = liste de cas de test) |
| Apps mobiles bout en bout | **Maestro** sur le parc adb (§7), contre la stack Supabase locale (utilisateurs seedés + OTP de test) | 100 % des parcours critiques : inscription→OTP→commande→PIN→course→paiement→note ; KYC→en ligne→offre→course→solde ; hors-ligne→reprise |
| Admin bout en bout | **Playwright** contre `next dev` + Supabase local | Parcours K–O critiques |
| Contrat backend | Suite existante `supabase/tests/e2e` (52) + pgTAP (56) | Toute extension backend étend ces suites |

Principes : les 95 % se gagnent par construction (logique dans les packages purs), pas par des tests d'implémentation ; **tester le comportement, jamais les détails internes** ; le chemin hors-ligne (tuer l'app hors réseau → relancer → reprise des mutations) a ses tests d'intégration dès le lot 1 (risque n° 1 de l'archi d'état). Config locale requise : `[auth.sms]` + numéros `test_otp` dans `supabase/config.toml` (lot 1) pour exercer l'auth téléphone.

CI (lot 1) : workflow racine `turbo lint typecheck test build` + `biome ci` + gates de couverture ; Maestro/Playwright en workflows dédiés ; EAS Workflows pour le cycle mobile (fingerprint → build natif ou OTA).

## 7. Parc d'appareils (connectés en USB, `adb devices`)

| Appareil | Android / API | SoC / RAM | Rôle |
|---|---|---|---|
| **OPPO A15 (CPH2185)** | 10 / API 29 | Helio P35, 2-3 Go | **Vérité performance** — proxy bas de gamme Gabon ; le spike MapLibre et tout budget perf se jugent ici |
| Pixel 3 | 12 / API 31 | Snapdragon 845 | Appareil de dev quotidien |
| Galaxy Tab A8 (SM-X200) | 14 / API 34 | Unisoc T618 | API la plus récente du parc + layouts tablette |

Le parc fixe le **minSdk plancher : 29** (défaut Expo 24 — ne pas le relever au-delà de 29). Boucle de dev : dev client EAS/local (JDK 17 portable, cf. pièges 06-demarrage §6) + `adb reverse` par appareil : Metro 8081, Supabase 54321, Martin 3333, Valhalla 8002.

## 8. Registre des questions d'ingénierie

Signalements et questions techniques transverses : datés, jamais supprimés, clôturés avec l'analyse retenue (pendant du registre produit `docs/product/05-questions-ouvertes.md`).

### Q1 — 1ᵉʳ septembre 2026 · D-10 : tap « Accepter » atterri sur la barre d'onglets (OPPO A15) — **clôturée**

**Signalement** (session teko-c5, reproduit une fois après ~3 h d'app au premier plan, non systématique) : sur le modal d'offre, un tap sur « Accepter la course » a déclenché un onglet de D-09.

**Analyse (lecture de code ; non reproduit sur appareil — la fenêtre est fermée par construction, voir correctif).** L'overlay du modal (`apps/driver/src/features/work/offer-modal.tsx`) est le dernier enfant de l'écran D-09 : il couvre tout l'écran, **`HomeTabs` compris**, et la rangée Refuser/Accepter recouvre les pressables des onglets (de l'ordre de 20-30 dp selon `insets.bottom`, l'app étant edge-to-edge). Tant que le modal est monté, le scrim avale tout tap — aucun chemin vers les onglets. Mais à l'échéance, l'ancien `useCountdown` appelait `onExpire` au tic (250 ms) → `setOffer(null)` dans `use-offer-feed` → **démontage synchrone de tout l'overlay, sans grâce ni animation de sortie**. Un tap engagé (le doigt part 100-200 ms avant le contact) atterrit alors sur `tab-*` → navigation. Fenêtre aggravée par le repli `listPendingOffers` au focus, qui peut monter une offre à moins de 2 s de l'échéance (modal éclair).

**Hypothèse (a) inset manquant — écartée comme cause du symptôme** : ce motif est déterministe et viserait la barre système, pas les onglets de l'app. L'inset manquait néanmoins réellement (marge basse fixe de 18 dp : bas du panneau derrière la barre système en edge-to-edge) → corrigé au passage (`marginBottom: 18 + insets.bottom`, même pattern que les écrans client). **Hypothèse (b) cycle de vie — retenue** : démontage instantané à l'expiration, concurrent du tap, sur fond de recouvrement géométrique actions/onglets.

**Correctif** (`use-offer-countdown.ts`, testé unitairement + tests du modal) : à 0, le modal reste monté **600 ms actions désarmées** (`OFFER_EXPIRE_GRACE_MS` — le tap en vol est avalé par les vues encore en place, le chrono affiche « 0 s ») avant d'appeler `onExpire` ; si un « Accepter » est déjà en vol (`busy`), l'issue revient à la réponse du serveur, jamais au chrono local.

**Si récidive malgré la grâce** : `adb shell uiautomator dump` au moment du symptôme — bounds du bouton nuls ou décalés = problème de layout ; bounds corrects mais tap perdu = cycle de vie/hit-test (vérifier alors la dérive d'horloge appareil↔serveur : `expires_at` est côté serveur, un client en avance ferme tôt). Question produit dérivée — plancher d'affichage d'une offre presque échue — portée au registre produit (05, §3).

---

*Sources des vérifications (25 août 2026) : registre npm (zustand, @tanstack/react-query, @biomejs/biome, @legendapp/state, tinybase), biomejs.dev (changelog, règles, domaines), docs.expo.dev (local-first, sqlite, using-eslint), tanstack.com (network-mode, persistQueryClient, react-native), turborepo.dev (boundaries, guide Biome), dépôts GitHub des bibliothèques (issues citées).*

## Compléments d’ingénierie alpha — 18 octobre 2026

Ces décisions remplacent, pour l’alpha, les propositions antérieures de
mutations TanStack différées automatiquement : aucune commande de course,
annulation ou disponibilité ne doit se rejouer tardivement sans confirmation.
L’historique est un cache local par compte ; seule la file de mesures GPS
conserve des éléments à envoyer (24 h maximum, heure d’origine préservée).

Le service de localisation Android est au premier plan, avec notification
permanente. Il utilise la permission de localisation au premier plan ; ne pas
ajouter de permission de localisation permanente sans besoin démontré. Les
mesures sont persistées avant les requêtes réseau ; une réponse ancienne ne
doit pas écraser un changement de disponibilité plus récent.

Les APK USB sont signés par une clé alpha dédiée hors Git et utilisent des
identifiants distincts. Le GPS fictif exige le drapeau de build explicite et
l’URL exacte du banc local ; il affiche un bandeau visible. Les APK terrain
n’activent pas ce drapeau et doivent être validés avec GPS réel à Libreville.
Le temps Android `am start -W` ne suffit pas à mesurer l’interactivité React
Native : compléter par le parcours visible, mémoire et fluidité sur l’OPPO.

### Décision du 19 octobre 2026 — compilateur de la console

Le porteur conserve Turbopack pour l’alpha et demande de poursuivre le
diagnostic du refus de port interne. Le build Webpack réussi constitue une
preuve de diagnostic, pas un changement de compilateur dans les scripts ou
la CI. La validation attendue reste un build de production Turbopack réussi.

### Investigation du 19 octobre — tâches GPS en arrière-plan

L’envoi après panne API attend le retour au premier plan sur le Pixel ;
les livraisons natives et la persistance locale continuent. Le problème est
reproduit avec deux coupures distinctes. L’enregistrement headless de
`expo-task-manager` 57.0.13 termine sa Promise immédiatement, alors que le
service natif gère une terminaison après les événements GPS. Un candidat
laissant cette Promise en attente est vérifié isolément ; un patch local
versionné a été proposé puis autorisé dans la décision ci-dessous.
Aucune dérogation au critère GPS n’est accordée. Voir A20 dans
l’[audit alpha](../plan/09-audit-alpha.md).

### Décision du 19 octobre — correctif Expo Task Manager

Le porteur autorise le patch local versionné de `expo-task-manager` 57.0.13.
La Promise de maintien de la tâche Android attend désormais sa terminaison
native après les événements GPS, au lieu de se résoudre immédiatement.
Le patch pnpm couvre le source TypeScript et le JavaScript livré ; une
réinstallation avec lockfile doit le réappliquer. Le contrat JS et l’ancienne
faute sont testés par `tools/audit/check-task-lifetime.mjs`. La validation
physique de la reprise en arrière-plan et écran éteint reste distincte.

Le patch est réappliqué et son hash vérifié après une réinstallation locale
avec lockfile gelé. À la mise à jour d’Expo, refaire le test du contrat et les
essais GPS ; retirer le patch seulement lorsque la version de remplacement
passe ces mêmes contrôles. Les preuves physiques identifient l’APK signé et
restent distinctes de la réussite d’un test en environnement JavaScript.

### Résultats locaux du 19 octobre

Le build de production **Turbopack** réussit sans changement de compilateur
(`admin-receipt-step-build.log`) ; l’ancien refus de port n’est plus reproduit,
sans cause initiale confirmée. Le contrat Expo passe après réinstallation
avec lockfile gelé, et la reprise GPS sans retour au premier plan est observée
sur Pixel puis sur OPPO écran éteint après une panne de passerelle.

L’OPPO a aussi révélé que la fermeture du clavier au démontage du champ était
trop tardive : le hook le ferme maintenant avant d’appliquer le statut de
course. Le nouvel ordre est testé et le parcours signé réussit sur OPPO.
Les SHA et les limites exactes des deux builds GPS sont dans l’audit A20/A21 ;
la validation terrain et l’endurance sur batterie restent à réaliser.
