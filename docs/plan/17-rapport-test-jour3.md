# Rapport de test — jour 3 de l’alpha (11 novembre 2026)

Rédigé le 12 novembre 2026. Sources : le retour écrit du porteur et les données du VPS relevées en lecture seule. Aucun numéro, code ni position précise n’est reproduit ici.

## Résultat

Première journée avec des courses attribuées : trois commandes, trois acceptations, une course terminée. Les correctifs du jour 2 tiennent : aucune recherche sans proposition, aucun refus de zone.

| Mesure du 11 novembre (heure de Libreville) | Valeur |
| --- | --- |
| Devis créés | 35 |
| Courses commandées | 3 (2 Éco, 1 Confort) |
| Offres acceptées | 3 sur 4 envoyées ; 1 expirée puis reproposée et acceptée |
| Courses terminées | 1 |
| Courses annulées par le passager | 1, après 34 minutes (« erreur de repère ou de destination ») |
| Courses restées « en cours » | 1, ouverte depuis le 11 novembre à 17 h 48 |
| Positions GPS enregistrées | 1 017 |
| Erreurs serveur | Aucune, hors 571 refus de présence du chauffeur suspendu (voir J3-05) |

## Retour du porteur et constat

| Retour | Constat |
| --- | --- |
| La carte est à jour, quartiers et repères y figurent | Import des 1 695 repères et zone « Gabon » confirmés sur place. |
| Les échanges fonctionnent côté chauffeur et côté client | Proposition, acceptation, arrivée, PIN, départ et fin enregistrés. |
| Le chauffeur ne voit que le quartier et le repère du client, pas sa position exacte | Exact, et voulu jusqu’ici : l’écran chauffeur affiche le point de rencontre (le repère), jamais la position du téléphone du passager. Voir J3-03. |
| Pendant la course, le point du chauffeur ne se déplace pas, ou avec beaucoup de retard | Deux défauts établis, J3-01 et J3-02, et une fragilité, J3-04. |
| Un guidage vocal serait le bienvenu | Fonction absente. Voir le plan. |

## Anomalies

| N° | Gravité | Anomalie | Cause établie |
| --- | --- | --- | --- |
| J3-01 | Majeure | Sur l’app chauffeur, le point du véhicule reste figé pendant la course | L’écran lisait la position une seule fois à l’ouverture. Le service d’arrière-plan envoyait bien les positions au serveur, mais rien ne rafraîchissait l’affichage. |
| J3-02 | Majeure | La position du chauffeur avance par sauts | Le GPS tournait en précision « équilibrée » : Android fournit alors des positions réseau. Sur la course terminée, les points successifs sont distants de 190 à 270 m toutes les 7 secondes, entre des points immobiles. |
| J3-03 | Demande | Le chauffeur ne voit pas la position exacte du passager | Le passager ne transmet pas sa position pendant l’attente. Seul le point de rencontre est connu du serveur. |
| J3-04 | Mineure | Le suivi passager dépend uniquement du temps réel | Le point du chauffeur n’apparaît qu’au premier événement reçu après l’ouverture de l’écran. Aucune relecture si un événement est manqué. Le VPS a servi 14 à 34 ouvertures de connexion temps réel par heure, signe de reconnexions fréquentes sur réseau mobile. La transmission elle-même fonctionne : un test automatisé le vérifie désormais. |
| J3-05 | Bloquante pour la suite | Le chauffeur de la course terminée est suspendu | La clôture quotidienne de 04 h a constaté 250 FCFA de commission non réglée. Le compte est désactivé pour « solde en retard », comme le prévoit la règle. Ses 571 tentatives de présence ont été refusées. Il ne peut plus passer en ligne tant que Finance n’a pas validé un règlement. |
| J3-06 | Bloquante pour la suite | Une course est restée « en cours » | Course Confort démarrée le 11 novembre à 17 h 48 et jamais terminée. Le téléphone du chauffeur envoie encore des positions le 12 novembre à 22 h 48. Le passager et le chauffeur concernés ne peuvent pas commander ni accepter d’autre course. |
| J3-07 | Mineure | Neuf chauffeurs sur dix n’ont pas activé le partage des traces GPS | Réglage par compte, sans effet sur le suivi de course. |

## Ce qui a fonctionné

- Dispatch : chaque commande a reçu une proposition en moins d’une minute ; l’offre expirée a été reproposée et acceptée.
- Catégorie Confort : attribuée à un chauffeur.
- Enregistrement des positions : toutes les 7 à 10 secondes pendant la course terminée, y compris application en arrière-plan.
- Fin de course : commission de 250 FCFA calculée, relevé du jour produit, suspension automatique appliquée à l’échéance.

## Limites de ce rapport

- Aucune vidéo ni capture pour ce jour : le constat sur l’affichage repose sur le retour écrit et sur la lecture du code.
- Les courses ont été enchaînées en quelques minutes (arrivée 15 secondes après l’acceptation) : le parcours d’approche réel n’a pas été observé.
