# 06 — Dossier de démarrage des applications (les 3 portails)

**Date :** 25 août 2026 · **Public :** l'agent/l'équipe qui attaque le développement des applications. Ce document est le **point d'entrée unique** : il dit ce qui est décidé, où se trouve chaque source d'autorité, et dans quel ordre travailler. Tout le reste du dépôt est en appui.

Les trois portails à construire :

| Portail | Forme | Maquettes | Spécification de parcours (copies locales : [docs/design/parcours/](../design/parcours/)) |
|---|---|---|---|
| **Client** | App Expo/React Native (Android d'abord) | `docs/design/maquettes/client/` (32, C-01→C-31) | [client A–F](../design/parcours/parcours-client-A-F.html) |
| **Chauffeur** | App Expo/React Native (Android d'abord) | `docs/design/maquettes/chauffeur/` (23, D-01→D-20) | [chauffeur G–J](../design/parcours/parcours-chauffeur-G-J.html) |
| **Admin** | Web responsive + PWA mobile | `docs/design/maquettes/admin/` (10) + `admin-mobile/` (7) | [flux K–O + audit](../design/parcours/parcours-globaux-K-O.html) |

## 1. Décisions déjà prises — ne pas re-débattre

- **Construction neuve.** Les templates Taxido (`templates/`) sont une référence visuelle « avant-développement » uniquement ([05-reference-taxido.md](05-reference-taxido.md)) ; **aucun code n'en est repris**.
- **Stack : Supabase + Expo**, confirmée par évaluation contradictoire ([07-evaluation-stack.md](../architecture/07-evaluation-stack.md)).
- **Ordre : client d'abord**, puis chauffeur, puis admin (les lots 3-5 peuvent se chevaucher une fois le socle vert).
- **Français uniquement · Android d'abord (iOS hors MVP) · pas de covoiturage · Libreville seulement.**
- **26/26 réponses client reçues le 25 août** ([04-suivi-client.md](04-suivi-client.md)). Seul point encore ouvert : la **grille tarifaire** (n° 7 → séance dédiée CL-01). Elle ne bloque pas : les tarifs vivent dans `pricing_rules`/`app_config`, modifiables sans redéploiement.
- Les règles métier font foi dans [02-regles-metier.md](../product/02-regles-metier.md) (+ addendum du 25 août qui codifie chaque réponse client).
- **Règles d'ingénierie actées le 25 août** ([10-regles-ingenierie.md](../architecture/10-regles-ingenierie.md)) : code/dossiers en **anglais** (`apps/driver`), **Biome** (remplace ESLint/Prettier), état mobile **Zustand 5 + TanStack Query v5 + file expo-sqlite**, styling StyleSheet-tokens (mobile) / Tailwind v4 (admin), couverture par paliers (95 % packages / ~90 % apps / e2e critiques), tests sur **3 appareils Android réels via adb**.

## 2. Ordre de marche

Le plan détaillé (lots, critères, jalons) est dans [00-plan-execution.md](00-plan-execution.md) (v1.2). Résumé opérationnel :

1. **Lot 1 — socle monorepo (bloquant)** : scaffolder `apps/client`, `apps/driver`, `apps/admin` (nommage anglais acté le 25 août, [10-regles-ingenierie.md](../architecture/10-regles-ingenierie.md) §1) ; créer `packages/ui` **dérivé de `docs/design/design-tokens.json`** ; générer les types Supabase ; CI build/lint/typecheck/test. Jalon M1 : « les 3 apps démarrent ».
2. **Spikes au lot 1** (risques identifiés) : **MapLibre React Native sur un Android d'entrée de gamme** (nécessite un *dev client* — pas d'Expo Go) et **Realtime en arrière-plan/écran verrouillé**.
3. **Lots 3-5 — les portails**, en consommant `@teko/maps` et les RPC.
4. **Lot 6 — durcissement Airtel** avant go-live (dont **R1 : vérification de signature du callback**, toujours ouvert).
5. En parallèle, hors code : CL-01 séance tarifaire, CL-02 latence hébergeur, CL-03 devis SMS ([02-backlog.md](02-backlog.md) §2c), comptes Expo/EAS, sandbox Airtel.

**Versions :** suivre [09-veille-expo.md](../architecture/09-veille-expo.md) — re-figer sur le **dernier SDK Expo stable au jour du kick-off** (SDK 57 minimum : régression mémoire Hermes/Reanimated en 56), New Architecture, `expo-audio`/`expo-video` (jamais `expo-av`), cible Android API 36, FCM HTTP v1.

## 3. Sources d'autorité UI/UX

- **`docs/design/design-tokens.json` fait autorité** sur toute UI ; tout écart maquette/code est un bug. Rendu de référence : `design-system.html`, icônes : `app-icons.html` + `assets/icons/`.
- **79 maquettes HTML** dans `docs/design/maquettes/` (copies conformes du projet Claude Design « Teko Design System », qui reste la source de vérité en cas de divergence ; toute modification part dans **les deux**). Index et conventions : [06-maquettes.md](../design/06-maquettes.md).
- **Carte : le langage UI/UX est figé** dans [08-carte-langage.md](../design/08-carte-langage.md) (couleurs, pictogrammes départ/arrivée, grammaire d'animation client/chauffeur, modes éco/auto/complet, densité des étiquettes). Captures de référence : `docs/design/carte/`.
- **`apps/labo-carte` est la référence exécutable** de cette grammaire (scénarios `?sc=client-course`, `chauffeur-navigation`, `demo-*`… ; serveur : launch `labo-carte`, port 5173). C'est un labo **temporaire** : on s'en inspire, on n'en fait pas un produit. Vidéos de démonstration régénérables : `misc/LISEZMOI.md` (dossier hors version control).
- Console admin sur mobile : [07-admin-responsive.md](../design/07-admin-responsive.md).

## 4. Contrat backend (le backend fait autorité)

- 21 migrations, ~24 tables, **tout passe par les RPC** — aucune logique métier sensible côté client, `anon` n'a aucun droit DML direct. Détail : [supabase/README.md](../../supabase/README.md).
- **Les 52 tests e2e (`supabase/tests/e2e/`) sont la documentation vivante des appels côté app** : auth réelle par JWT, cycle de course complet avec PIN, dispatch (`respond_offer`), présence chauffeur, SOS, repères, clôture financière. Avant de coder un écran, lire le test du flux correspondant.
- Configuration runtime dans `app_config` (commission 15 %, frais d'annulation, `offer_timeout_s` 12, `presence_ttl_s` 300, `payout_threshold` 0, seuils routes 10 passages/5 chauffeurs/21 j, doublon repères 50 m, rétention GPS 12 mois). ⚠️ `seed.sql` s'exécute **après** les migrations et écrase `app_config` : garder les deux alignés.
- Stack locale : `supabase start` puis `eval "$(supabase status -o env | sed 's/^/export /')"`. La clé `anon` locale est la clé de démo publique de la CLI (aucun secret).
- Géométries : PostgREST **et** Realtime sérialisent PostGIS en **objet GeoJSON** (l'EWKB hex existe aussi) — toujours passer par `toLonLat()` de `@teko/maps`. `suggest_meeting_landmark` renvoie un uuid nu.

## 5. Carte et infra carto

- **`@teko/maps`** ([README](../../packages/maps/README.md)) : cœur sans dépendance UI (tokens, style, adaptateur Supabase, modes) + entrée `/web` (contrôleur MapLibre GL JS pour l'admin). Les apps RN consomment le cœur et rendent avec **MapLibre Native** (spike lot 1). Mode éco C-25 : fond uni sans tuiles ni glyphes, auto-activation sur réseau lent (`resolveMapMode`), réglage utilisateur éco/auto/complet.
- **`infra/`** ([README](../../infra/README.md)) : tuiles Martin `:3333` (+ polices `/font/…`), routage Valhalla `:8002`, pipeline de conflation OSM + routes validées. Repli tuiles : MapTiler (CL-04). Attribution OSM obligatoire (intégrée au contrôleur), couche `teko_roads` publiée ODbL.

## 6. Pièges déjà rencontrés (ne pas les repayer)

- MapLibre **refuse toute couche texte sans `glyphs`** ; le style généré les dérive de l'origine des tuiles.
- MapLibre RN exige un **dev client** Expo (pas d'Expo Go).
- Templates Taxido : builds Android avec **JDK 17 portable** (`~/.local/jdk/`) — le JDK 25 système casse AGP ; pas de `/dev/kvm` sur cette machine (pas d'émulateur, APK sur appareil réel).
- En plpgsql, `row is not null` est faux dès qu'un champ est null — utiliser `found`.
- GoTrue expose les numéros **sans « + »** (`new.phone` = « 24107000005 ») : tout rapprochement par téléphone côté SQL se fait en **chiffres seuls**, normalisés à l'écriture (cf. `invite_admin`, 1er sept.) — jamais d'égalité avec un E.164 brut (vécu : invitation admin jamais réclamée, l'invité restait `client`).
- Martin : variables d'environnement **non guillemetées** dans la config ; rôle `martin_tiles` avec `search_path` incluant `extensions`.
- Valhalla (docker) garde silencieusement ses vieilles tuiles sans `force_rebuild=True`.

## 7. Contraintes non négociables

- `templates/` = référence seulement, jamais de code Teko dedans (gitignoré en dehors de la doc).
- `envoi-client/` : le PDF des coûts marqué **INTERNE** ne part jamais chez le client.
- Docs en **français** ; toute décision est datée et tracée dans [05-questions-ouvertes.md](../product/05-questions-ouvertes.md) (jamais supprimée, toujours clôturée).
- Réponses/échanges client → toujours via [04-suivi-client.md](04-suivi-client.md) (procédure en bas du document).
