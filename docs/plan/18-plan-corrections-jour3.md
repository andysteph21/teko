# Plan et corrections après le jour 3

Établi le 12 novembre 2026 à partir du [rapport de test du jour 3](17-rapport-test-jour3.md).

## Corrigé dans le dépôt

| Anomalie | Correction | Où |
| --- | --- | --- |
| J3-01 Point du chauffeur figé | L’écran de course écoute le GPS toutes les 2 secondes ou tous les 5 mètres, et la carte suit le véhicule | `apps/driver`, `use-live-position.ts`, écran `ride/[id]` |
| J3-02 Position par sauts | GPS en haute précision pendant une course ; la précision « équilibrée » reste réservée à la présence hors course | `apps/driver`, `location-service.ts` |
| J3-04 Suivi passager fragile | Lecture de la dernière position à l’ouverture puis toutes les 10 secondes, en plus du temps réel ; la carte suit le véhicule | `packages/api-client` (`latestRidePosition`), `apps/client`, `use-position-fallback.ts` |

Vérifications : nouveau test E2E de transmission temps réel (le passager reçoit la position, un tiers ne reçoit rien), tests du client d’API (7), suite complète de l’app chauffeur (115, dont le nouveau test du point vivant), tests `ride` de l’app passager (21), typage et Biome. Un test de l’écran Paramètres chauffeur échoue par intermittence quand toute la suite tourne en parallèle ; il passe seul, avec ou sans ces changements.

Les trois corrections ci-dessus ne demandent aucun changement sur le serveur. La position du passager, décrite plus bas, ajoute une migration. Dans tous les cas il faut reconstruire et republier les deux APK, après la migration. La haute précision consomme plus de batterie pendant les courses : à surveiller sur le téléphone d’entrée de gamme.

Non vérifié : aucun essai sur téléphone.

## Position du passager à la commande (J3-03)

Décision du porteur du 12 novembre 2026 : option A. Corrigé dans le dépôt.

- À la commande, l’app passager transmet la position GPS du téléphone, si la localisation est autorisée. Sans permission ou sans GPS, la commande continue sans cette position.
- Après avoir accepté la course, le chauffeur voit deux points : le point de rencontre (ambre) et la position du passager à la commande (magenta). Le point ne bouge pas si le passager se déplace.
- La position n’est pas dans la proposition : le chauffeur ne la voit qu’après acceptation. Le serveur l’efface à la prise en charge, à l’annulation ou à la fin de la course. Un tiers ne peut ni la lire ni l’écrire.
- Migration `20261112090000_alpha_position_passager.sql` : table dédiée et RPC `set_ride_client_position`. Les RPC de commande ne changent pas, donc les APK déjà installés continuent de fonctionner.

Vérifications : trois nouveaux tests E2E (écriture réservée au passager, lecture par le chauffeur après acceptation seulement, effacement à la prise en charge), suite E2E complète (130), pgTAP (91), tests du client d’API (112), tests chauffeur `work` (38) et passager `booking` et `ride` (50), typage.

L’option B (position en direct) reste possible plus tard sur la même table : il suffirait que l’app passager renvoie sa position périodiquement.

## Pastille Teko pour les repères

Décision du porteur du 12 novembre 2026, après trois propositions. Fait dans le dépôt.

- Dix pastilles SVG, une par catégorie de repère, dans `infra/tiles/martin/sprites/teko`. Martin les assemble en planche sur `/sprite/teko`.
- Le style de carte partagé (`packages/maps`) affiche les repères validés en pastilles sur trois paliers de saillance, avec le nom en violet nuit. En mode éco, la pastille reste et le nom disparaît. Les repères proches de la commande utilisent la même pastille.
- Sans planche (éco hors-ligne), l’ancien cercle ambre lettré sert de repli.

Vérifications : la planche est générée par Martin (conteneur jetable), les styles complet et éco passent le validateur de spécification MapLibre sans erreur, tests du paquet `maps` (49). Le rendu des dix pastilles a été contrôlé sur une planche statique. **Non vérifié : le rendu dans la carte réelle**, le navigateur de contrôle n’ayant pas WebGL ; à confirmer sur téléphone.

Déploiement : la nouvelle configuration Martin, le dossier des pastilles et la route `/sprite/*` de Caddy doivent être en service sur le VPS **avant** la publication des APK. Sans planche servie, les nouveaux APK n’afficheraient aucun repère sur la carte. Les APK déjà installés ne sont pas touchés.

Reste hors périmètre : le marqueur du repère sélectionné pendant la commande (app passager) et la carte de la console gardent leur rendu actuel.

## À décider par le porteur

**Guidage vocal.** Valhalla fournit déjà les manœuvres en français. Il reste à les afficher et à les lire à voix haute dans l’app chauffeur. La synthèse vocale demande un module natif, donc une reconstruction complète de l’APK chauffeur. Alternative immédiate : un bouton « Ouvrir dans Google Maps » vers le point de rencontre puis la destination, sans développement de guidage.

## Déploiement du 12 novembre

Fait après accord du porteur, à 23 h 40 heure de Libreville. Une course était encore ouverte (J3-06), sans position reçue depuis plus de dix minutes.

| Étape | Contrôle |
| --- | --- |
| Sauvegarde de la base | Écrite dans `/var/backups/teko-alpha` avant toute modification |
| Migration `20261112090000` | 61 migrations enregistrées |
| Pastilles | `/sprite/teko.json` et `.png` (et `@2x`) répondent en HTTPS avec les dix images ; Martin recréé, passerelle relancée (quelques secondes d’interruption) |
| Services | `/health`, `/install`, `/gabon`, `/landmarks`, `/teko_roads` et les polices en 200 ; devis Éco, Moto et Confort obtenus ; tuile de repères de Mont-Bouët inchangée |
| APK | Construits, vérifiés (signature alpha, origine HTTPS, absence de secrets, sources des correctifs embarquées), publiés ; téléchargement par rôle recontrôlé |

| APK | SHA-256 |
| --- | --- |
| Passager | `b02268c1380c38ff4b089ae269ebb5e9edd8581761f3869e73b45aae1b03df1a` |
| Chauffeur | `08de7d674f93c16780c4ef53dc82037c5de4ebd6b77f04e3b648d6ec51480fff` |

Les fichiers remplacés sont gardés sur le VPS : `.local/alpha-remote/jour3-config-precedente.*` (configuration Martin, Caddyfile, Compose) et `.local/alpha-remote/jour3-apks-precedents.*`.

Non vérifié : aucune installation sur téléphone. Le rendu des pastilles dans la carte, le point du chauffeur en mouvement et le second point du passager restent à confirmer par le testeur.

En CI, le nouveau test de transmission temps réel échouait à froid : après l’abonnement, Realtime met plusieurs secondes à brancher la réplication. Le test envoie désormais une position par seconde jusqu’à la première réception. Dans les apps, la relecture périodique couvre ce même délai.

## Clôture automatique des courses (J3-06)

Décision du porteur du 12 novembre 2026. Une course démarrée et jamais terminée est clôturée par le serveur après le plus long de deux délais comptés depuis le départ : 3 heures (`ride_auto_complete_h`) ou quatre fois la durée estimée du trajet. La tâche tourne toutes les 5 minutes.

La clôture suit le circuit normal au nom du chauffeur assigné : prix annoncé, commission, reçu, notification au passager. Elle ajoute un événement `auto_completed` et une notification au chauffeur. Le suivi GPS du téléphone s’arrête de lui-même, puisque l’app vérifie le statut de la course. Migration `20261112100000_alpha_cloture_automatique.sql`.

Vérifications : deux nouveaux tests E2E (course récente intacte, clôture après le délai avec commission unique, trajet long protégé, tâche interdite aux usagers), suite E2E complète (132), pgTAP (91), tests des fonctions (47).

Non couvert : une course acceptée dont le chauffeur n’arrive jamais reste ouverte jusqu’à l’annulation par l’un des deux.

## Remise en état du banc, 12 novembre

Fait sur le VPS après accord du porteur, sauvegarde préalable.

- **Course restée ouverte.** La règle déployée a clôturé la course Confort du 11 novembre à 00 h 01 le 13 novembre, heure de Libreville : prix final 2 250 FCFA, commission de 350 FCFA portée au solde du chauffeur. Plus aucune course ouverte sur le banc.
- **Chauffeur suspendu.** Solde dû : 600 FCFA (250 de la course terminée, 350 de la course clôturée). Règlement simulé par le circuit prévu : Ops a préparé le dossier `SIM-J3-DFE429C2` en cash avec un justificatif de simulation, Finance l’a validé. Solde à 0, compte réactivé, motif de suspension effacé.
- **CI.** Le contrôle `e2e` est repassé au vert. Le contrôle `maps` a échoué une fois sur un port déjà occupé du serveur d’intégration, sans rapport avec le code ; il a été relancé.

## Actions d’exploitation avant la prochaine salve

1. Course restée « en cours » (J3-06) : close le 12 novembre, voir plus haut.
2. Chauffeur suspendu (J3-05) : réglé et réactivé le 12 novembre, voir plus haut. Après chaque course cash, le chauffeur doit la commission ; sans règlement validé avant la clôture de 04 h, il est suspendu. Prévoir ce règlement dans la console à chaque salve.
3. Demander aux testeurs de réinstaller les deux applications depuis le portail (fait côté serveur le 12 novembre).

## À prévoir

- Fermeture automatique d’une course acceptée mais jamais démarrée.
- Message clair dans l’app chauffeur quand la présence est refusée pour solde en retard (le bandeau « suspendu » existe ; vérifier qu’il s’affiche après une suspension survenue pendant que l’app est ouverte).
- Reste du jour 2 : distance maximale de dispatch, tri des repères au nom générique, copie des sauvegardes hors serveur, fermeture de la connexion SSH root.
