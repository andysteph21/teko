# Rapport de test — jour 2 de l’alpha (10 novembre 2026)

Rédigé le 11 novembre 2026. Sources : le retour écrit du porteur, cinq vidéos du testeur (reçues entre 18 h 59 et 19 h 02, heure de l’Est ; l’horloge du téléphone filmé indique environ 0 h 45 à Libreville) et les données du VPS relevées en lecture seule. Aucun numéro, code ni position précise n’est reproduit ici.

## Résultat

Aucune course n’a abouti. Environ la moitié des demandes de devis ont été refusées, cinq courses ont été commandées, aucune n’a été acceptée par un chauffeur.

| Mesure du 10 novembre et de la nuit suivante (heure de Libreville) | Valeur |
| --- | --- |
| Comptes connectés | 5 |
| Devis créés | 24, soit 8 lots de trois catégories (contrôles du développeur compris) |
| Devis refusés « points trop proches » | 8 (dont 2 contrôles du développeur) |
| Devis refusés « départ hors zone » | 15, vers 20 h et vers minuit |
| Courses commandées | 5 (2 Éco, 3 Confort) |
| Offres envoyées à un chauffeur | 2, toutes deux expirées après 12 s |
| Courses acceptées, traces GPS de course | 0 |
| Chauffeurs en ligne | 1 à la fois |
| Notifications push acceptées par Expo | 7 |

## Déroulé des cinq courses

| Heure | Catégorie | Issue | Cause |
| --- | --- | --- | --- |
| 20 h 50 | Éco | Offre expirée à 12 s, annulée par le passager 3 min plus tard | Le chauffeur n’a pas répondu ; aucune seconde proposition |
| 20 h 54 | Confort | Échec « aucun chauffeur » à 3 min | Aucun chauffeur du banc n’a la catégorie Confort |
| 00 h 39 | Confort | Échec « aucun chauffeur » à 3 min | Idem |
| 00 h 43 | Éco | Offre expirée à 12 s, annulée par le passager | Idem 20 h 50 |
| 00 h 47 | Confort | Échec « aucun chauffeur » à 3 min | Idem 20 h 54 |

## Ce que montrent les vidéos

| Vidéo | Application | Observation |
| --- | --- | --- |
| 18 h 59 | Passager | Départ « Ma position », destination Station-service de Glass, puis écran « Départ hors de la zone desservie ». La recherche « sta » ne propose qu’un repère. |
| 19 h 00 | Passager | « Recherche d’un chauffeur… », Confort 2 750 FCFA, depuis le marché de Mont-Bouët. |
| 19 h 01 | Chauffeur | « Mes courses » vide, profil « Chauffeur Éco » aux pièces validées, paramètres, « Le centre de notifications arrive bientôt », accueil en ligne vers Akanda, solde 0 FCFA. Aucune proposition visible. |
| 19 h 02 (1) | Passager | « Votre chauffeur arrive » avec un code de prise en charge, alors qu’aucun chauffeur n’est attribué. |
| 19 h 02 (2) | Passager | Parcours complet : recherche de repère, choix Confort, point de rencontre, recherche de chauffeur. |

Le même téléphone sert aux deux applications dans toutes les vidéos.

## Anomalies

| N° | Gravité | Anomalie | Cause établie |
| --- | --- | --- | --- |
| J2-01 | Bloquante | Le chauffeur ne voit pas la proposition et ne peut ni accepter ni refuser | L’offre dure 12 s. L’app chauffeur était en arrière-plan sur le même téléphone. Après expiration, la règle « jamais deux offres au même chauffeur » empêchait toute nouvelle proposition : avec un seul chauffeur en ligne, la course restait sans offre jusqu’à l’échec. |
| J2-02 | Bloquante | Les commandes Confort échouent toujours | Les dix chauffeurs du banc n’ont que la catégorie Éco, alors que le devis propose Éco, Moto et Confort. |
| J2-03 | Majeure | « Départ hors de la zone desservie » | La seule zone active est un rectangle sur Libreville. Le chauffeur en ligne se trouvait à l’ouest de sa limite, et le passager utilisait le même téléphone. |
| J2-04 | Majeure | Presque aucun repère à choisir | Deux repères validés pour tout le pays. |
| J2-05 | Majeure | Le passager voit « Votre chauffeur arrive » et un code pour une course annulée | L’écran de suivi affichait ce panneau pour tout statut autre que « arrivé » ou « en course ». Il s’ouvre depuis une notification, la liste des notifications ou la reprise de l’app, sans contrôle du statut. Le code affiché était celui de la course annulée à 00 h 43. |
| J2-06 | Mineure | 8 devis refusés « points trop proches » | Départ et arrivée identiques ; le correctif du 9 novembre renvoie bien le message et le retour à la sélection. |
| J2-07 | Mineure | Un seul chauffeur sur dix a activé le partage GPS | Réglage par compte ; sans effet sur le dispatch. |
| J2-08 | Mineure | Erreurs 502/503 de la livraison push environ une fois par heure | PostgREST coupe la connexion sur `claim_push_deliveries` ; l’envoi aboutit au passage suivant. Non diagnostiqué. |

## Ce qui a fonctionné

- Connexion, carte, bouton **Ma position** et bandeau « ESSAI PRIVÉ · GPS RÉEL · PAIEMENT SIMULÉ » sur les deux applications.
- Devis des trois catégories entre deux repères distincts, choix du point de rencontre, recherche de chauffeur avec annulation gratuite.
- Refus explicites pour un trajet nul et pour un départ hors zone, avec retour à la sélection.
- Notifications push : les deux propositions et les avis « aucun chauffeur » ont été remis à Expo.
- Présence du chauffeur en ligne tenue à jour côté serveur.

## Retour du porteur et réponse

| Retour | Réponse |
| --- | --- |
| L’interaction chauffeur-client n’est pas absolue ; le chauffeur ne voit pas correctement une proposition | Anomalies J2-01 et J2-02. |
| Difficulté à couvrir une large zone, à valider par la console en ajoutant des repères | Anomalie J2-04 : import de 1 695 repères OpenStreetMap, puis validation des propositions dans **Cartographie**. |
| Prise en charge partout au Gabon | Anomalie J2-03 : zone de service étendue au pays. |
| Revoir la partie chauffeur ; ajouter ou supprimer le module d’acceptation | Le module existe et il est conservé. Il n’apparaissait pas faute d’offre encore valide. Il est fiabilisé : délai de 30 s, nouvelle proposition après expiration, interrogation toutes les 5 s. |

## Limites de ce rapport

- Aucun essai n’a été rejoué sur téléphone après correction : `adb devices` ne listait aucun appareil sur le poste.
- Le contrôle porte sur un seul testeur, un seul téléphone et environ une heure d’usage.
- Le fonctionnement écran verrouillé, le PIN, le trajet et le reçu n’ont pas pu être observés, puisque aucune course n’a été attribuée.
