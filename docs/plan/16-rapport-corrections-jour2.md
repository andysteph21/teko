# Rapport de correction — jour 2 de l’alpha

État au 11 novembre 2026. Ce rapport suit [le plan du jour 2](14-plan-alpha-jour2.md) et répond aux anomalies du [rapport de test](15-rapport-test-jour2.md).

## Synthèse

Les correctifs côté serveur sont en service sur le VPS depuis le 11 novembre 2026, 01 h 57 UTC (02 h 57 à Libreville), après accord du porteur. Ils profitent aux APK déjà installés. Restent à faire : la reconstruction des APK, le durcissement du VPS et un essai sur téléphone.

| Anomalie | Correction | Dépôt | VPS | APK |
| --- | --- | --- | --- | --- |
| J2-01 Proposition invisible pour le chauffeur | Nouvelle proposition après expiration, délai de 30 s, interrogation toutes les 5 s | Fait, testé | Déployé (nouvelle proposition, 30 s) | À reconstruire (interrogation seulement) |
| J2-02 Confort sans chauffeur | Éco et Confort pour les chauffeurs voiture du banc | Script prêt | Déployé : 10 chauffeurs en Éco et Confort | Sans objet |
| J2-03 Départ hors zone | Zone de service « Gabon » | Script prêt | Déployé | Sans objet |
| J2-04 Deux repères seulement | Import de 1 695 repères OpenStreetMap | Outil et fichier prêts | Déployé : 1 697 repères validés | Sans objet |
| J2-05 « Votre chauffeur arrive » sans chauffeur | Redirection selon le statut de la course | Fait, testé | Sans objet | À reconstruire |
| J2-08 Erreurs 502/503 du push | Non traité | — | — | — |
| CI `deno-test` rouge | Import `npm:standardwebhooks@1.0.0`, verrou nettoyé | Fait, testé | Sans objet | Sans objet |
| VPS non protégé, sans sauvegarde | Scripts de durcissement et de sauvegarde | Scripts prêts | Deux sauvegardes manuelles faites ; durcissement non exécuté | Sans objet |

## Détail des corrections

**Proposition au chauffeur (J2-01).** La migration `20261111090000_alpha_reoffre_chauffeur.sql` réécrit `offer_next_driver`. Les chauffeurs jamais sollicités passent d’abord, au plus proche. S’il n’en reste aucun, l’offre expirée la plus ancienne est rouverte pour le même chauffeur, avec une nouvelle notification. Un refus explicite reste définitif pour la course. Le délai `offer_timeout_s` passe de 12 à 30 secondes. Côté app chauffeur, `use-offer-resume.ts` relit les offres en attente toutes les 5 secondes tant que l’app est ouverte et en ligne, en plus du temps réel, du push et de la reprise d’écran.

**Écran de suivi passager (J2-05).** `ride-entry.ts` décide à l’ouverture : course attribuée → suivi ; course en recherche → écran de recherche ; course close → détail d’historique. Le cas couvre l’ouverture depuis une notification, la liste des notifications et la reprise de l’app.

**Couverture (J2-02 à J2-04).** `terrain-jour2.sql` ajoute la zone « Gabon » et donne Éco et Confort aux chauffeurs voiture validés du banc. `osm-landmarks.py` extrait les lieux nommés de l’extrait OpenStreetMap du Gabon : 569 bâtiments publics et commerces, 291 bars et restaurants, 275 écoles, 131 lieux de culte, 101 stations-service, 98 pharmacies, 38 ronds-points, 25 marchés et 14 gares routières. 1 087 de ces repères sont dans le Grand Libreville. L’import ne duplique pas un repère du même nom à moins de 150 m.

**VPS.** `harden-vps.sh` et `backup-db.sh` sont décrits dans [le guide d’exploitation](12-exploitation-alpha-vps.md#sécurité-et-sauvegardes-du-vps).

## Vérifications faites

| Contrôle | Résultat |
| --- | --- |
| Suite E2E sur le banc d’audit local, migration appliquée | 126 tests sur 126 |
| Nouveau test E2E : chauffeur seul, offre expirée reproposée, refus définitif, délai ≤ 30 s | Passe |
| Tests de l’app chauffeur, dossier `work` (dont le nouveau test d’interrogation) | 36 sur 36 |
| Tests de l’app passager, dossier `ride` (dont l’aiguillage) | 20 sur 20 |
| Typage des apps passager et chauffeur, Biome sur les fichiers modifiés | Sans erreur |
| Fonctions Deno : lint et tests avec verrou figé | 47 sur 47 |
| `terrain-jour2.sql` et import des repères, à blanc sur le banc d’audit (annulés ensuite) | Zone créée, catégories mises à jour, 1 695 repères insérés |
| Syntaxe des deux scripts shell | Correcte |

Non vérifié : aucun essai sur téléphone, aucune exécution de `harden-vps.sh`, aucun contrôle sur le VPS après correction, aucune reconstruction d’APK. Sur le banc d’audit local, 123 courses restées ouvertes par d’anciens tests ont été annulées pour rejouer la suite.

## Déploiement du 11 novembre sur le VPS

Fait hors course (aucune course ouverte), après une sauvegarde de la base à 01 h 56 UTC dans `/var/backups/teko-alpha`.

| Étape | Contrôle après application |
| --- | --- |
| Migration `20261111090000` | 59 migrations enregistrées, `offer_timeout_s` = 30 |
| `terrain-jour2.sql` | Zones « Gabon » et « Libreville » actives ; 10 chauffeurs en Éco et Confort ; la position du dernier chauffeur en ligne est maintenant dans une zone |
| Import des repères | 1 697 repères validés (1 695 importés et les 2 existants), 23 à moins de 5 km du dernier chauffeur en ligne, 115 à moins de 1,2 km de Mont-Bouët |
| Redémarrage de Martin seul | Nécessaire : la tuile de Mont-Bouët servie depuis le cache ne contenait pas les nouveaux repères (108 octets, puis 4 240 après redémarrage) |
| Services | 12 conteneurs actifs, `/health`, `/install`, `/gabon`, `/landmarks`, `/teko_roads` en HTTP 200, tuiles de repères servies à Port-Gentil et Franceville |
| Tâches planifiées | `retry-dispatch`, `expire-offers`, `push-delivery` en succès dans les minutes suivantes ; aucune erreur Postgres |

Les fichiers appliqués sont copiés dans `/opt/teko-alpha` (migration, `terrain-jour2.sql`, `osm-landmarks.py`, `backup-db.sh`, `harden-vps.sh`). Fonctions, APK, pare-feu et configuration SSH sont inchangés.

Retour arrière : restaurer la sauvegarde de 01 h 56 UTC avec `pg_restore --clean`, hors course, puis redémarrer Martin.

Non vérifié sur le VPS : aucun devis ni aucune course n’a été rejoué avec un compte de test après le déploiement. La nouvelle proposition après expiration est prouvée par le test E2E local, pas par un essai réel.

## Reste à faire

1. Exécuter `harden-vps.sh` en gardant une session SSH ouverte, vérifier une nouvelle connexion, puis fermer l’accès root et redémarrer pour les mises à jour.
2. Reconstruire et vérifier les deux APK, les publier sur le portail en conservant les précédents, mettre à jour les SHA-256 du guide d’exploitation.
3. Commiter, pousser la branche et contrôler la PR #2.
4. Rejouer le protocole du jour 3 avec deux téléphones et compléter ce rapport.
