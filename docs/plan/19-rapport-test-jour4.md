# Rapport de test — salve des 15 et 16 novembre 2026

Rédigé le 17 novembre 2026. Sources : le compte rendu du porteur, trois captures, trois vidéos du 16 novembre et les données du VPS relevées en lecture seule. Aucun numéro, code ni position précise n’est reproduit ici.

## Résultat

Quatre courses menées jusqu’au reçu, avec deux téléphones. Les nouveaux APK du 12 novembre sont bien ceux utilisés. Un défaut grave est apparu côté serveur, invisible pour les testeurs : plus aucune position de course n’est enregistrée.

| Mesure du 13 au 17 novembre (heure de Libreville) | Valeur |
| --- | --- |
| Devis créés | 53, aucun refus |
| Courses commandées | 10 |
| Courses terminées | 4 (1 Éco, 3 Confort) |
| Annulées par le passager avant attribution | 4 |
| Échecs « aucun chauffeur » | 2 |
| Offres | 6 envoyées, 4 acceptées, 1 expirée puis reproposée et acceptée |
| Délai de réponse des chauffeurs | 2 à 29 s, sur 30 s disponibles |
| Notifications push | 29 remises à Expo en moins d’une seconde ; 7 sans appareil enregistré |
| Positions de course enregistrées | **0** |
| Position du passager à la commande | Transmise 6 fois, lue par le chauffeur |

## Retour du porteur et constat

| Retour | Constat |
| --- | --- |
| Géolocalisation étendue, pas de limite restrictive | Confirmé : devis et courses hors de Libreville, dont un devis de 514 km. |
| Fluidité et ergonomie en progrès | Aucune mesure disponible ; cohérent avec les vidéos. |
| Les repères ne s’affichent pas forcément bien | Les pastilles s’affichent sur la carte réelle. Trois limites relevées, J4-03 à J4-05. |
| Guidage vocal | Fonction absente, demandée pour la deuxième fois. |
| Prévenir le chauffeur par message | Le push existe et arrive en moins d’une seconde. Il n’alerte pas assez : voir l’avis plus bas. |
| Application lourde sur certains Android | Non mesuré. Voir l’avis plus bas. |
| Remplacer « taxi-moto » par « livraison » | Décision produit. Aucun chauffeur du banc n’a la catégorie Moto. |

## Anomalies

| N° | Gravité | Anomalie | Cause |
| --- | --- | --- | --- |
| J4-01 | Bloquante | Aucune position de course enregistrée depuis le 12 novembre ; le passager ne peut donc pas voir le chauffeur avancer | Le correctif du jour 3 avait passé le GPS d’arrière-plan en haute précision pendant les courses. Aucun envoi de position ni battement de présence n’apparaît pendant les quatre courses, alors que les battements reprennent entre les courses, en précision équilibrée. Cause la plus probable : la haute précision ne livre rien en arrière-plan sur ces téléphones, testés à l’intérieur. **Non reproduit sur appareil.** |
| J4-02 | Majeure | Les deux chauffeurs actifs sont de nouveau suspendus (725 et 2 200 FCFA dus) | Fonctionnement prévu : commission due après chaque course cash, suspension à la clôture de 04 h. Dans la vidéo, le chauffeur appuie plusieurs fois sur « Actualiser le solde » sans effet : il ne peut rien régler lui-même pendant l’alpha. |
| J4-03 | Majeure | Le widget de données recouvre le panneau du chauffeur et la fenêtre de proposition | Position fixe calculée pour un panneau plus court ; sur Android, son élévation le faisait aussi passer devant la proposition. |
| J4-04 | Mineure | À l’accueil, peu de repères visibles | Les repères de quartier n’apparaissaient qu’à partir du zoom 13,5 et les repères locaux à partir de 15, alors que l’accueil s’ouvre vers 14. Autour des testeurs, la carte OpenStreetMap est elle-même presque vide. |
| J4-05 | Mineure | Carte vide pendant une à deux secondes à l’ouverture | Chargement des tuiles et de la planche de pastilles. Non mesuré. |
| J4-06 | Mineure | Une proposition s’affiche avec « 0 s » et le bouton d’acceptation inactif | L’app chauffeur a été ouverte à la fin du délai. La nouvelle proposition est arrivée ensuite et a été acceptée. |
| J4-07 | Mineure | Le widget affiche toujours « 0 ko ce mois » | Le compteur de données ne mesure rien. Non diagnostiqué. |
| J4-08 | Mineure | Erreurs 502/503 de la livraison push, 66 en quatre jours | Déjà relevé (J2-08), toujours non diagnostiqué ; les envois aboutissent au passage suivant. |

## Corrigé dans le dépôt le 17 novembre

- **J4-01.** Le service d’arrière-plan revient à la précision équilibrée, seul réglage dont l’émission est établie sur le terrain (11 novembre). L’écran de course ouvert, qui lit déjà le GPS précis pour le point du chauffeur, verse désormais chaque position dans la file d’envoi de la course. Écran ouvert : tracé fin ; écran éteint : relais par le service d’arrière-plan.
- **J4-03.** Le widget est placé dans la zone carte de l’écran de course ; la fenêtre de proposition passe au-dessus.
- **J4-04.** Repères de quartier dès le zoom 12,5, repères locaux dès 14, pastilles agrandies.

Vérifications : tests chauffeur `work` (38), tests du paquet `maps` (49), typage. **Aucun essai sur appareil** : le Pixel 3 branché au poste était utilisé par un autre travail. Le correctif J4-01 repose sur une déduction ; il doit être confirmé sur téléphone avant la prochaine salve, en vérifiant que des positions arrivent bien pendant une course.

Ces corrections demandent de republier les deux APK.

## Avis sur les trois orientations évoquées

**Applications Android natives.** Une réécriture en Kotlin représente les deux applications à refaire, soit plusieurs mois, pendant lesquels l’alpha n’avance plus. Rien ne mesure aujourd’hui d’où vient la lourdeur. Les causes probables sont traitables dans l’existant : la carte (1 695 repères avec texte, ajoutés le 12 novembre, alourdissent le rendu), le démarrage à froid, le mode éco non activé par défaut sur les petits appareils. Recommandation : mesurer d’abord sur l’OPPO A15 (temps de démarrage, fluidité de la carte, mémoire), corriger les trois postes ci-dessus, puis décider. Si la carte reste le point dur après cela, la réécriture native de l’app chauffeur seule serait le premier candidat.

**Intégration des notifications.** Les notifications sont déjà réelles : Expo les remet à Firebase, et la vidéo montre la bannière « Votre chauffeur est arrivé ». Ce qui manque est le comportement d’une alerte de course : sonnerie insistante, vibration, écran qui s’allume, affichage plein écran quand le téléphone est verrouillé, et envoi direct par Firebase en priorité haute sans passer par Expo. Tout cela se fait dans l’application actuelle, sans réécriture. C’est le chantier le plus rentable pour le retour « prévenir le chauffeur ». Le SMS de secours dépend du choix du prestataire, toujours ouvert.

**Livraison à la place du taxi-moto.** Masquer Moto est simple et cohérent avec le banc, où aucun chauffeur ne l’a. La livraison est un service à part : expéditeur, destinataire, colis, preuve de remise, tarif. Elle demande une décision de périmètre avant tout développement.

## Décisions du porteur du 17 novembre et suites

| Sujet | Décision | État |
| --- | --- | --- |
| Suspension pour solde en retard | Conservée : elle fait partie de ce que l’alpha teste | Les deux chauffeurs restent suspendus jusqu’à un règlement validé par Finance dans la console |
| Alerte de course | Chantier lancé | Lot 1 fait dans le dépôt, voir ci-dessous |
| Catégorie Moto | Masquée maintenant | Fait dans l’app passager : seules Éco et Confort sont proposées et chiffrées |
| Guidage vocal | Options demandées | Voir ci-dessous |

## Chantier « alerte de course » — lot 1

Fait dans le dépôt, sans nouveau module natif.

- **Canal Android dédié** « Propositions de course » : importance maximale, sonnerie propre à Teko de 8 secondes (`apps/driver/assets/sounds/teko_offre.wav`, générée pour le projet), vibration forte, contenu visible écran verrouillé, volume de sonnerie plutôt que de notification.
- **Serveur** : la notification `ride_offer` part sur ce canal uniquement vers les appareils qui ont déclaré le posséder (colonne `devices.offer_channel`, migration `20261117090000_alpha_alerte_course.sql`). Un canal absent du téléphone ferait disparaître la notification : les APK antérieurs gardent donc le canal « Alertes Teko ».
- **En appli** : tant qu’une proposition attend une réponse, le téléphone vibre en boucle ; la vibration s’arrête à l’acceptation, au refus ou à l’expiration.

Vérifications : suite E2E (132), pgTAP (91), fonctions (48, dont le choix du canal), client d’API (112), suites complètes chauffeur (117) et passager (157), typage. Aucun essai sur appareil : la sonnerie et l’affichage écran verrouillé restent à entendre et à voir sur téléphone.

Déploiement : migration et fonction `notify-push` sur le VPS, puis APK chauffeur. Le son est une ressource native : l’APK chauffeur demande une précompilation complète, sans `--reuse-native`.

Lot 2, non commencé :

1. **Envoi direct par Firebase**, sans le relais Expo. Le fournisseur existe côté serveur ; il faut que l’app enregistre le jeton Firebase de l’appareil et que la clé de service soit déposée sur le VPS par le porteur.
2. **Affichage plein écran téléphone verrouillé**, comme un appel entrant. Demande un module natif ; depuis Android 14, cette permission est réservée aux applications d’appel et d’alarme sur Google Play, à vérifier avant d’investir.
3. **SMS de secours** quand le push n’est pas remis : dépend du choix du prestataire SMS, toujours ouvert.
4. Diagnostic des erreurs 502/503 de la livraison (J4-08).

## Guidage vocal — options

Valhalla calcule déjà l’itinéraire et peut fournir chaque manœuvre en français, avec sa distance.

| Option | Ce que vit le chauffeur | Travail | Limites |
| --- | --- | --- | --- |
| A. Bouton « Ouvrir dans Google Maps » | Bascule vers Google Maps, qui guide à la voix vers le point de rencontre puis la destination | Très court, sans module natif | Le chauffeur quitte Teko pendant le trajet ; Google Maps consomme des données ; les routes et repères propres à Teko n’y figurent pas ; la proposition suivante arrive par notification seulement |
| B. Guidage vocal intégré, synthèse du téléphone | Teko annonce les manœuvres (« dans 200 mètres, tournez à droite ») et le repère du client à l’approche (« le passager attend devant la station-service de Glass ») | Moyen : lecture des manœuvres Valhalla, suivi de la progression, module de synthèse vocale, bandeau de la prochaine manœuvre | Voix française à installer sur le téléphone, de qualité variable selon l’appareil ; recalcul à prévoir si le chauffeur sort de l’itinéraire ; APK chauffeur à reconstruire en entier |
| C. Annonces vocales seules, sans guidage virage par virage | Teko lit à voix haute les moments clés : nouvelle proposition, nom du repère du client, arrivée proche, passager à bord | Court : même module de synthèse, quelques phrases déclenchées par le statut et la distance | Pas d’aide à la route ; répond au besoin exprimé (« informer oralement des points de repère du client ») |
| D. Voix enregistrées | Comme C, avec des phrases enregistrées par une personne | Court côté code, plus l’enregistrement | Ne peut pas dire un nom de repère arbitraire |

Recommandation : C d’abord, puis B. C répond exactement à la demande des testeurs, tient en peu de travail et sert de socle à B. A peut s’ajouter à tout moment comme solution d’appoint.

## À décider par le porteur

1. Publier les correctifs et le lot 1, après un essai sur téléphone ou sans attendre.
2. Guidage vocal : option retenue parmi A, B, C et D.
3. Lot 2 de l’alerte de course : envoi direct par Firebase, à lancer ou non.
4. Livraison : cadrer le service.
5. Mesure de performance sur l’OPPO A15 avant toute décision de réécriture native.

## Déploiement du 17 novembre

Fait après accord du porteur, hors course, sauvegarde préalable de la base.

- **VPS** : migration `20261117090000_alpha_alerte_course.sql` (63 migrations), fonction `notify-push` et module push mis à jour, service des fonctions relancé. Contrôles : services et pastilles en HTTPS 200, devis obtenus, livraisons push en 200 après redémarrage. Les fichiers remplacés sont gardés dans `supabase/functions/.avant-jour5`.
- **APK** : construits en précompilation complète (sonnerie et synthèse vocale natives), vérifiés (signature alpha, origine HTTPS, absence de secrets, sources embarquées dont annonces vocales, alerte et catégories), publiés ; téléchargement par rôle recontrôlé. Les APK du 12 novembre sont gardés sur le VPS.

| APK | SHA-256 |
| --- | --- |
| Passager | `4b6d37a476167f41924a64a8041d683a3f117bdeed1ad9c8a40c3d8182b5b2c1` |
| Chauffeur | `a18126892a78891f1514e7abf95fdfcef185c0f51c71a50303f3c3b084e376f5` |

À vérifier par les testeurs après réinstallation : sonnerie et vibration d'une proposition, lecture vocale en français (le téléphone doit avoir une voix française, voir Paramètres), positions du chauffeur visibles côté passager pendant une course, absence de Moto, noms des repères.

Rappel : les deux chauffeurs suspendus le restent jusqu'à un règlement validé par Finance dans la console (décision du 17 novembre).

