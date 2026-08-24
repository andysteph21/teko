# 05 — Référence Taxido : l'« avant-développement »

**Date :** 24 août 2026 · Les templates achetés (`templates/`, hors git —
104 Mo de code fournisseur) sont remis en état de marche pour servir de
**point de comparaison avant développement** : ce que le marché vend tel
quel, face à ce que Teko construit (maquettes + `packages/maps` + backend).
Décision d'origine inchangée (n°1, 18 août) : **référence seulement, jamais
la base du code Teko**.

## État après remise en route

| | TaxidoUser_Expo | TaxidoDriver_Expo |
|---|---|---|
| Expo SDK | 54 (gelé, voir plus bas) | 54 |
| React Native / React | 0.81.5 / 19.1 | 0.81.5 / 19.1 |
| Dépendances | installées, alignées via `expo install --fix` | idem |
| Bundle JS (Hermes) | ✅ `expo export --platform android` | ✅ |
| APK de debug (Gradle) | ✅ `app-debug.apk` (139 Mo) | ✅ `app-debug.apk` (140 Mo) |
| Carte | Google Maps (`react-native-maps`) | idem |
| Web | non supporté (pas de react-native-web) | idem |

## Pourquoi rester en SDK 54

Monter ces templates en SDK 57 (New Architecture obligatoire, RN 0.86)
serait un vrai portage de code fournisseur que l'on a décidé de **ne pas
utiliser**. Le SDK 54 est le dernier avant l'obligation New Arch : c'est le
« gel » naturel d'une référence. Les apps Teko, elles, partiront du dernier
SDK stable (cf. `../architecture/09-veille-expo.md`).

## Lancer les templates

```bash
cd templates/TaxidoUser_Expo   # ou TaxidoDriver_Expo
npm install
npx expo start                 # QR code → build de dev sur téléphone
```

> **Expo Go ne suffit plus** pour un projet SDK 54 (Expo Go ne supporte que
> le SDK courant) : utiliser un **build de développement** local.

### APK de debug (sans téléphone branché)

Le Gradle des templates exige **JDK 17** (le JDK 25 du système échoue :
« Unsupported class file major version 69 ») — un Temurin 17 portable est
installé dans `~/.local/jdk/` :

```bash
cd templates/TaxidoUser_Expo/android
JAVA_HOME=~/.local/jdk/jdk-17.0.20.1+1 ANDROID_HOME=~/Android/Sdk ./gradlew assembleDebug
```

APK produit : `android/app/build/outputs/apk/debug/app-debug.apk` —
à installer sur un téléphone : `adb install app-debug.apk`, puis
`npx expo start` sur la machine et scanner le QR depuis l'app de dev.
(Pas d'émulateur sur cette machine : `/dev/kvm` absent.)

## Ce que la comparaison met en évidence

Face aux maquettes et à la carte Teko (`docs/design/08-carte-langage.md`) :
- **Adressage** : Taxido = recherche d'adresses Google ; Teko = repères
  collaboratifs lettrés, épingles personne/drapeau lisibles sans lire.
- **Carte** : Google Maps facturée au chargement, aucune sobriété data ;
  Teko = MapLibre self-hosted, régimes éco/auto/complet mesurés.
- **Paiement** : passerelles génériques ; Teko = Airtel Money + solde
  journalier chauffeur (clôture 04:00).
- **Look** : vert générique multi-tenant ; Teko = tokens violet/magenta,
  teal chauffeur.
