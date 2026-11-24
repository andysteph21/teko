# Plan d’amélioration de l’alpha après le jour 2

Établi le 11 novembre 2026 à partir du retour du porteur, des cinq vidéos du 10 novembre et du contrôle direct du VPS. Le détail des constats est dans [le rapport de test](15-rapport-test-jour2.md), l’état d’avancement dans [le rapport de correction](16-rapport-corrections-jour2.md).

## Objectifs

1. Un chauffeur en ligne voit chaque proposition et peut l’accepter ou la refuser, même s’il manque la première alerte.
2. Un passager peut commander depuis n’importe quel point du Gabon et trouve des repères autour de lui.
3. Le passager ne voit jamais un écran de course attribuée sans chauffeur.
4. Le VPS est protégé et sa base est sauvegardée chaque jour.

## Lot A — Interaction chauffeur et passager

| N° | Action | Où | Effet attendu |
| --- | --- | --- | --- |
| A1 | Reproposer une offre expirée au même chauffeur quand aucun autre n’est disponible ; un refus reste définitif | Migration `20261111090000_alpha_reoffre_chauffeur.sql` | Avec un seul chauffeur en ligne, la proposition revient jusqu’à la fin des 3 minutes de recherche |
| A2 | Porter le délai de réponse de 12 s à 30 s pour l’alpha | Même migration (`offer_timeout_s`) | Le chauffeur a le temps de rouvrir l’app depuis la notification |
| A3 | Interroger les offres en attente toutes les 5 s tant que l’app chauffeur est ouverte et en ligne | `apps/driver`, `use-offer-resume.ts` | La fenêtre d’offre s’affiche même si le temps réel ou le push n’arrive pas |
| A4 | Donner Éco et Confort aux chauffeurs voiture du banc | `tools/alpha-remote/terrain-jour2.sql` | Une commande Confort reçoit une offre |
| A5 | Rediriger l’écran de suivi passager quand la course n’est pas attribuée | `apps/client`, `ride-entry.ts` | Course en recherche → écran de recherche ; course close → détail d’historique |

Le module d’acceptation existe (fenêtre D-10 par-dessus l’accueil chauffeur) et il est conservé. Les essais du jour 2 ne l’ont jamais affiché parce que l’offre expirait avant que l’app chauffeur revienne au premier plan.

## Lot B — Couverture du Gabon

| N° | Action | Où | Effet attendu |
| --- | --- | --- | --- |
| B1 | Ajouter une zone de service « Gabon » | `tools/alpha-remote/terrain-jour2.sql` | Plus de refus « Départ hors de la zone desservie » sur le territoire |
| B2 | Importer les repères nommés d’OpenStreetMap | `tools/alpha-remote/osm-landmarks.py` | 1 695 repères publiés, dont 1 087 dans le Grand Libreville, contre 2 aujourd’hui |
| B3 | Traiter les propositions de repères des testeurs | Console, **Cartographie** | Les lieux manquants signalés sur place deviennent des repères |

Le calcul d’itinéraire couvre déjà le pays : le graphe Valhalla est construit sur l’extrait OpenStreetMap du Gabon. Les repères importés restent modifiables par Ops, qui peut repasser en brouillon un point mal placé.

## Lot C — Sécurité et exploitation du VPS

| N° | Action | Où | Effet attendu |
| --- | --- | --- | --- |
| C1 | Activer le pare-feu : 22 limité, 80 et 443 | `tools/alpha-remote/harden-vps.sh` | Seuls SSH et le web répondent |
| C2 | Bannir les tentatives SSH répétées (fail2ban) | Même script | Fin des ~5 300 essais quotidiens sans conséquence |
| C3 | Ouvrir SSH au compte `teko`, puis fermer la connexion root | Script, puis étape manuelle | Plus d’exploitation courante en root |
| C4 | Sauvegarder la base chaque jour, 14 jours gardés | `tools/alpha-remote/backup-db.sh` et minuterie systemd | Une restauration est possible après une erreur |
| C5 | Ajouter 2 Go de swap | Script | Marge mémoire pendant une reconstruction de carte |
| C6 | Appliquer les 74 mises à jour et redémarrer hors essai | Manuel | Noyau et paquets à jour |
| C7 | Copier les sauvegardes hors du VPS | À décider | Survivre à la perte du serveur |

## Lot D — Qualité du dépôt

| N° | Action | Effet attendu |
| --- | --- | --- |
| D1 | Remplacer l’import esm.sh de `standardwebhooks` par `npm:` et nettoyer `deno.lock` | Contrôle `deno-test` de la PR #2 à nouveau vert |
| D2 | Corriger les docs 12 et 13 | La passation décrit l’état réel du VPS |
| D3 | Tracer les décisions du 11 novembre | `docs/product/05-questions-ouvertes.md` |

## Ordre d’application

1. Dépôt : A1 à A3, A5, D1 à D3, avec leurs tests.
2. VPS, hors course et après sauvegarde : migration A1/A2, puis `terrain-jour2.sql` (A4, B1), puis l’import des repères (B2).
3. VPS : `harden-vps.sh` (C1 à C5), vérification d’une nouvelle connexion SSH, puis C3 manuel et C6.
4. APK : reconstruire passager et chauffeur pour A3 et A5, vérifier, publier sur le portail en gardant les fichiers précédents.
5. Jour 3 : rejouer le protocole ci-dessous.

Les étapes 2 et 3 n’exigent aucune mise à jour des téléphones. A1, A2, A4, B1 et B2 profitent donc aux APK déjà installés.

## Protocole du jour 3

Les vidéos montrent un seul téléphone passant de l’app passager à l’app chauffeur. Ce montage fait expirer l’offre pendant le changement d’application. Utiliser deux téléphones, un par rôle.

1. Chauffeur : passer en ligne, laisser l’app ouverte, attendre la fenêtre de proposition. Noter le délai entre la commande et l’affichage.
2. Passager : commander en Éco entre deux repères distincts. Vérifier « Chauffeur attribué », le PIN et le suivi.
3. Refaire l’essai avec l’app chauffeur en arrière-plan : la notification doit arriver, et la proposition doit encore être ouverte à la réouverture.
4. Laisser expirer une proposition sans répondre : elle doit revenir en moins d’une minute.
5. Commander en Confort, puis depuis un point hors de Libreville.
6. Chercher trois lieux connus du quartier ; proposer ceux qui manquent.
7. Dérouler une course complète : arrivée, PIN, trajet, fin, reçu, solde chauffeur.

## Hors périmètre

- La catégorie Moto reste sans chauffeur sur le banc tant qu’aucun compte moto n’est invité.
- Les erreurs 502/503 horaires de la livraison push (PostgREST coupe la connexion sur `claim_push_deliveries`) sont à diagnostiquer ; les envois aboutissent au passage suivant.
- Le centre de notifications chauffeur affiche encore « arrive bientôt ».
