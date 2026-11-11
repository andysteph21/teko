# Passation technique de l’alpha Teko

État vérifié le 10 novembre 2026, corrigé le 11 novembre après contrôle direct du VPS et du jour 2 d’essai. Cette note permet à une autre session de reprendre le code et le banc de Libreville. Le guide détaillé des opérations se trouve dans [12-exploitation-alpha-vps.md](12-exploitation-alpha-vps.md). Les décisions et seuils d’ouverture de l’alpha restent consignés dans [08-plan-alpha.md](08-plan-alpha.md) et [11-procedures-alpha.md](11-procedures-alpha.md).

## Priorités produit convenues

- Petit essai fermé à Libreville avec environ dix chauffeurs Android et des passagers invités. Les invités utilisent leurs propres appareils pendant des trajets en voiture. Le GPS, le trajet et l’affectation chauffeur-passager doivent être réels.
- Comptes, recettes et justificatifs sont ceux du banc de test. Paiements mobiles, SMS et encaissements sont désactivés. Le circuit cash/Finance sert à évaluer l’affichage et les soldes.
- Les applications demandent la permission GPS Android à la première ouverture de la carte. Le bouton **Ma position** doit lire une nouvelle position et déplacer la caméra. Le chauffeur doit tester l’écran verrouillé.
- Les SMS terrain ne sont pas configurés. Les notifications push Expo sont en revanche actives sur le VPS (`PUSH_PROVIDER=expo`, jeton présent dans `functions.env`, quatre appareils Android enregistrés et sept envois acceptés au 11 novembre). Aucun secret Firebase/Expo ni aucune clé de prestataire ne doit être copié dans le dépôt ou la conversation.

## Projet et branche

- Dépôt local : `/home/steph/Teko`
- Dépôt GitHub : `andysteph21/teko`, branche de travail `codex/alpha-essai-distance`, cible `main`
- Pull request ouverte et brouillon : [#2 Alpha privée Teko à Libreville](https://github.com/andysteph21/teko/pull/2)
- Le commit vérifié au moment de cette passation est `7e88337` ; la note elle-même est le commit `b0de71d`. Sur `b0de71d`, le contrôle `deno-test` a échoué : esm.sh a republié `fast-sha256@1.3.0` avec une autre empreinte que celle de `deno.lock`. Les contrôles carto, base, E2E, carte et monorepo étaient verts. Le correctif du jour 2 remplace l’import esm.sh de `standardwebhooks` par `npm:standardwebhooks@1.0.0`.
- La working tree contenait des changements utilisateur à `supabase/.temp/cli-latest` et le document non suivi `docs/plan/07-deploiement-beta.md`. Ne pas les écraser, supprimer ou inclure par inadvertance.
- La branche comprend de l’historique de travail antérieur à la correction. Les correctifs de cette intervention sont répartis en commits autour de `1286d1f` (devis), `f8fa6bd` (GPS), `55fb7c2` (repères OSM), `92b9c62` (emprise Martin) et `8892aa7` (CI).

## Architecture du banc

Le VPS sert le banc privé sur `alpha.tekomove.com`.

| URL / service | Rôle |
| --- | --- |
| `/install` | Portail privé APK, connexion test et contrôle que l’invitation et le rôle autorisent le téléchargement. |
| `/admin` | Console protégée. Ops gère les invitations et suit les courses. Finance vérifie les écritures simulées et justificatifs. |
| `/health` | Vérification minimale de la passerelle. |
| `/gabon` | Fond de carte Gabon PMTiles/Planetiler. |
| `/landmarks` | Repères validés servis par Martin/PostGIS. |
| `/teko_roads` | Segments Teko validés servis par Martin/PostGIS. Aucun segment n’est validé actuellement. |
| `/routing` | API Valhalla pour les devis et itinéraires. |
| `/functions/v1`, `/auth/v1` | Fonctions Edge et Auth Supabase dans Docker. |

Caddy publie HTTPS sur 443 et redirige HTTP. Postgres, Kong interne, Martin et Valhalla ne sont pas publiés directement. Le root de déploiement VPS est `/opt/teko-alpha`. Les fonctions servent depuis `/opt/teko-alpha/.local/alpha-remote/supabase/functions`, avec service utilisateur `teko-alpha-functions.service` sous le compte système `teko`. `/opt/teko-alpha` n’est pas un dépôt Git : c’est une copie des sources des 8 et 9 novembre, complétée par les correctifs transférés ensuite. Le VPS tourne sous Ubuntu 26.04 avec le compagnon Supabase CLI 2.110.0. La migration `20261019102000_alpha_field_signup_hook` n’y est volontairement pas appliquée, car elle est réservée à l’Auth terrain. Consulte les noms précis de conteneurs et commandes dans le guide d’exploitation.

La base et les fichiers du banc sont privés. Sur le poste de développement, la configuration locale est sous `.local/alpha-remote`, les clés dans `.local/alpha-signing` et les services externes dans `.local/alpha-services`. Ces chemins sont hors Git. Ne pas en afficher le contenu, transmettre des OTP ou mots de passe, ni recopier des journaux bruts comprenant des coordonnées.

## Incident diagnostiqué

Le 9 novembre, vers 21 h 56 heure de Libreville, neuf demandes de devis ont utilisé des coordonnées identiques au départ et à l’arrivée. Valhalla avait répondu HTTP 200, mais avec une longueur et une durée nulles. L’écriture du devis était refusée en base. L’application traitait à tort ce HTTP 422 comme une panne des tarifs.

Les journaux Auth indiquaient deux connexions passager et une connexion chauffeur. Ils ne permettaient pas de relier individuellement les neuf demandes à un utilisateur. Aucune nouvelle course terrain n’a été créée pendant ces refus.

La fonction `price-quote` vérifie désormais le trajet avant de créer un devis, retourne des codes spécifiques (`POINTS_TOO_CLOSE`, `ROUTE_NOT_FOUND`, `OUTSIDE_SERVICE_AREA`, ou indisponibilité) et journalise un identifiant de requête. Les événements de devis ne contiennent pas les points GPS. Dans l’app passager, l’erreur de trajet permet de revenir aux repères et de confirmer un nouveau devis.

## Correctifs actuellement servis

1. **Devis** — mesure Valhalla nulle refusée avant Postgres, durée positive conservée, codes métier distincts des erreurs serveur. Une vérification HTTPS a confirmé le refus du point identique et des devis Éco, Moto et Confort entre points distincts de Libreville.
2. **GPS mobile** — demande initiale de permission sur les deux accueils et bouton **Ma position**. La nouvelle lecture GPS recentre la carte. Le brouillon de départ choisi manuellement reste conservé sur l’app passager.
3. **Route de base** — graphe Valhalla reconstruit depuis l’extrait OpenStreetMap de base, sans les ajouts de routes du banc. Une route distincte a été vérifiée par HTTPS.
4. **Repères** — coordonnées du marché Mont-Bouët corrigées depuis OSM, station-service de Glass ajoutée, deux positions préremplies non vérifiées replacées en brouillon. Martin utilise `auto_bounds: skip`; les deux nouveaux repères ont été demandés via les tuiles aux zooms 13 à 17.
5. **Applications** — APK passager et chauffeur Android `arm64-v8a`, signés avec la même clé alpha, version `0.1.0`. Ils se mettent à jour par-dessus les APK installés portant les mêmes identifiants et signature. Le bandeau correct est **ESSAI PRIVÉ · GPS RÉEL · PAIEMENT SIMULÉ**.

Les APK sont servis uniquement par rôle invité. Le téléchargement correspondant à chaque rôle a été authentifié, et l’autre rôle a reçu un refus. Les SHA-256 et les étapes de retour arrière sont dans le guide d’exploitation. Android ne dispose pas d’une installation/observation ADB validée dans cette session : `adb devices -l` était vide. Le trajet physique reste à vérifier par les testeurs à Libreville.

## Tests exécutés

- TypeScript : `@teko/ui`, `@teko/api-client`, `@teko/app-client`, `@teko/app-driver` passent.
- Apps : tests ciblés passager 21/21 et chauffeur 22/22. Le test spécifique de refus du devis et de navigation vers la recherche passe également.
- Fonctions : lint Deno et 47 tests passent en local.
- GitHub Actions, PR #2 : verte sur `7e88337` ; sur `b0de71d`, `deno-test` est rouge (voir plus haut), les cinq autres contrôles sont verts.
- APK : signature alpha, identifiants, mode release, destination HTTPS, permissions GPS, absence de secrets incorporés et sources embarquées vérifiés.
- VPS HTTPS : santé, portail privé, console privée, tuiles, invitation et téléchargement par rôle, refus de devis point-identique, trois catégories de devis, route routable et repères testés.

Ces contrôles n’établissent pas encore le fonctionnement du GPS sur téléphone à Libreville, le verrouillage d’écran chauffeur ou une course réelle de bout en bout. Le prochain travail doit commencer par obtenir les retours terrain et vérifier l’installation sur les téléphones, dont l’appareil bas de gamme.

## Reprise immédiate

1. Lire cette note puis [le guide d’exploitation](12-exploitation-alpha-vps.md) et [la procédure de retours](11-procedures-alpha.md#retours-de-terrain).
2. Exécuter `git status -sb` et `gh pr checks 2`. Préserver les changements utilisateur déjà présents dans la working tree.
3. Si l’APK présent sur un appareil n’a pas le bandeau **GPS RÉEL · PAIEMENT SIMULÉ**, mettre à jour depuis [le portail](https://alpha.tekomove.com/install) avec les identifiants de test remis individuellement.
4. À Libreville, tester le GPS des deux rôles, une commande entre deux repères distincts, l’offre et le PIN, la position écran verrouillé et la fin de course. Ne collecter ni codes ni coordonnées précises dans le registre public.
5. En cas de blocage, recueillir heure locale, alias de testeur, rôle, modèle et version Android, opérateur, écran et action précédente, texte exact et fréquence de reproduction. Utiliser la procédure de journaux du guide pour corréler les événements côté serveur.

## Connexion et diagnostic du VPS

Les secrets de connexion existent uniquement sur le poste et le serveur. Les variables `TEKO_ALPHA_DEPLOY_KEY` et `TEKO_ALPHA_SSH_USER` ne sont pas définies par défaut : la clé de déploiement est `.local/alpha-remote/ssh/deploy_ed25519` et la clé d’hôte épinglée `.local/alpha-remote/ssh/vps-known_hosts` (à passer avec `-o UserKnownHostsFile=`). Au 11 novembre, cette clé n’ouvre que le compte `root` ; le compte `teko` la refuse tant que `tools/alpha-remote/harden-vps.sh` n’a pas été exécuté. Ne pas mettre la valeur de la clé privée ici.

```sh
ssh -o StrictHostKeyChecking=yes -i "$TEKO_ALPHA_DEPLOY_KEY" \
  "$TEKO_ALPHA_SSH_USER@alpha.tekomove.com"
cd /opt/teko-alpha
docker compose --env-file .local/alpha-remote/vps-compose.env \
  -f tools/alpha-remote/compose.vps.yml \
  -f tools/alpha-remote/compose.admin.yml ps
curl -fsS https://alpha.tekomove.com/health
docker stats --no-stream
```

Les commandes de journalisation filtrent les identifiants avant affichage. Sur le VPS, les fonctions sont contrôlées avec systemd utilisateur pour `teko`. Ne pas redémarrer ou remplacer Valhalla/Martin pendant une course. Pour corriger les cartes ou un APK, sauvegarder l’actif et suivre la recette de retour arrière déjà documentée.

## État constaté le 11 novembre et suite

Le contrôle direct du VPS et l’analyse du jour 2 ont relevé des points absents de cette note : chauffeurs du banc limités à la catégorie Éco, offre jamais reproposée après expiration, zone de service limitée à Libreville, deux repères validés seulement, pare-feu inactif et aucune sauvegarde planifiée. Ils sont traités dans [le plan du jour 2](14-plan-alpha-jour2.md), [le rapport de test](15-rapport-test-jour2.md) et [le rapport de correction](16-rapport-corrections-jour2.md).
