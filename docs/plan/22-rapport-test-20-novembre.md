# Rapport de test — essai en voiture du 20 novembre 2026

Rédigé le 23 novembre 2026. Sources : le retour écrit du porteur (« tout s’est bien passé », satisfaction sur la fluidité et le GPS), trois vidéos tournées en voiture, le document « TEKO COVOITURAGE », et les données du VPS relevées en lecture seule. Aucun numéro, code ni position précise n’est reproduit ici.

Ce rapport répond au premier point du lot R0 du [plan des retours du 20 novembre](21-plan-retours-essai-20-novembre.md), rédigé le même jour sans accès au VPS. Ce plan a été fusionné dans la branche d’essai le 23 novembre.

## Résultat

Premier essai en conditions réelles : trois courses enchaînées en voiture, toutes menées jusqu’au reçu, avec les APK du 17 novembre.

| Mesure du 19 au 21 novembre (heure de Libreville) | Valeur |
| --- | --- |
| Devis créés | 41 ; 2 refus légitimes (points trop proches, itinéraire introuvable) |
| Courses commandées | 8 |
| Courses terminées | 3, le 20 novembre entre 17 h 00 et 17 h 30 (1 Éco, 2 Confort) |
| Durée des courses | 12 min, 3 min et 7 min |
| Offres | 3 envoyées, 3 acceptées, en 11 secondes en moyenne |
| Positions de course enregistrées | 769 |
| Position du passager à la commande | Transmise 8 fois |
| Notifications push | 18 remises à Expo, aucune en échec |
| Annulées par le passager avant attribution | 2, le 19 novembre |
| Échecs « aucun chauffeur » | 3, le 21 novembre |

## Ce que l’essai confirme

| Point resté ouvert | Constat |
| --- | --- |
| J4-01 : aucune position de course enregistrée (corrigé par déduction le 17 novembre) | **Confirmé corrigé.** Une position toutes les 1,5 à 2,3 secondes en moyenne sur les trois courses, pire intervalle de 10 secondes, pas médian de 6 à 17 mètres. Le retour au réglage d’arrière-plan équilibré, complété par les positions précises de l’écran de course, fonctionne en voiture. |
| Suivi côté passager | L’app passager a relu la dernière position 126 fois. Les vidéos montrent l’écran « En course » avec l’itinéraire, les pastilles de repères et le point du chauffeur. |
| Délai de réponse du chauffeur | 11 secondes en moyenne, contre 24 à 29 secondes lors de la salve précédente. Deux des trois téléphones chauffeur ont déclaré le canal de sonnerie dédié. |
| Proposition reproposée, zone Gabon, Confort | Aucune expiration, aucun refus de zone ; un devis de 170 km a été calculé. |

Les vidéos ne permettent pas d’entendre la sonnerie ni les annonces vocales. Le porteur a confirmé le 23 novembre que les deux ont très bien fonctionné pendant l’essai.

## Anomalies

| N° | Gravité | Anomalie | Cause |
| --- | --- | --- | --- |
| J5-01 | Bloquante pour la suite | Les trois chauffeurs actifs sont suspendus (725, 1 150 et 2 200 FCFA dus) | Fonctionnement prévu et conservé par décision du 17 novembre. Le chauffeur de l’essai a été suspendu à la clôture du 21 novembre à 04 h pour 1 150 FCFA de commission. |
| J5-02 | Majeure | Trois commandes du 21 novembre ont échoué « aucun chauffeur » | Conséquence directe de J5-01 : plus aucun chauffeur ne peut passer en ligne. Le passager n’en est pas informé autrement que par l’échec à 3 minutes. |
| J5-03 | Mineure | Erreurs 502/503 de la livraison push, 65 en six jours | Déjà relevé (J2-08, J4-08), toujours non diagnostiqué ; les envois aboutissent au passage suivant. |
| J5-04 | Mineure | Une seule note laissée pour trois courses | L’écran de notation peut être passé. Sans effet sur le fonctionnement. |

Aucune erreur serveur liée au code n’apparaît sur la période. Le VPS tourne depuis 12 jours, disque à 24 %, sauvegarde quotidienne à jour.

## Les six suggestions du porteur

Elles sont analysées dans le [plan des retours](21-plan-retours-essai-20-novembre.md), qui les répartit en cinq lots et liste dix-neuf arbitrages (A1 à A19) à trancher avant tout développement.

| Suggestion | Lot | Ordre de grandeur | Ce qui bloque |
| --- | --- | --- | --- |
| Compte validé par e-mail ou Google, numéro simplement enregistré | R1 | 1 à 1,5 semaine | A1 à A5 ; inverse la décision de connexion par SMS |
| Accueil affichant directement les options | R2 | 3 à 4 jours | Maquette d’accueil à valider |
| Changer de destination, ajouter des arrêts | R3 | 2 semaines environ | A6 à A8 ; le prix ferme impose un nouveau devis confirmé |
| Covoiturage au tarif à la place | R4 | 3 à 4 semaines | A9 à A15 |
| Livraison | R5 | 2 semaines environ | A16 à A18 et avis juridique |

Deux remarques tirées du relevé du VPS, à verser au plan :

- **Covoiturage et suspension.** Avec une commission par place et la suspension à 04 h, un chauffeur de covoiturage accumulera plusieurs dettes par trajet. Le circuit de règlement manuel devra être éprouvé avant d’ouvrir ce service.
- **Compte par e-mail et comptes existants.** Dix-sept comptes du VPS sont identifiés par leur numéro, avec leurs courses et leurs soldes. Leur rattachement à un e-mail est à prévoir dans R1.

Le document « TEKO COVOITURAGE » fixe le tarif (250 FCFA par kilomètre et par place, 500 FCFA jusqu’à 2 km, plafond de 1 850 FCFA), la limite de trois passagers et la règle de proximité des prises en charge. Il contient une contradiction relevée par le plan (A14) : il interdit toute prise en charge hors application, puis encadre la prise en charge d’un client extérieur à l’application.

## À faire avant la prochaine salve

1. Chauffeurs suspendus : réglés le 23 novembre à la demande du porteur, par le circuit prévu (trois dossiers simulés préparés par Ops et validés par Finance). Les trois comptes sont réactivés, soldes à zéro.
2. Obtenir les réponses aux arbitrages A1 à A19.

## Limites

- Un seul passager et un seul chauffeur ont roulé ; l’essai dure trente minutes.
- La sonnerie, la vibration et les annonces vocales ne sont pas vérifiables sur les vidéos.
- Les téléphones des testeurs ne sont pas branchés au poste : aucune mesure de fluidité autre que leur retour.
