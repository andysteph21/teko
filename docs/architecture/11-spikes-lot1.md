# 11 — Spikes du lot 1 : résultats

**Date :** 25 août 2026 · **Statut :** exécutés sur appareil réel (OPPO A15, Helio P35, 2-3 Go, Android 10 — l'appareil « vérité performance » du parc, doc 10 §7). Protocoles et outillage : [tools/spikes/](../../tools/spikes/README.md). Écrans de spike : routes DEV de l'app client (`/dev/map-spike`, `/dev/realtime-spike`).

## 1. Spike MapLibre RN — **CONCLUANT ✅** (la stack Expo est confirmée)

C'était « le seul test qui pouvait encore invalider Expo » (07-evaluation §6). Conditions : `@maplibre/maplibre-react-native` **11.3.7** + New Architecture + SDK 57, dev client (pas d'Expo Go), fond vectoriel **Martin local** (mêmes tuiles que la prod self-hosted), style complet `buildMapStyle` de `@teko/maps`.

| Mesure | Résultat |
|---|---|
| Rendu du fond Teko (liserés, axes ambre, étiquettes de quartier, eau) | Conforme au langage carte — identique au rendu web |
| 20 véhicules animés, pilotage JS **pire cas** (setData 20 features visé 30 Hz) | **21 im/s JS soutenus** ; rendu GL fluide (MapLibre rend sur son propre thread — le pan/zoom reste natif quel que soit le JS) |
| Animation continue | Vérifiée (captures successives toutes distinctes) |
| `dumpsys gfxinfo` | Non pertinent : la carte rend hors pipeline hwui (10 im comptées = le HUD) |

**Décisions d'implémentation retenues pour les lots 3-4 :** surcouches dynamiques en enfants React (`GeoJSONSource` + `Layer`), style de fond via `buildMapStyle` inchangé ; les positions temps réel arrivent à ≤ 1 Hz (Realtime) — le pilotage JS à 21 Hz du spike est donc 20× plus dur que le besoin réel ; interpolation Reanimated seulement si un besoin visuel l'exige. Routes carte en **chargement paresseux** (un binaire sans le module natif doit charger le reste de l'app — expo-router évalue toutes les routes).

## 2. Spike Realtime arrière-plan / écran verrouillé — **CONCLUANT, avec enseignements ✅**

Protocole : course de test (client = compte de l'appareil), 120 positions poussées ~1/s côté hôte, séquence 25 s éveillé → **60 s verrouillé** → réveil (tools/spikes). Journal `[spike-rt]` (logcat).

| Mesure | Résultat |
|---|---|
| Perte d'événements | **0/118** (séquence contiguë, y compris pendant le verrouillage) |
| Latence éveillé (stack locale) | min 80 ms · **médiane 313 ms** · p90 550 ms · max 592 ms (+ ~130-150 ms Gabon→Paris en prod → reste sous la seconde) |
| Verrouillage | **Un seul décrochage de ~18 s** au moment du verrouillage, puis le flux a repris **écran toujours verrouillé** ; rattrapage complet |

**Enseignements actés :**
1. L'UI de suivi (C-14) doit tolérer des trous de plusieurs secondes — l'état « position figée » des maquettes est le bon contrat, pas une erreur.
2. 60 s d'écran éteint n'est pas le doze profond : **ne jamais compter sur la socket en arrière-plan prolongé**. Côté chauffeur, la présence/positions en course passeront par un **service de premier plan** (`expo-location` + `expo-task-manager`, lot 4).
3. **La livraison des offres reste du ressort du push FCM** (extension backend autorisée, doc 10 §1) — Realtime est un canal de confort au premier plan, pas une garantie de livraison.
4. Risques R-A/R-B (07 §5) : validés à cette échelle ; le seuil de ré-évaluation (~1 000 chauffeurs simultanés) est inchangé.

## 3. Conséquence

Les deux conditions posées par 07-evaluation §6 sont levées : **la stack Supabase + Expo est définitivement confirmée**, le lot 1 est clos (jalon M1 + spikes). Les lots 3-5 démarrent sans réserve technique.
