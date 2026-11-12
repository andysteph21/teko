# Rapport de correction — jour 2 de l’alpha

État au 11 novembre 2026. Ce rapport suit [le plan du jour 2](14-plan-alpha-jour2.md) et répond aux anomalies du [rapport de test](15-rapport-test-jour2.md).

## Synthèse

Les correctifs côté serveur sont en service sur le VPS depuis le 11 novembre 2026, 01 h 57 UTC (02 h 57 à Libreville), après accord du porteur. Ils profitent aux APK déjà installés. Les deux APK corrigés sont publiés sur le portail et le VPS est durci depuis le même jour. Reste à faire : un essai sur téléphone, la fermeture de la connexion root et le redémarrage du VPS.

| Anomalie | Correction | Dépôt | VPS | APK |
| --- | --- | --- | --- | --- |
| J2-01 Proposition invisible pour le chauffeur | Nouvelle proposition après expiration, délai de 30 s, interrogation toutes les 5 s | Fait, testé | Déployé (nouvelle proposition, 30 s) | Publié le 11 novembre |
| J2-02 Confort sans chauffeur | Éco et Confort pour les chauffeurs voiture du banc | Script prêt | Déployé : 10 chauffeurs en Éco et Confort | Sans objet |
| J2-03 Départ hors zone | Zone de service « Gabon » | Script prêt | Déployé | Sans objet |
| J2-04 Deux repères seulement | Import de 1 695 repères OpenStreetMap | Outil et fichier prêts | Déployé : 1 697 repères validés | Sans objet |
| J2-05 « Votre chauffeur arrive » sans chauffeur | Redirection selon le statut de la course | Fait, testé | Sans objet | Publié le 11 novembre |
| J2-08 Erreurs 502/503 du push | Non traité | — | — | — |
| CI `deno-test` rouge | Import `npm:standardwebhooks@1.0.0`, verrou nettoyé | Fait, testé | Sans objet | Sans objet |
| VPS non protégé, sans sauvegarde | Scripts de durcissement et de sauvegarde | Scripts prêts | Durcissement exécuté, sauvegarde quotidienne planifiée | Sans objet |

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

Non vérifié : aucun essai sur téléphone. Sur le banc d’audit local, 123 courses restées ouvertes par d’anciens tests ont été annulées pour rejouer la suite.

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

Les fichiers appliqués sont copiés dans `/opt/teko-alpha` (migration, `terrain-jour2.sql`, `osm-landmarks.py`, `backup-db.sh`, `harden-vps.sh`). Les fonctions Edge sont inchangées.

Retour arrière : restaurer la sauvegarde de 01 h 56 UTC avec `pg_restore --clean`, hors course, puis redémarrer Martin.

Non vérifié sur le VPS : aucun devis ni aucune course n’a été rejoué avec un compte de test après le déploiement. La nouvelle proposition après expiration est prouvée par le test E2E local, pas par un essai réel.

## Durcissement du VPS, 11 novembre

`harden-vps.sh` exécuté hors course. Contrôles après exécution :

- pare-feu actif : entrées refusées par défaut, 22 limité, 80 et 443 ouverts ; les ports 5432, 58421 et 8002 restent fermés de l’extérieur ;
- fail2ban actif sur SSH ; swap de 2 Go monté ;
- sauvegarde quotidienne planifiée à 03 h 30 UTC ;
- nouvelles connexions SSH réussies pour `root` et pour `teko` ;
- 12 conteneurs actifs, URL publiques en HTTP 200, liaison passerelle → Valhalla vérifiée.

Non fait : fermeture de la connexion root, redémarrage pour les 74 mises à jour, copie des sauvegardes hors serveur.

## APK du 11 novembre

Construits avec `build-alpha.mjs <rôle> --remote --reuse-native`, vérifiés avec `verify-alpha-apk.mjs <rôle> --remote` (signature alpha, identifiant, mode release, origine HTTPS, permissions GPS, absence de secrets, sources des correctifs embarquées). Version `0.1.0`, même signature : ils s’installent par-dessus les précédents.

| APK | SHA-256 |
| --- | --- |
| Passager | `f2d5e7c52ccd7786e4a3c076289f2dbafdc8b7689194f1dad656c6806aa346fb` |
| Chauffeur | `6fd25d0dee90f28805a09276cfa225512319feffc5e338084f49b771daa6ef71` |

Publiés par renommage dans `.local/alpha-remote/apks/` ; les fichiers du 10 novembre sont gardés dans `.local/alpha-remote/jour2-apks-precedents.*`. Contrôle depuis HTTPS : téléchargement anonyme refusé (401), chaque rôle obtient son APK à l’empreinte attendue et se voit refuser l’autre (403). Aucune installation sur téléphone n’a été faite.

## Mises à jour, redémarrage et audit final, 11 novembre

Après une sauvegarde de la base, les mises à jour système ont été appliquées (il en reste 5 en diffusion progressive, sans redémarrage requis) et le VPS a redémarré à 02 h 29 UTC sur le noyau `7.0.0-43`. L’interruption a duré environ 40 secondes. Les 12 conteneurs, le service des fonctions, le pare-feu, fail2ban, le swap et la minuterie de sauvegarde sont revenus seuls. Le battement de présence du chauffeur resté en ligne a repris. La PR #2 est verte sur les six contrôles, `deno-test` compris.

Contrôle depuis HTTPS avec le compte de contrôle du développeur, sans commande de course :

| Essai | Résultat |
| --- | --- |
| Même point au départ et à l’arrivée | 422 `POINTS_TOO_CLOSE` |
| Mont-Bouët → Glass en Éco, Moto, Confort | 1 600, 950 et 2 750 FCFA |
| Départ à l’ouest de l’ancienne zone, Akanda, Owendo | Devis obtenus (refusés le jour 2) |
| Port-Gentil et Franceville, trajets en ville | Devis obtenus |
| Départ hors du Gabon | 422 `ROUTE_NOT_FOUND` |
| Recherche « sta », « marché », « pharmacie », « église », « port-gentil » | 6 à 8 résultats chacune ; « akanda » : 2 |

Points d’attention relevés par l’audit, non corrigés :

1. **La recherche de repères ne tient pas compte de la position.** `search_landmarks` trie par notoriété puis par nom et rend 8 résultats. Avec 1 697 repères dans tout le pays, « pharmacie » ou « église » peut afficher d’abord des lieux d’une autre ville. Corriger demande un paramètre de position dans la RPC et dans l’app passager, donc un nouvel APK.
2. **Qualité des repères importés.** 160 repères portent un nom générique d’un seul mot court (« Église », « Total ») et 63 noms existent en plusieurs exemplaires. Ops peut les repasser en brouillon ; un filtre à l’import est à prévoir.
3. **Aucune distance maximale dans le dispatch.** Avec la zone « Gabon », une course commandée à Port-Gentil serait proposée à un chauffeur en ligne à Libreville. Sans effet tant que les testeurs sont tous à Libreville.
4. **La connexion SSH root reste ouverte.** Le compte `teko` n’a pas `sudo` : fermer root couperait toute administration du serveur. L’attribution de `sudo` à `teko` n’a pas été autorisée dans la session ; elle revient au porteur.
5. **Les sauvegardes restent sur le VPS**, et les erreurs 502/503 horaires du push (J2-08) n’ont pas été diagnostiquées.

## Recherche de repères par proximité, 11 novembre

Point d’attention n° 1 de l’audit, corrigé dans le dépôt. La migration `20261111100000_alpha_recherche_proximite.sql` ajoute à `search_landmarks` un point de référence optionnel : les repères sont classés par tranches de 2 km autour de ce point, puis par notoriété, puis par distance. Sans ce point, l’ordre antérieur est conservé, donc les APK déjà installés continuent de fonctionner. L’app passager transmet le départ choisi.

Vérifié : 91 tests pgTAP (dont deux nouveaux), tests `places` et `ride` de l’app passager (43), test du client d’API, typage, et les deux formes d’appel via PostgREST sur le banc local.

Déployé le 11 novembre après accord du porteur : sauvegarde, migration appliquée à 02 h 36 UTC (60 migrations enregistrées), puis APK passager reconstruit, vérifié et publié. Son SHA-256 est `51c3fd5d147e7d2c2fbda8e27cc74a821e904dc296b9b2b56d54e75e5aae027b` ; il remplace celui du tableau « APK du 11 novembre ». Le téléchargement par rôle a été recontrôlé depuis HTTPS.

Contrôle depuis HTTPS : depuis Mont-Bouët, les huit résultats de « pharmacie » sont à moins de 1,1 km ; depuis Port-Gentil, les premiers résultats sont à Port-Gentil. L’appel sans point de référence, celui des APK antérieurs, répond toujours.

## Reste à faire

1. Rejouer le protocole du jour 3 avec deux téléphones, après réinstallation des deux applications par le testeur, et compléter ce rapport.
2. Donner `sudo` au compte `teko`, vérifier, puis passer `PermitRootLogin no` dans `/etc/ssh/sshd_config.d/00-teko-key-only.conf` et recharger SSH.
3. Organiser la copie des sauvegardes hors du serveur.
4. Borner la distance de dispatch avant d’inviter des testeurs hors de Libreville.
5. Filtrer les repères importés au nom générique.
