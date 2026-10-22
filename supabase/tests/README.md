# Tests du backend alpha

Les tests vérifient des invariants métier et des frontières d’autorisation.
Un simple succès HTTP ne suffit pas : les scénarios contrôlent les lignes
réellement créées, les montants, l’absence de fuite et l’unicité des effets.

## Trois niveaux complémentaires

- `database/` : pgTAP, calculs SQL et RLS sous rôles simulés ; ne prouve pas
  l’authentification d’une session réelle ni les politiques Storage HTTP.
- `e2e/` : Auth, PostgREST, RPC, Realtime, Storage et fonctions HTTP avec de
  vrais JWT. Les préconditions privilégiées restent séparées des actions
  attaquées. Les suites refusent une base autre que le banc jetable alpha.
- `../functions/` : tests Deno des intégrations et refus par défaut. Les
  fournisseurs externes simulés ne démontrent pas une livraison SMS/FCM réelle.

## Exécuter sur une installation neuve

Depuis la racine du dépôt, avec Docker disponible :

```sh
node tools/audit/prepare-bench.mjs
supabase start --workdir /tmp/teko-alpha-bench --exclude studio,postgres-meta,logflare,vector,supavisor
supabase functions serve --workdir /tmp/teko-alpha-bench --env-file /tmp/teko-alpha-functions.env
```

La dernière commande reste ouverte. Dans un autre terminal :

Pour les essais longs sur téléphones, on peut remplacer ce serveur de premier
plan par `node tools/audit/serve-bench.mjs start`, puis vérifier sa disponibilité
avec `node tools/audit/run-bench.mjs node /home/steph/Teko/tools/audit/wait-functions.mjs`.
Le runtime reste indépendant du terminal ; `status` affiche son état et `stop`
demande uniquement l’arrêt du processus enregistré, après contrôle de son
identité et de son heure de création. Arrêter le serveur de premier plan avant
ce lancement ; ne pas démarrer deux runtimes simultanés. Le mode push se change
serveur arrêté, avant un nouveau `start`.

```sh
supabase test db --workdir /tmp/teko-alpha-bench
node tools/audit/run-bench.mjs
node tools/audit/check-mutations.mjs
```

Installer au préalable les dépendances de `e2e/` avec son lockfile. Le harnais
charge les clés locales sans les afficher ; ne pas copier la sortie de
`supabase status -o env` dans les journaux publics. Les secrets du bac à sable
sont créés aléatoirement dans `/tmp/teko-alpha-functions.env`, droits 0600,
et conservés hors Git dans `.local/alpha-services/bench-functions.env` pour
survivre à un redémarrage. La préparation réutilise cette copie si `/tmp` a
été vidé ; ne jamais l'inclure dans les artefacts de CI.

Après un redémarrage du poste, les conteneurs peuvent être actifs alors que
`/tmp/teko-alpha-bench` a disparu. Exécuter d’abord
`node tools/audit/prepare-bench.mjs` pour recréer la configuration et les
copies de sources, puis `node tools/audit/serve-bench.mjs status`.
Cette préparation ne réinitialise aucune base. Ne pas utiliser `db reset`
pour réparer l’absence de ce dossier. Vérifier aussi `adb devices -l` :
un serveur ADB disponible ne signifie pas que les téléphones sont connectés.

Le devis HTTP utilise Valhalla local sur le port 8002. La CI démarre
`tools/audit/route-fixture.mjs` pour vérifier le contrat HTTP sans télécharger
un extrait cartographique. Cette fixture ne remplace pas les essais du vrai
moteur de routage et de la couverture terrain.

Pour rejouer les migrations depuis zéro, `supabase db reset --local --workdir
/tmp/teko-alpha-bench --yes` détruit **uniquement le banc jetable**. Vérifier le
chemin et le projet avant usage ; ne jamais appliquer cette commande à `teko`
ou à un environnement hébergé.

## Invariants critiques couverts

| Règle | Suites principales |
|---|---|
| Pas de changement de rôle, KYC, solde ou transition directe par un usager | `security-rls`, `security-alpha`, `kyc-boundaries` |
| Devis propriétaire, expiration et consommation concurrente unique | `quotes`, `alpha-invitations` |
| Départ GPS conservé, déplacement soumis à un nouveau devis nominatif | `pickup-quote` |
| PIN passager seul, cinq erreurs puis blocage persistant | `security-alpha`, `pin-attempts` |
| Recherche bornée et attribution exclusive | `dispatch`, `ride-lifecycle` |
| Frais non encaissés sans crédit, preuve obligatoire, Finance seul valide | `manual-receipts`, `cash-close` |
| Refus motivé et chaîne de versions, une seule validation concurrente | `manual-revisions` |
| Sept pièces réelles et vérification physique avant activation | `compte-sos`, `kyc-boundaries` |
| Véhicule verrouillé après KYC et nouvelle vérification Ops | `vehicle-review` |
| Points GPS légitimes, heure réelle, doublons et rétention sept jours | `security-alpha`, `gps-retention` |
| Secrets webhook absents des lectures et de l’historique | `security-webhooks`, tests Deno |

Les noms ci-dessus désignent les fichiers `.test.ts`. Les totaux évoluent :
consulter la sortie du dernier passage complet, pas un nombre figé dans une
introduction historique.

## Tests mordants et restauration

Exécuter les mutations **sans autre suite backend en parallèle**. Le harnais
injecte une faute à la fois dans `supabase_db_teko-alpha-audit`, exige une
assertion échouée et restaure la garde dans un `finally`. Une panne de réseau
ou d’outil ne vaut pas détection d’une faute.
Les journaux et résultats sont conservés dans
`.local/alpha-evidence/mutations`, hors Git. Les sauvegardes brutes et secrets
ne font pas partie des preuves à transmettre à la revue indépendante.

Le contrôle UI `tools/audit/check-pickup-ui.mjs` prépare une copie fautive du
hook : elle commande dès réception du nouveau devis. Jest charge uniquement
cette copie via une configuration dédiée ; la source applicative reste
inchangée. Le mode `verify` exige l'échec précis de l'assertion d'absence de
commande, puis supprime la copie. Le workflow `monorepo-ci.yml` contient les
trois commandes de reproduction et archive leur preuve. Une erreur d'import
ou un délai dépassé ne compte pas comme faute détectée.

`tools/audit/check-restore.mjs` sauvegarde SQL et fichiers privés, restaure le
SQL dans une base distincte du conteneur alpha, compare les comptages et une
ACL critique, extrait les fichiers puis compare leurs SHA-256. Les tâches
planifiées sont capturées sans les démarrer dans la copie. Cela ne prouve pas
encore le redéploiement complet des services sur un nouvel hôte.

Les scénarios sur APK signé, les pertes réseau et la localisation écran éteint
sur OPPO/Pixel complètent ces suites. Ils restent indispensables avant terrain,
ainsi que la revue indépendante et les procédures Finance/SOS.

Pour reprendre une stack alpha déjà démarrée sans reset, avec aucun runtime
Edge alpha actif : `bash tools/audit/validate-bench.sh`. Le script exige les
fournisseurs simulés, démarre son propre runtime de fonctions, vérifie le
refus anonyme, régénère les types et exécute pgTAP, JWT/HTTP puis les mutations
séquentiellement. Il arrête uniquement le processus de fonctions qu'il a
lancé ; les bases et les autres projets restent présents. Les journaux
restent dans `.local/alpha-evidence`. Il ne remplace pas un runtime Expo
déjà utilisé pour les essais sur téléphones.

Après arrêt du runtime que l'on a lancé, `node tools/audit/set-push-mode.mjs
mock` prépare les validations automatisées ; `node tools/audit/set-push-mode.mjs
expo` prépare les livraisons réelles sur les appareils USB. Redémarrer les
fonctions avec le fichier d'environnement du banc après chaque changement.
Le mode Expo exige son jeton serveur et désactive le drapeau de simulation
push. Les secrets restent persistés hors Git, droits 0600.

## Reprise des parcours USB sur deux téléphones

Les fragments `tools/audit/maestro/` sont préparés pour le nouvel APK de
confirmation du devis. **Ils restent à exécuter sur appareils**. Ils exigent
le bandeau GPS fictif du banc et utilisent des captures à chemins relatifs,
pour éviter l'échec d'archivage observé avec un chemin absolu.

1. Reconstruire et vérifier les APK séquentiellement, relever leurs SHA-256,
   puis rétablir les reverses USB et les fonctions du banc. Ne pas réinitialiser
   la base pour reprendre la course précédente.
2. Sur une nouvelle course dédiée, choisir une suggestion réellement différente
   du départ. Lancer `driver-accept-arrive.yaml` en attente sur le téléphone
   chauffeur, puis `client-confirm-pickup.yaml` sur le passager.
3. Lire le PIN sur le seul écran passager ; le fournir au fragment
   `driver-start.yaml` avec l'option Maestro `-e PIN=…`. Un essai de mauvais
   code doit utiliser une valeur différente de ce PIN, sans supposer que
   `0000` est toujours incorrect.
4. Avant la clôture, mesurer les points serveur écran éteint, puis une coupure
   réseau et la reprise de la file GPS. Relever les heures originales,
   doublons éventuels et consommation mémoire de l'OPPO. Ne pas supprimer
   les protections batterie pour transformer un échec en succès.
5. Exécuter `driver-complete-cash.yaml` ; rapprocher le reçu du devis, du
   grand livre, de la commission de 15 % et du solde. Les seules assertions
   d'écran ne prouvent pas ces effets financiers.

L'ancien `apps/client/e2e/course-complete.yaml` ne prouve qu'une commande
jusqu'à la recherche de chauffeur ; il ne valide pas cette séquence complète.
## Reprise ciblée d’un assemblage Android interrompu

Après un bundle JavaScript **réussi** pour le même état des sources et la
même configuration USB, l’assemblage peut être repris avec
`node tools/audit/run-bench.mjs node /home/steph/Teko/tools/audit/build-alpha.mjs driver --js-only --assemble-only`.
Ce mode exige un projet natif alpha et un bundle existant. Il ne remplace pas
la reconstruction forcée du bundle après modification des dépendances ou de
la configuration ; ne pas l’utiliser pour déclarer un ancien bundle à jour.
Pour séparer les étapes longues, `--js-only --bundle-only` reconstruit seulement
le bundle ; après succès, `--js-only --assemble-only` assemble l’APK. Le contrôle
`verify-alpha-apk.mjs` compare aussi le bundle incorporé et les sources des
correctifs clés au dernier bundle produit, en plus de la signature et des secrets.

Le scénario physique de déplacement du départ dispose d’un repère synthétique
à proximité du GPS USB, préparé uniquement sur le banc isolé par
`node tools/audit/run-bench.mjs node /home/steph/Teko/tools/audit/prepare-pickup-fixture.mjs`.
Son nom affiche « banc USB » ; il ne constitue pas un relevé terrain.

### Correctif GPS Expo et règlements au pas de 25 (19 octobre)

`pnpm install --frozen-lockfile` réapplique le patch versionné de
`expo-task-manager` 57.0.13. `node tools/audit/check-task-lifetime.mjs` teste
l’enregistrement réellement installé et injecte l’ancienne terminaison
prématurée dans une copie en mémoire. Ce contrat JS ne remplace pas les essais
Android en arrière-plan, avec panne puis écran éteint. La provenance APK
contrôle aussi le module JavaScript Expo incorporé dans le bundle.

`receipt-cash-step.test.ts` passe par JWT Ops/Finance et Storage : les nouveaux
montants hors pas de 25 sont refusés **avant** leur conversion à deux décimales,
les révisions conservent l’historique et un ancien dossier reste approuvable à
son montant exact. Le harnais de mutations retire cette garde puis introduit
un arrondi préalable ; chacune de ces fautes doit provoquer une assertion.

Pour isoler le GPS du parcours passager déjà testé, `device-ride.mjs` permet
les seules actions `create`, `status` et `pin <id>` sur le compte passager
synthétique du banc. Le devis HTTP et la commande utilisent son vrai JWT ;
l’acceptation, l’arrivée et le démarrage restent effectués dans l’APK chauffeur.
`create` refuse de dupliquer une course active. `pin` n’utilise jamais le rôle
chauffeur ni le rôle de service pour lire le code. Exécuter ces actions avec
`run-bench.mjs`, après lancement des attentes Maestro du téléphone concerné.
Aucun SMS payant ni course terrain n’est lancé par ce banc.

Le flow `maestro/driver-accept-start.yaml` réunit acceptation, arrivée et
ouverture du champ PIN. Après la ligne « id: ride-complete is visible » en
attente, saisir le code lu par le seul passager avec `adb -s <téléphone> shell
input text <code>` ; ne pas démarrer un second UIAutomator sur le même
téléphone. Ce flow ne ferme pas le clavier : sa fermeture doit venir de l’app.

Pour le test de panne, retirer uniquement `adb reverse` ne suffit pas : des
connexions existantes peuvent survivre. Au banc, arrêter puis redémarrer le
seul conteneur `supabase_kong_teko-alpha-audit`, conserver la DB disponible
pour les contrôles, et ne pas ramener l’app au premier plan avant constat de
reprise. Contrôler aussi les heures de mesure distinctes, les identifiants
d’échantillon et le maintien de l’écran éteint pour l’essai OPPO. Les fichiers
de preuve datés et les limites de ces scénarios sont dans l’audit alpha.
