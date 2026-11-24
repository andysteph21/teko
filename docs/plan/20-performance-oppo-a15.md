# Mesures de performance sur l’OPPO A15 — 17 novembre 2026

Demandées par le porteur après la salve des 15 et 16 novembre (« application trop lourde pour certains Android », « elle saute »). Objectif : situer les ralentissements et les plantages avant toute décision de réécriture native.

## Conditions

| Élément | Valeur |
| --- | --- |
| Appareil | OPPO A15 (CPH2185), Android 10, 1,8 Go de RAM, 8 cœurs, appareil d’entrée de gamme de référence du projet |
| État mémoire | 630 à 790 Mo disponibles, 680 Mo de swap déjà utilisés par les autres applications |
| Applications | Builds release du 17 novembre (code actuel, annonces vocales comprises), architecture `arm64-v8a` |
| Données | Banc local isolé pour l’authentification et les courses ; tuiles, repères (1 697) et pastilles servis par le VPS, comme sur le terrain ; GPS fixé au centre de Libreville |
| Réseau | Wi-Fi du poste, non représentatif d’une 3G gabonaise |

Outils : `am start`, journal Android (`Choreographer`, `ANR_LOG`, événements `am_kill`), `dumpsys meminfo`, `top` par fil, cadence de la surface carte relevée par `SurfaceFlinger`.

## Résultats

**Démarrage de l’app chauffeur, déjà connectée** (trois mesures concordantes) :

| Étape | Temps |
| --- | --- |
| Première image native | 0,6 à 1,0 s |
| Code JavaScript chargé (« Running main ») | 2,0 s |
| Accueil stable, carte affichée | 4 s environ |

Entre 0 et 4 s, Android signale des images sautées par paquets de 1 à 31 : l’écran répond par à-coups pendant le chargement. L’app passager se comporte de même (2 s jusqu’au JavaScript, 31 images sautées au premier affichage).

**Carte** (cadence de la surface carte pendant des glissés) :

| Situation | Images par seconde | Pire intervalle |
| --- | --- | --- |
| Accueil, zone déjà chargée, zoom 14 | 57,6 | 100 ms |
| Accueil, zoom 16 et plus, repères locaux affichés | 57,2 | 116 ms |
| Zone nouvelle juste après un déplacement rapide | 44,4 | 300 ms |
| Mode éco | 41,8 | 383 ms |

La carte reste fluide une fois les tuiles chargées, y compris avec les 1 697 repères. Les à-coups apparaissent au chargement de tuiles nouvelles. Les fils les plus actifs pendant un déplacement sont le rendu graphique (42 % d’un cœur) et les fils de tuiles de MapLibre (20 %) ; le JavaScript reste sous 3 %. Le processeur n’est pas saturé.

**Mémoire** (PSS, application au premier plan sur l’accueil) :

| Mode | Total | Tas natif (carte) | Graphique |
| --- | --- | --- | --- |
| Complet, chauffeur | 225 à 240 Mo | 60 Mo | 45 à 50 Mo |
| Complet, passager | 237 Mo | 68 Mo | 50 Mo |
| Éco, chauffeur | 203 Mo | 25 Mo | 49 Mo |

**Plantages** : aucun plantage, blocage ni arrêt forcé de Teko dans l’historique de l’appareil. Les deux applications ouvertes ensemble sont restées en vie. Un premier relevé montrait deux gels de 5 secondes du fil principal : ils étaient causés par l’outil de mesure lui-même (une interrogation répétée de l’état de l’app), et ont disparu une fois l’outil retiré.

## Lecture

1. **La lourdeur ressentie se concentre au démarrage (environ 4 s) et au chargement des tuiles.** Sur le terrain, ce second point est aggravé par le réseau : chaque zone nouvelle demande des tuiles, des polices et les repères au VPS. Sur une 3G lente, la carte peut rester blanche plusieurs secondes, comme dans les vidéos du 16 novembre.
2. **Chaque application occupe environ 230 Mo**, sur un téléphone qui n’en laisse que 600 à 800 de libres. Lors de la salve, un même téléphone faisait tourner les deux apps avec WhatsApp. Quand l’app passe en arrière-plan, Android la ferme pour récupérer la mémoire ; à son retour elle redémarre, ce qui ressemble à un plantage. Côté chauffeur en ligne, le service de localisation protège l’app ; hors ligne, elle n’est pas protégée.
3. **Aucun plantage reproduit.** Les « sauts » du terrain restent sans cause établie. Les téléphones des testeurs ne sont pas branchés au poste ; leurs journaux ne sont pas disponibles.
4. **Rien n’indique qu’une réécriture native soit nécessaire** sur l’OPPO A15. La carte, partie la plus coûteuse, est déjà du code natif (MapLibre) ; une app Kotlin utiliserait la même bibliothèque et la même mémoire de carte. Le gain d’une réécriture porterait surtout sur le démarrage (environ 2 s de chargement JavaScript).

## Corrections faites le 17 novembre

- **Noms des repères** : avec un seul placement possible (sous la pastille), environ la moitié des pastilles s’affichaient sans nom. Le nom peut désormais se placer dessous, à droite, à gauche ou dessus, en police légèrement réduite.
- **Repère choisi et point de rencontre** : affichés avec la pastille Teko agrandie au lieu d’un rond ambre, côté passager comme côté chauffeur.
- **Widget de données** : contrôlé sur l’OPPO, il passait encore devant la fenêtre de proposition et, sur l’écran de course, sous la barre système. Il est masqué pendant une proposition et placé sous la bannière pendant une course.
- **Annonces vocales** : l’OPPO, réglé en anglais, n’a que la voix anglaise ; Android lisait alors le français avec cette voix. Teko exige désormais une voix française et se tait sinon ; les Paramètres indiquent comment l’installer. La lecture effective en français reste à entendre sur un téléphone qui possède cette voix.

Vérifié sur l’OPPO avec le build du 17 novembre : proposition reçue sans widget par-dessus, écran de course avec widget sous la bannière et point de rencontre en pastille, noms de repères nettement plus nombreux à l’accueil (voir les captures du rapport). Contrepartie : quelques pastilles de faible notoriété cèdent la place à un nom voisin et réapparaissent en zoomant.

## Recommandations

| Priorité | Action | Effet attendu |
| --- | --- | --- |
| 1 | Un téléphone par rôle pendant les essais | Évite les fermetures par manque de mémoire, et mesure ce que vivra un vrai chauffeur |
| 2 | Recueillir les journaux d’un téléphone qui « saute » : modèle, version d’Android, moment, et si possible un rapport de bogue Android | Seul moyen de distinguer plantage, arrêt par manque de mémoire et redémarrage |
| 3 | Brancher un outil de remontée des plantages (Sentry est déjà relié au compte) | Plantages du terrain visibles sans téléphone branché |
| 4 | Précharger les tuiles de Libreville au premier lancement, ou réduire les repères chargés aux petits zooms | Moins de carte blanche sur réseau lent |
| 5 | Mesurer sur un second appareil d’entrée de gamme, en 3G réelle | Confirmer ou infirmer ces résultats dans les conditions du terrain |

## Limites

- Un seul appareil, en Wi-Fi ; le réseau gabonais n’est pas reproduit.
- La cadence de la carte est relevée par SurfaceFlinger sur les 127 dernières images, soit environ 2 à 3 secondes par mesure.
- Les annonces vocales n’ont pas été mesurées en course réelle.
