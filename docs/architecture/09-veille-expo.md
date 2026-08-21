# 09 — Veille Expo (état de l'écosystème, août 2026)

**Objectif :** démarrer le développement des apps (après retour client) sur les
versions et approches **actuelles** de l'écosystème Expo, pas sur l'état de
juin 2026 figé dans `01-vue-ensemble.md`. Recherche effectuée le 20 août 2026,
sources en ligne en fin de document.

## 1. Versions : viser SDK 57, pas 56

| Brique | Doc de juin (01) | **État août 2026** | Recommandation |
|---|---|---|---|
| Expo SDK | 56 | **57** (sorti le 30 juin, patchs 57.0.x en cours) ; 58 attendu ~sept. sur RN 0.87 | **Cibler SDK 57 aujourd'hui**, re-figer sur le dernier stable au vrai lancement du lot 1 |
| React Native | 0.85 | **0.86** (zéro breaking change depuis 0.85) | Suivre le SDK |
| React | 19.2 | 19.2 (inchangé) | — |
| Expo Router | v6 | v6 confirmé (previews natives, modales améliorées, middleware serveur) | — |

**Pourquoi 57 et pas 56 :** SDK 56 souffre d'une **régression mémoire Hermes V1**
avec `react-native-worklets`/`react-native-reanimated` (animations — nous en
aurons), **corrigée en SDK 57**. Et l'upgrade 56→57 est annoncé sans breaking
change.

**Cadence** : Expo s'aligne désormais sur les ~6 releases/an de React Native,
avec des mises à jour non-cassantes via `npx expo install expo@latest --fix`.
Conséquence pour Teko : **re-choisir « le dernier stable » au jour J du lot 1**
(probablement SDK 58) coûtera peu — ne pas figer la version dans le code avant.

## 2. Changements structurants confirmés

- **Hermes V1 par défaut** (depuis RN 0.84) et **New Architecture obligatoire**
  — conforme à ADR-02, rien à changer.
- **Builds précompilés par défaut** : RN core en binaires iOS (0.84+) et les
  70+ modules Expo en XCFrameworks (SDK 56+). Builds propres beaucoup plus
  rapides, zéro config — bon pour EAS et le budget CI.
- **`expo-av` est SUPPRIMÉ (SDK 55)** → `expo-video` + `expo-audio` (stables).
  Ne jamais l'introduire ; utile si on ajoute des tutos vidéo in-app.
- **Expo UI (SwiftUI / Jetpack Compose) est stable** et dans le template par
  défaut. **Pour Teko : ne pas l'adopter au MVP** — notre design system est
  custom (tokens → `packages/ui`), pas natif-platform ; à réévaluer post-MVP.
- **Expo Router v6** apporte middleware serveur, API routes, SSR expérimental
  et data loaders (`useLoaderData`). **Non pertinents pour Teko** : le backend
  est Supabase (ADR-04/12) — on n'utilise Router que pour la navigation
  fichier-based partagée client/chauffeur.
- **React Compiler : ne pas supposer qu'il est actif** ; statut encore mouvant.
  À activer explicitement (ou pas) après mesure, pas par défaut.

## 3. Contraintes de plateforme à intégrer AVANT le lot 1

- **Google Play : Android 16 (API 36) obligatoire au 31 août 2026** pour toute
  nouvelle app — c'est-à-dire **avant notre lancement**. Le SDK 57 vise cette
  cible et corrige des soucis edge-to-edge.
- **Edge-to-edge sans opt-out** en ciblant l'API 36 : le contenu passe sous les
  barres système. Nos maquettes 360×800 doivent être implémentées avec les
  safe areas dès le premier écran (pas de retrofit).
- **Push Android = FCM HTTP v1** : compte de service Firebase à créer et
  téléverser dans EAS (les credentials « server key » legacy sont mortes).
  À ajouter aux prérequis Phase 0 (compte Expo/EAS, 0.4).

## 4. Choix de paquets pour les besoins Teko (à jour)

| Besoin produit | Paquet (état août 2026) | Note |
|---|---|---|
| Navigation client/chauffeur | `expo-router` v6 | File-based, partagé entre les 2 apps |
| Carte | `@maplibre/maplibre-react-native` + cœur `@teko/maps` | **Config plugin requis, incompatible Expo Go → dev client EAS dès le jour 1** ; vérifier sa dernière release New Arch au moment du spike |
| GPS course + heartbeat | `expo-location` + `expo-task-manager` | Suivi arrière-plan chauffeur ; fréquence adaptative (sobriété) |
| Notifications (offres 12 s, SOS…) | `expo-notifications` | FCM v1 service account via EAS |
| Session / secrets | `expo-secure-store` | Tokens Supabase |
| File hors-ligne & cache | `expo-sqlite` | Guide local-first officiel ; TinyBase optionnel plus tard |
| KYC (documents, photos) | `expo-camera` + `expo-image-picker` + `expo-image` | Compression avant upload (sobriété data) |
| OTA | `expo-updates` (EAS Update) | **Décisif au Gabon** ; politique `runtimeVersion: fingerprint` recommandée |
| i18n | `expo-localization` + i18next | ADR-08 (français livré, i18n-ready) |
| Vidéo/audio (si besoin futur) | `expo-video` / `expo-audio` | Jamais `expo-av` (supprimé) |

## 5. CI/CD : EAS Workflows

EAS a mûri en plateforme unifiée (build, credentials, submit, update, tests).
Les **EAS Workflows** (`.eas/workflows/*.yml`, déclenchés par push/PR GitHub)
peuvent orchestrer build → submit → update. Recommandation : garder GitHub
Actions pour le backend/carto (déjà en place), utiliser EAS Workflows pour le
cycle mobile (dev builds, previews de PR, prod + OTA), avec la politique
d'update « fingerprint » : si l'empreinte native a changé → build complet,
sinon → OTA.

## 6. Décisions & actions

1. **ADR-02 amendé de fait** : cible = *dernier SDK stable au lancement du
   lot 1* (aujourd'hui 57, probablement 58 en sept.) — jamais N-1, la nouvelle
   cadence rend le suivi bon marché.
2. **Dev clients EAS obligatoires dès le premier écran** (MapLibre exclut
   Expo Go) → le compte EAS (Phase 0.4) devient le premier prérequis pratique,
   avec le compte de service FCM v1.
3. **Safe areas / edge-to-edge dans `packages/ui` dès le lot 1** (API 36).
4. Le **spike MapLibre RN** (07-evaluation-stack §6) doit valider la release
   courante de `@maplibre/maplibre-react-native` sur New Arch + SDK 57.
5. À la reprise (réponses client reçues) : relire `expo.dev/changelog` — si
   SDK 58 est stable, démarrer directement dessus.

## Sources

[Changelog SDK 57](https://expo.dev/changelog/sdk-57) · [Expo SDK 57 (fiche)](https://expo.dev/sdk/57) · [Changelog SDK 56](https://expo.dev/changelog/sdk-56) · [RN 0.84 — Hermes V1 par défaut](https://reactnative.dev/blog/2026/02/11/react-native-0.84) · [Précompilés iOS](https://expo.dev/blog/faster-ios-builds-with-precompiled-xcframeworks) · [Expo Router v6](https://expo.dev/blog/expo-router-v6) · [Suppression expo-av (SDK 55)](https://expo.dev/changelog/sdk-55) · [MapLibre RN — setup Expo](https://maplibre.org/maplibre-react-native/docs/setup/expo/) · [EAS Workflows](https://docs.expo.dev/eas/workflows/introduction/) · [Local-first](https://docs.expo.dev/guides/local-first/) · [Push FCM v1](https://docs.expo.dev/push-notifications/push-notifications-setup/) · [Play API 36 au 31/08/2026](https://dev.to/dainyjose/google-play-requires-android-16-api-level-36-by-august-31-2026-react-native-migration-guide-1d51)
