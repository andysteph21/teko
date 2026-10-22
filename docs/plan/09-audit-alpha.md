# Audit technique de l’alpha — état de travail

Ouvert le 18 octobre 2026, actualisé le 22 octobre 2026. Périmètre : dépôt Teko, Supabase local isolé
`teko-alpha-audit`, console admin et APK Android alpha. Cette revue fait partie
de l’implémentation ; elle ne remplace pas la revue indépendante exigée avant
les premières courses réelles. L’alpha n’est pas encore autorisée au terrain.

Dernière validation backend : **89 assertions SQL, 125 tests JWT/HTTP et vingt et une
mutations détectées**, avec restauration des gardes. Le contrat TypeScript a
été régénéré depuis ce banc et les onze vérifications de types passent. Les
preuves actuelles sont conservées dans `.local/alpha-evidence`. Les sections
de reprise plus bas conservent l'historique des blocages d'exécution ; ils ne
décrivent plus l'accès actuel à Docker/ADB. Les deux APK signés ont été
reconstruits et installés ; leurs parcours critiques restent à terminer avant
ouverture terrain.

## Méthode et limites

Les scénarios adversariaux utilisent de vrais JWT passager, chauffeur, Ops,
Finance et Carto via Auth, PostgREST et Storage. Le rôle de service sert à créer
les préconditions et à vérifier les effets ; il ne joue pas l’action attaquée.
Les fixtures chauffeurs déjà activés ne prouvent pas le parcours KYC : celui-ci
possède sa propre suite avec sept fichiers réellement déposés et revus.

Les tests SQL pgTAP complètent ces scénarios en contrôlant les politiques et les
calculs. Les tests unitaires vérifient les contrats et les décisions locales.
Une réussite avec des mocks ne prouve ni la livraison SMS/FCM, ni la continuité
GPS Android, ni la qualité des itinéraires à Libreville.

Échelle approuvée : critique = prise de contrôle ou écriture financière non
autorisée ; élevé = fuite KYC/GPS/PIN, contournement des règles de course ou des
restrictions alpha ; moyen/faible = impact limité. Chaque ligne décrit le
prérequis et l’effet, plutôt que de reprendre une note générique de scanner.

## Constats et corrections

| ID | Niveau | Condition et conséquence | Correction / preuve locale |
|---|---|---|---|
| A01 | Critique | Un participant réécrit directement un statut ou un prix de course ; le calcul financier peut être contourné. | DML usager révoqué, transitions RPC et prix ferme serveur ; `security-alpha.test.ts`. |
| A02 | Critique | Appel d’une transition interne exposée aux utilisateurs ordinaires. | ACL explicites, fonctions internes privées au service ; scénario JWT et mutation de l’ACL détectée. |
| A03 | Élevé | Le chauffeur reçoit le PIN dans la ligne de course ou la réponse RPC. | Stockage privé avant publication, lecture passager dédiée ; tests SELECT/RPC et mutation détectée. |
| A04 | Élevé | Essais illimités de PIN permettant la recherche exhaustive. | Cinq erreurs persistées, blocage cinq minutes, journal sans code ; `pin-attempts.test.ts`. |
| A05 | Élevé | Un chauffeur tiers injecte une position pour une course à laquelle il ne participe pas. | RLS chauffeur assigné et course active ; mutation de la politique détectée. |
| A06 | Critique | Prix ou distance proposés par le téléphone deviennent autorité financière. | Itinéraire serveur et devis nominatif en base, cinq minutes, consommation unique ; `quotes.test.ts`, concurrence et appel HTTP de devis. |
| A07 | Élevé | Un compte authentifié non invité accède à la course ou à la disponibilité. | Invitation liée au téléphone vérifié Auth, contrôle devis/commande/heartbeat/acceptation/dispatch ; `alpha-invitations.test.ts`. |
| A08 | Critique | Frais non encaissés crédités au chauffeur, doublon de preuve ou de validation. | Créance en attente, encaissement complet et validation Finance ; références uniques, preuves immuables, verrous et idempotence ; `manual-receipts.test.ts`. |
| A09 | Élevé | Un refus Finance efface la preuve précédente ou permet plusieurs crédits. | Refus motivé et versions sous la même référence ; `manual-revisions.test.ts` vérifie aussi deux révisions et deux validations concurrentes. |
| A10 | Élevé | Un rôle Carto/Finance lit les pièces KYC ou un chauffeur forge un document déjà validé. | Sept pièces privées, Ops seul réviseur avec superadmin, preuve réelle exigée, activation après vérification physique ; quatre attaques reproduites avant correction puis refusées dans `kyc-boundaries.test.ts`. |
| A11 | Élevé | Les secrets webhook restent visibles dans la configuration ou son historique. | Politiques restrictives, historique nettoyé et nouvelles valeurs expurgées ; `security-webhooks.test.ts`. |
| A12 | Élevé | Webhooks ou chemins Airtel utilisables sans leur secret ou hors bac à sable. | Refus par défaut, comparaison de secret centralisée, paiements réels désactivés ; tests Deno et scénarios HTTP. |
| A13 | Élevé | Les mesures différées paraissent récentes, se dupliquent ou restent consultables indéfiniment. | Identifiant d’échantillon stable, heure réelle, file locale 24 h, lecture serveur sept jours et purge toutes les cinq minutes ; `gps-retention.test.ts`. |
| A14 | Élevé | Le chauffeur conserve sa présence après avoir demandé de passer hors ligne. | RPC de retrait immédiat et expiration des offres ; test JWT sans effet sur un autre chauffeur. |
| A15 | Élevé | Après validation KYC, le chauffeur change le véhicule ou les catégories sans nouvelle vérification. | Verrou chauffeur, réouverture Ops, indisponibilité et nouvelle vérification ; scénarios JWT `vehicle-review` réussis. Le parcours physique/admin reste à valider. |
| A16 | Moyen | Une commande hors réseau reste en pause et se rejoue longtemps après le geste. | Mutations sans pause/rejeu automatique, confirmation serveur obligatoire ; régression de déconnexion/reconnexion. |
| A17 | Moyen | Un changement de compte réutilise données, cache ou file GPS du précédent. | Frontière de session et propriétaire explicite du cache/file ; tests de changement de compte et de tâche GPS. |
| A18 | Moyen | Un renouvellement de session hors réseau, un chargement incomplet ou une reprise laisse le suivi de course arrêté. | Conservation sur erreur temporaire seulement, purge locale 24 h, statut inconnu préservé et réarmement au premier plan ; tests ciblés réussis, conservation de points vérifiée sur APK signé ; la reprise automatique après panne reste ouverte en A20. |
| A19 | Moyen, corrigé au banc | Une commission calculée au centième est affichée au franc, créant un écart avec le règlement cash attendu. | Pas de 25 approuvé pour nouveaux prix, frais, commissions et parts chauffeur, égalités vers le haut ; migration appliquée, 89 assertions SQL et 119 tests API réussis, quatre fautes d’arrondi détectées. Les écritures passées sont conservées ; deux courses USB à 1 050 et commission unique de 150 vérifiées. Validation terrain encore requise. |
| A20 | Moyen, corrigé au banc | Après une panne API en arrière-plan, le suivi ne se remet à envoyer qu’au retour au premier plan. | Patch Expo versionné ; ancienne faute détectée par test de contrat, puis reprise sans retour au premier plan validée sur Pixel et sur OPPO écran éteint. GPS réel et endurance terrain restent à valider. |
| A21 | Moyen, corrigé au banc | Sur OPPO, le clavier du PIN masque les commandes après le démarrage, malgré sa fermeture au démontage validée sur Pixel. | Reproduit sur APK signé ; fermer le clavier avant l’application du statut, test de cet ordre et conservation de la saisie sur refus. Nouvel APK installé : parcours PIN et image confirment la disparition du clavier sur OPPO, sans fermeture manuelle. |

Ces corrections ont des preuves ciblées ; leur fermeture finale exige la suite
complète après toutes les migrations, les essais des APK finaux et la revue
indépendante. Les fichiers de tests font autorité sur les cas effectivement
couverts ; cette table ne prétend pas à une couverture exhaustive.

## Vérifier que les tests détectent une régression

`tools/audit/check-mutations.mjs` injecte successivement vingt et une fautes dans le seul
conteneur `supabase_db_teko-alpha-audit` et restaure chaque garde dans un
`finally`. Il exige une vraie assertion échouée ; une panne de Docker ou de
connexion ne compte pas comme une détection. Les vingt et une fautes suivantes ont été
détectées : écriture directe, transition interne exposée, GPS usurpé, PIN
accessible au chauffeur, prix final falsifié, validation Finance accordée à Ops,
lecture KYC par table et par fichier accordée à Finance, compteur PIN non
persistant, invitation chauffeur contournée, ancienne position GPS rendue
visible, prise de la file push ouverte au client, offre expirée encore envoyable,
ancien devis accepté après déplacement du départ et repère imposé malgré le
choix de conserver le GPS, ainsi que les arrondis manquants du devis, de la
commission, des frais et de la part chauffeur, puis le pas de 25 des nouveaux
justificatifs et l’absence d’arrondi préalable à deux décimales. Résultats détaillés locaux :
`.local/alpha-evidence/mutations/results.json` et journaux voisins.

Le passage sous Vitest 4.1.11 détecte de nouveau les treize fautes et restaure
les gardes. Un taux de couverture élevé, seul, ne démontre pas la protection
d’une règle métier.

## Dépendances

Next.js 16.3.8, MapLibre GL JS 6.4.1, Vitest/coverage 4.1.11 et Vite
6.4.3 sont installés. Le scan complet après migration ne signale plus d'avis
critique : **deux élevés et deux modérés** subsistent, à qualifier et à maintenir
sous surveillance dans le dossier de revue indépendante.

| Dépendance / note du scanner | Chemin et condition d'exploitation | Portée constatée pour l'alpha Android |
|---|---|---|
| node-forge / élevé | Expo CLI, lecture de certificats de signature iOS ; avis sur la vérification RSA PKCS#1 v1.5. | Absence des bundles Android contrôlée ; chemin iOS non exécuté par le build Android. Pas de correctif publié dans l'avis consulté ; revue iOS nécessaire avant cette cible. |
| braces / élevé | Metro → micromatch ; motif glob profondément imbriqué contrôlé par un attaquant. | Outil de construction, absent des bundles ; les motifs proviennent de la configuration du dépôt, aucun motif usager ne lui est transmis. Ne pas compiler de modifications non revues avec les secrets du build. Avis sans correctif publié. |
| uuid / modéré | xcode → uuid 7, dépassement de tampon fourni aux fonctions v3/v5/v6. | xcode utilise v4 sans tampon dans le chemin inspecté ; absent du bundle (le module UUID propre à Expo est distinct). Ne pas imposer une version majeure à xcode sans validation du fournisseur. |
| sprintf-js / modéré | Jest/Istanbul → argparse ; précision de format non bornée. | Outil de test absent des bundles, sans format fourni par un utilisateur de Teko. Avis sans correctif publié. |

Cette qualification décrit les chemins et prérequis observés ; elle n'est pas
une acceptation automatique des risques. Les avis restent consignés, avec
réévaluation avant changement du périmètre, de la chaîne de build ou de cible.
Sources : [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv),
[braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
[uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq),
[sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).

`decode-uri-component` 0.5.0 corrige le décodeur embarqué. Son passage à ESM
rendait `query-string` 7 incompatible (`decodeComponent is not a function`) :
un petit patch versionné adapte l'import CommonJS sans remplacer le parseur.
`tools/audit/check-links.mjs` exerce le module réellement résolu par Expo Router,
conserve accents/tableaux et borne quatre paramètres malformés volumineux à
cinq secondes dans un worker isolé, limité à 128 Mio de heap. Le contrôle iOS sur appareil reste ouvert.
La migration Vitest conserve les seuils ; les branches manquantes ont reçu des
tests, notamment erreurs de lecture, absence de compteurs et échec d'upload KYC.

## Conditions de sortie encore ouvertes

- Rejouer l’installation complète des migrations sur base jetable et prouver
  une restauration incluant les fichiers privés, pas seulement les lignes SQL.
- Terminer les essais adversariaux et les contrôles CI sur l’état final.
- Vérifier sur les deux téléphones les parcours signés, l’écran éteint, les
  pertes réseau, le refus de permission et les performances de l’OPPO A15.
- Terminer les essais push écran éteint/reprise, puis choisir le SMS après devis
  et essais Airtel/Moov ; Firebase et les identifiants FCM v1 sont configurés.
- Valider sur place GPS réel, itinéraires, tarifs et couverture de la zone.
- Désigner les responsables Finance/SOS, leurs horaires et les procédures de
  prise en charge ; sauvegarder la clé alpha hors de la machine de travail.
- Réaliser la revue indépendante et traiter tout constat critique ou élevé.

Les APK du banc USB portent un identifiant alpha, une signature dédiée et un
bandeau « GPS fictif ». Leurs essais ne valent pas validation GPS terrain.

## Dernières preuves locales disponibles

- Installation neuve réussie jusqu’à `20261018134000`. Les 74 tests pgTAP
  passaient avant les ajouts push ; leur nouveau passage sur cet état est réussi.
- 104 tests API réussis, dont deux intégrations réelles ; couverture 100 % lignes,
  95,38 % branches et 100 % fonctions, avec Vitest 4.1.11.
- 111 scénarios JWT backend réussis sur 19 fichiers ; 129 tests de l’app
  passager et 102 tests chauffeur, 79 tests console et 43 tests Deno réussis.
- 23 tests ciblés GPS/configuration/parcours
  chauffeur et neuf tests du parcours solde/règlement réussis.
- Treize mutations de sécurité détectées et gardes restaurées.
- Restauration SQL dans une base distincte : 36 tables sous RLS, comptages
  conservés et ACL critique préservée. 62 fichiers Storage restaurés avec
  SHA-256 identiques. Huit tâches planifiées capturées sans activation dans
  la copie. Un nouvel hôte complet et sa reprise HTTP restent à éprouver.
- Le scan complet après migration signale zéro critique, deux avis élevés et
  deux modérés ; portée des quatre avis décrite ci-dessus.

Les journaux sont dans `/tmp/teko-alpha-*.log`. Ce répertoire est local et
éphémère ; archiver des preuves expurgées avec le build effectivement testé
avant de préparer la revue indépendante.

## Complément push et conservation

Les tests JWT vérifient le transfert exclusif d'un jeton Expo entre comptes,
le retrait limité à la session courante, le refus d'un propriétaire imposé,
les écritures directes interdites, la confidentialité de la file, la prise
concurrente et les bornes d'expiration/tentatives. Les tests purs vérifient
le retrait des données sensibles, les erreurs/tickets/reçus Expo et le refus
d'un mock non explicitement autorisé. Un envoi réel via le worker de production
et Expo a donné un ticket, puis un reçu FCM « ok » ; la notification a également
été constatée dans le volet Android de l'OPPO. La validation chauffeur et écran
éteint ainsi que les restrictions batterie restent ouvertes.

Décision du porteur : conserver les pièces KYC après la désactivation du compte
en attendant le délai fixé par le conseil juridique. Cette attente ne vaut
pas validation d'une conservation illimitée ni conformité juridique acquise.

Les suites mobiles se terminent proprement après correction des timers de GC
dans leurs enveloppes de test. Les 111 scénarios backend passent aussi avec
Vitest 4.1.11. Les cinq tests d'intégration carte et les deux tests d'intégration
API ont réussi contre le banc réel. Un premier échec Realtime a été observé ;
le test attend désormais l'accusé réel de souscription Postgres, et non le
seul état joined du WebSocket. Deux répétitions puis la suite complète ont
réussi. L'app chauffeur relit les offres à la souscription/reconnexion ; un test
couvre l'offre arrivée entre la lecture initiale et l'ouverture du canal.
Les parcours physiques restent à valider.

L'audit complet incluant les outils de développement signale davantage d'avis
que le scan production initial : trois critiques, cinq élevés, dix modérés
avant migration des outils de test. Il ne faut pas comparer ces deux périmètres
comme une évolution du risque mobile. Migration Vitest/coverage et correctif du
décodeur URI approuvés par le porteur ; contrôle final encore à produire.

## Parcours sans GPS et zones tactiles

Décision confirmée : un passager peut choisir le départ par recherche de repère,
même lorsque le GPS est autorisé. Sans GPS, le départ reste vide jusqu'à ce choix ;
aucune position de Libreville n'est inventée dans le build terrain. Le retour
à l'accueil conserve le départ manuel. Cinq scénarios de recherche et trois
contrôles GPS/départ couvrent ces comportements. Le panneau d'accueil réserve
la zone de navigation Android après observation d'une recherche sous cette barre
sur l'OPPO. La confirmation visuelle sur l'APK reconstruit reste à produire.

## Reprise après redémarrage du poste — 19 octobre 2026

Le porteur signale des redémarrages liés à la mémoire. Après redémarrage,
la lecture mémoire indique 28 Gio de RAM totale, environ 12 Gio utilisés,
15–16 Gio disponibles et aucun swap utilisé. La cause OOM n'a pas été vérifiée
par les journaux système : leur lecture et celle des processus hôte sont
bloquées par l'indisponibilité du service automatique d'approbation.

Le relevé Docker fourni par le porteur montre douze conteneurs Structura
relancés, environ 1,8 Gio de RAM au total ; analytics Structura affiche 68 % CPU
sur ce relevé ponctuel. Euphoria n'apparaît pas en exécution. Les arrêts et la
modification de la politique de redémarrage Structura n'ont pas été exécutés.
Le porteur demande ensuite explicitement de **laisser Structura** : conserver
ses conteneurs et leur politique de redémarrage. Conserver aussi les deux
projets Teko et Martin/Valhalla.

Le harnais de build interdit désormais deux constructions Android simultanées
par verrou flock, utilise Gradle sans daemon persistant et limite Metro à deux
workers. Turbo lance au maximum deux suites ; les runners Vitest sont bornés
à deux workers. Ces protections ne prouvent pas encore une consommation de
pointe : elle reste à mesurer pendant une reconstruction. Un relevé hôte a pu
être obtenu ensuite : ChatGPT, Claude Desktop, Chrome et deux processus BEAM
figurent parmi les principaux consommateurs individuels. Ce relevé ne prouve
ni fuite mémoire ni cause du redémarrage ; aucune application de bureau n'a
été fermée.

Les sources, APK, identifiants locaux et captures `.local/alpha-evidence`
ont survécu ; les journaux et le banc de travail temporaires de `/tmp` ont été
perdus. Reconstituer le banc sans effacer les volumes, renouveler ses secrets
webhook perdus et archiver les nouvelles preuves dans un emplacement persistant.
Les secrets FCM et Expo persistés sont toujours en mode 0600 hors Git.

État applicatif à reprendre : le départ manuel et le panneau tactile ont été
validés sur l'OPPO. Un push par application a été reçu (chauffeur en veille),
avec reçus FCM ok ; les envois sans jeton serveur Expo sont refusés. La course
USB `8a024e23-3f79-4c29-bb64-24719d95fb82` a été acceptée puis marquée arrivée ;
un mauvais PIN a été refusé. Son démarrage et sa clôture n'ont pas été confirmés.
Le premier scénario Maestro avait cliqué après expiration en attendant la fin
de l'animation ; le second a accepté avant expiration après correction du délai
d'automatisation. Aucun délai métier n'a été augmenté pour faire passer le test.

Décision suivante du porteur : conserver les suggestions de rencontre et exiger
un nouveau devis confirmé si le départ change. L'implémentation et la migration
`20261018135000_alpha_pickup_quote.sql` sont en cours ; cette migration a été
appliquée au seul banc alpha sans reset. Les preuves complètes citées plus haut précèdent ces changements
et ne constituent pas une validation du nouvel état. Il reste à terminer les
tests JWT des deux choix, régénérer les types, reconstruire séquentiellement les
APK et reprendre les parcours physiques. Le contrôle automatique a fonctionné
pour cette migration, puis a refusé d'exécuter la régénération et les tests JWT
par manque de capacité du modèle de revue ; il ne s'agit pas d'un avis de
dangerosité sur ces commandes.

La suite passager courante réussit : **136 tests sur 38 suites**. Le test de
recherche sans GPS avait dépassé cinq secondes sous charge ; il utilise
désormais une horloge contrôlée pour le délai anti-rebond, sans relever le
timeout. Les cinq scénarios de recherche puis la suite complète ont réussi.
Journaux persistants : `.local/alpha-evidence/search-clock.log` et
`.local/alpha-evidence/client-pickup-full.log`.

La faute UI « commander dès réception du nouveau devis, avant confirmation »
a été injectée dans une copie isolée du hook. Le test a échoué sur l'assertion
attendue : zéro commande attendu, une reçue. La source applicative a conservé
son SHA-256 et la copie a été supprimée. Preuve :
`.local/alpha-evidence/pickup-ui-mutation/result.json`. Deux nouvelles fautes
SQL sont préparées dans le harnais (ancien devis accepté après déplacement,
repère imposé au GPS) mais **n'ont pas encore été exécutées**. Les treize
détéctions antérieures ne doivent pas être présentées comme quinze.

Le workflow monorepo exécute désormais séparément types, tests et builds
avec les limites des scripts racine ; il inclut le contrôle des liens
malformés et la faute UI. Cette modification de CI a été vérifiée localement,
mais aucun passage sur GitHub Actions n'a encore été observé. Le lint complet
réussit sur 579 fichiers et le typecheck sur 11 projets ; le contrat du nouveau
RPC reste provisoirement aligné à la main tant que la régénération est bloquée.
Après retrait de la copie fautive, les douze scénarios recherche/rencontre
réussissent avec la source normale. Les secrets du banc sont désormais
recopiés en mode 0600 dans `.local/alpha-services/bench-functions.env`, hors Git,
puis restaurés par la préparation si `/tmp` disparaît.

## Revalidation après changement de modèle — 19 octobre 2026

L'inventaire Docker Teko a répondu, mais les tentatives ADB et la régénération
des types ont encore rencontré un refus par saturation ou expiration du
service automatique d'approbation, avant exécution. Structura est conservé.

Le premier passage complet des tests locaux a révélé une incohérence
d'installation : React DOM 19.2.3 chargeait une copie imbriquée de React
19.2.8. Le manifeste racine fixait déjà React 19.2.3, mais cette dépendance
manquait dans l'importeur racine du lockfile. Le lockfile a été réconcilié,
puis installé hors réseau avec `--frozen-lockfile --ignore-scripts` ; React
DOM résout maintenant React 19.2.3. Les versions applicatives retenues n'ont
pas été relevées pour contourner l'échec.

Résultat suivant : **501 tests locaux réussis, neuf tâches exécutées sans
cache Turbo** (136 passager, 102 chauffeur, 79 console, 102 API, 47 carte,
20 métier, cinq i18n, trois UI, sept télémétrie). Sept tests d'intégration
sont explicitement ignorés hors du banc ; ils ne constituent pas des
validations backend. Journal : `.local/alpha-evidence/workspace-reconciled-tests.log`.
Le contrôle des liens malformés passe aussi après réinstallation.

Le chemin du preset TypeScript racine a été corrigé. Les workflows archivent
explicitement les preuves de mutation dans leur nouvel emplacement `.local`,
avec inclusion des fichiers cachés limitée aux chemins de preuves ; aucun
répertoire de secrets n'est inclus. Les changements de lockfile, de types,
de patches et du harnais déclenchent désormais les intégrations carte/API.
Les trois YAML sont lisibles ; leur exécution distante reste à observer.

Les **quatre nouveaux tests JWT de `pickup-quote.test.ts` ont ensuite réussi**
sur le banc migré, sous Vitest 4.1.11. Ils couvrent le maintien exact du départ,
le refus d'un ancien devis après un déplacement d'environ deux mètres, le prix
du nouveau devis, son rejeu sans doublon, les repères incohérents, le vol par
un autre passager invité et la révocation d'invitation. Journal persistant :
`.local/alpha-evidence/pickup-jwt.log`. Cela ne remplace pas le nouveau passage
complet des autres tests backend ni l'exécution des deux mutations SQL ajoutées.

Les onze tâches TypeScript réussissent sans cache Turbo ; le lint passe sur
579 fichiers. Le build admin courant échoue dans le sandbox lorsque Turbopack
tente d'ouvrir un port interne pour traiter le CSS : `Operation not permitted`.
Sa validation sur l'hôte reste ouverte. Les fragments Maestro ajoutés dans
`tools/audit/maestro` ont une syntaxe YAML valide ; leurs assertions sur les
téléphones et les effets financiers restent à exécuter. Aucun nouvel APK n'a
été présenté comme validé sur cette reprise.

Le script `tools/audit/validate-bench.sh` regroupe désormais la reprise des
fonctions simulées, la génération du contrat et les trois niveaux de tests
backend, sans reset. Sa syntaxe shell a été vérifiée. **Son exécution a été
refusée avant démarrage par saturation du service automatique d'approbation** ;
il n'apporte donc encore aucune preuve supplémentaire de validation. ADB et
la compilation hôte restent à reprendre lorsque ce service répondra.

## Accès rétabli et validation backend complète — 19 octobre 2026

Après changement du mode d'exécution, ADB détecte de nouveau l'OPPO A15 et le
Pixel 3. Les reverses des ports 58321, 3333 et 8002 ont été rétablis sur les
deux appareils. Structura et les deux projets Teko sont conservés.

`bash tools/audit/validate-bench.sh` a terminé avec succès : 74 assertions
pgTAP sur dix fichiers, 115 tests JWT/HTTP sur vingt fichiers, puis quinze
fautes détectées et restaurées. Le refus anonyme des fonctions a été vérifié
et le runtime lancé par le script a été arrêté à la fin. Le banc n'a pas été
réinitialisé. Le typecheck des onze projets passe avec les types régénérés.

Preuves persistantes : `validation-resume.log`, `database-validation.log`,
`backend-validation.log`, `mutations-validation.log`, `mutations/results.json`
et `typecheck-generated-contract.log`, sous `.local/alpha-evidence`.

## Continuité GPS après interruption — 19 octobre 2026

Trois défauts de continuité ont été reproduits par des tests avant correction :
une erreur temporaire de renouvellement de session arrêtait le service comme
une déconnexion ; le retour au premier plan ne réarmait pas le suivi de course ;
un statut encore inconnu pendant le chargement supprimait la course persistée.
Le risque est classé **moyen** : perte de continuité opérationnelle du suivi,
sans démonstration de fuite ni de contournement serveur. Sur l’ancien APK, le
service n’était plus au premier plan et les points avaient cessé d’arriver ;
la cause exacte de cet arrêt physique n’est pas établie par ces seuls tests.

Le correctif distingue les erreurs de transport temporaires des sessions
absentes, révoquées ou appartenant à un autre compte. Seules les premières
conservent le suivi déjà autorisé et la mesure locale, sans envoi réseau.
La purge des points âgés de 24 h fonctionne aussi sur ce chemin hors réseau.
Un statut inconnu préserve l’état et le retour au premier plan réarme le
service. Dix tests ciblés passent ; les 107 tests API réussissent avec le
seuil de couverture satisfait. La validation sur les nouveaux APK reste à faire.

Preuves locales : `gps-refresh-before.log`, `gps-resume-before.log`,
`gps-fixes-after.log` et `api-gps-identity.log`, sous `.local/alpha-evidence`.

Le build passager précédent a terminé avec succès. La reconstruction
chauffeur inclut maintenant ces correctifs ; aucun résultat de l’ancien APK
ne doit être attribué à ce nouveau build. Les builds natifs restent exclusifs,
avec deux workers Gradle et un tas Java limité à 3 Go.

Les 109 tests chauffeur passent après correction, ainsi que le lint complet
sur 583 fichiers et le typecheck des onze projets. Journaux :
`driver-gps-full.log`, `lint-gps-fixes.log`, `typecheck-gps-fixes.log`.

## Turbopack rétabli — 19 octobre 2026

Le porteur a choisi de conserver Turbopack. Dans la session avec accès
rétabli, le build instrumenté a terminé avec succès ; deux ouvertures de
ports TCP sur `127.0.0.1:0` ont été observées sans refus. Le build normal,
sans instrumentation, a ensuite terminé avec succès. Aucun remplacement par
Webpack ni modification des scripts de compilation n’a été effectué.
L’ancien refus n’est plus reproduit ; cela ne démontre pas une cause précise
dans le compilateur. Preuves : `turbopack-network.strace`,
`turbopack-network-build.log`, `admin-turbopack-confirmed.log`.

Un build Turbopack configuré pour le banc isolé a aussi réussi ; la console
est servie sur l’interface locale seule, port 3300. L’ouverture par l’outil
navigateur a été refusée par sa politique de sécurité. Les interactions
visuelles et la carte web restent donc non validées dans cette reprise ; aucun
autre moyen d’accès navigateur n’a été utilisé pour contourner ce refus.

## Clôture de la course antérieure sur appareils

La course synthétique `8a024e23-3f79-4c29-bb64-24719d95fb82`, restée à
l’arrivée avant reprise, a démarré après saisie du PIN lu sur le seul écran
passager. Le fragment Maestro `driver-complete-cash.yaml` a ensuite réussi
sur le Pixel : clôture, montant à encaisser, nouveau solde, confirmation et
retour à la disponibilité. Le passager OPPO a confirmé le parcours espèces,
envoyé cinq étoiles et affiché le reçu.

Contrôle SQL : prix estimé et final 1 203,00 FCFA ; une seule ligne
`commission_due` à −180,45 FCFA (15 %), solde après écriture −180,45 FCFA.
Preuves : `maestro-old-ride-cash.log`, répertoire `maestro-resume`,
`old-ride-cash-ledger.txt`. Il s’agit des APK installés avant reconstruction,
pas d’une preuve des nouveaux correctifs GPS ou du nouveau départ/devis.

## Nouveau parcours passager et relevé OPPO

L’APK passager reconstruit a été vérifié (signature alpha, identité distincte,
mode release, permissions superflues absentes et aucun des secrets privés de
contrôle incorporé), puis installé en conservant la session. SHA-256 :
`a24549844e7f8beb4bfb296e1b13377a79ff69fb44d3c13ec115e1a7f8a8f4e8`.
Preuves : `client-apk-verified.json`, `client-apk-install.log`.

Pour déplacer effectivement le départ dans le test, un repère **synthétique**
« Point de rencontre · banc USB » a été ajouté uniquement sur le banc isolé.
Après sélection, l’écran présente un nouveau prix ferme de 1 052 FCFA contre
1 002 FCFA au départ initial ; aucune course active n’existe avant la seconde
confirmation. Le parcours reste en attente de l’assemblage du nouvel APK
chauffeur. Preuves : `pickup-requote-ui.txt`, `pickup-new-price-final.png`.

Premier relevé exploratoire OPPO sur ce build, comprenant démarrage et
recherche : PSS 217 165 Kio (~212 Mio), 154 images rendues, 33 lentes selon
`dumpsys gfxinfo` (21,43 %), médiane 11 ms et percentile 95 à 150 ms. Ce petit
échantillon mêle démarrage, transitions et carte ; il **ne valide pas un budget
de fluidité** ni le rendu MapLibre complet. Il justifie une mesure contrôlée
par scénario avant ouverture. Fichiers : `oppo-client-memory-new.txt` et
`oppo-client-gfx-new.txt`.

Une indisponibilité physique a aussi été observée : le runtime Edge du banc
s’était arrêté, tandis qu’ADB et la base répondaient. Il a été relancé avec
vérification du refus anonyme ; les devis ont ensuite été calculés. L’app
affichait à tort « Pas de connexion » pour cette panne de service. Un choix
de message distinct a été soumis au porteur ; ce comportement n’est pas
présenté comme corrigé.

## Réessai des tarifs et nouveaux APK — suite du 19 octobre

Le porteur a validé le message distinct. Le code affiche désormais « Tarifs
temporairement indisponibles » pour une panne de service ; un état réseau
explicitement déconnecté conserve l’écran hors ligne. Les devis échoués ne
sont plus relancés automatiquement à la reconnexion ou au retour au premier
plan ; le réessai reste accessible sans commander de course. Les 142 tests
passager et les onze vérifications de types passent. Les six nouveaux cas
échouaient avant correction (`quote-errors-before.log`), puis dix tests ciblés
réussissent (`quote-errors-after.log`).

La faute « réactiver les devis à la reconnexion » est injectée dans une copie
isolée, chargée uniquement par Jest. Elle provoque précisément six appels au
lieu des trois attendus ; les quatre autres cas de la suite restent verts.
Le SHA des sources normales est préservé et la copie supprimée. Preuves :
`estimates-ui-mutation/result.json` et `run.log`. Le nouveau message exige
encore la reconstruction et l’essai de l’APK passager.

L’assemblage chauffeur a finalement réussi avec le JDK 17 portable ; le script
le sélectionne explicitement pour éviter que la préférence globale JDK 21
du poste ne le remplace. Les étapes longues peuvent être séparées sans
construire deux applications simultanément. Le contrôle APK vérifie aussi que
son bundle correspond au bundle généré et que les sources des correctifs GPS
dans la carte de sources correspondent au dépôt.

APK chauffeur installé : SHA-256
`4d6a08600023833936e4fca7ead75452e5ffe00e9fc86911536c344ea3211ba7`,
signature alpha attendue, aucun secret privé de contrôle incorporé. La session
est conservée et le service `LocationTaskService` est observé avec
`isForeground=true`. Cela ne prouve pas encore le suivi écran éteint ni hors
réseau. Preuves : `driver-assemble-resume.log`, `driver-apk-verified.json`,
`driver-apk-install.log`, `driver-new-ui.txt`.

Le runtime Edge est désormais lancé par `serve-bench.mjs`, détaché du terminal,
avec état/arrêt limités au PID et à l’heure de création enregistrés. Son refus
anonyme a été vérifié après lancement. Structura et les deux stacks Teko restent
conservés. Les relevés hôte/Docker pendant compilation sont dans
`host-memory-during-build.txt`, `host-processes-during-build.txt`,
`host-memory-pressure-during-build.txt`, `docker-resources-during-build.txt`.

Sur le nouveau chauffeur Pixel, l’application a été envoyée à l’accueil
Android, écran allumé. La présence serveur progresse de 05:53:24 à 05:55:24
UTC et le service reste au premier plan. C’est une preuve de battement en
arrière-plan, **pas** un test de points de course, de réseau coupé ou d’écran
verrouillé. Fichiers : `driver-background-presence-before.txt`,
`driver-background-presence-after.txt`, `driver-background-activity.txt`,
`driver-background-service.txt`.

Un nouvel envoi Expo réel vers ce chauffeur obtient un ticket puis un reçu
`ok` de FCM. Un enregistrement de notification de cette application est visible
dans Android, mais son contenu n’a pas permis de le corréler à l’identifiant
de cet envoi ; l’affichage précis n’est donc pas présenté comme confirmé.
Preuves : `driver-new-push.jsonl`, `driver-new-push-receipt.jsonl`,
`driver-new-notification-records.txt`, `driver-new-notification-match.json`.

Le reçu de la course antérieure a révélé un point métier encore à arbitrer :
180,45 FCFA de commission comptable contre 180 FCFA affichés. La règle pour
les nouvelles courses (arrondi de chaque commission ou au seul règlement avec
écart tracé) a été soumise au porteur. Aucun changement financier n’est appliqué
sans cette réponse ; les écritures antérieures restent conservées.

## Arrondis au pas de 25 et APK passager final — 19 octobre 2026

Le porteur a retenu le multiple de 25 FCFA le plus proche pour les nouveaux
prix, frais, commissions et parts chauffeur sur frais encaissés. Les égalités
vont vers le haut. La migration `20261019100000_alpha_cash_rounding.sql`
modifie les calculs serveur sans recalculer les devis, créances ni écritures
déjà enregistrés. Le minimum tarifaire reste respecté. Le digest des
48 écritures existantes est identique avant/après migration
(`ledger-before-rounding-migration.txt`, `ledger-after-rounding-migration.txt`).

Les quinze nouvelles assertions échouaient avant correction, puis les
89 assertions SQL passent sur onze fichiers. Elles vérifient prix, minimum,
commissions proportionnelle/fixe, égalités, prévision et création de frais,
part chauffeur et absence d’accès usager au helper privé. Preuves :
`cash-rounding-all-before.log`, `cash-rounding-sql-after.log`.
La suite complète réussit : 89 assertions SQL, 119 tests API, puis 19 fautes
injectées détectées et protections restaurées (`validation-rounding.log`,
`database-validation.log`, `backend-validation.log`, `mutations-validation.log`).
Les six attentes historiques de commission à 240 pour une course de 1 600 ont
été remplacées par des montants explicites : commission 250, net 1 350 ; la
première exécution conserve ces échecs dans
`backend-rounding-legacy-expectations.log`. Le pas applicable aux justificatifs
saisis par Ops reste à
arbitrer ; leur montant réel n’est pas arrondi automatiquement.

Le nouvel APK passager est construit et installé sur l’OPPO. SHA-256 :
`6c6f6174a5bae9d87ccfbf3437ef470b833dcb3e39fcbe5557e4130aa7f03298`.
Signature alpha, provenance des sources de correction et absence des secrets
privés de contrôle vérifiées dans les 1 346 fichiers de l’archive
(`client-apk-verified.json`). Avec le runtime Edge délibérément arrêté,
l’OPPO affiche « Tarifs temporairement indisponibles » et le bouton de
réessai manuel (`service-outage-new-ui.txt`). La distinction est donc observée
sur l’APK signé ; la reprise complète et le nouveau parcours financier
restent à exécuter.

## Reprise physique avec le pas de 25 — 19 octobre 2026

Le retour du runtime ne déclenche pas de nouveau devis ni de course sur le
passager : dix devis, dernier à 05:42:37 UTC, et zéro course active avant le
réessai (`service-restart-no-auto-request.txt`). Le bouton manuel permet de
retrouver les catégories. L’OPPO affiche 1 000 FCFA au départ initial, puis
1 050 FCFA pour le repère synthétique ; il exige une seconde confirmation.
À cet instant, zéro course active (`rounded-pickup-before-confirmation.txt`,
`rounded-pickup-price-confirmation.txt`, `rounded-pickup-before-order.png`).

La clôture globale du banc a suspendu le chauffeur USB pour son ancienne dette
de 180,45. La reprise emploie un dossier **synthétique** de règlement cash de
200, préparé avec le JWT Ops et approuvé avec le JWT Finance, avec fichier
de test privé. Aucun encaissement réel n’est revendiqué. Le chauffeur est
réactivé et le solde devient 19,55 ; ce reliquat vient de l’ancienne écriture
conservée, sans réécriture de l’historique (`usb-legacy-settlement.log`).
Ce cas ne tranche pas la règle encore ouverte des justificatifs hors pas de 25.

Course physique de banc créée après confirmation :
`46c86c58-4038-4eac-ba4a-e1c97394173e`, prix ferme 1 050, chauffeur accepté
puis arrivé par Maestro, PIN lu dans l’app passager et démarrage confirmé
par le serveur. Le test Maestro de démarrage échoue ensuite car le clavier
reste affiché et masque le bouton de fin ; capture
`rounded-driver-start-screen.png`. Ce défaut est distinct de la transition
serveur, qui a réussi.

Le test d’écran reproduit l’absence de fermeture du clavier (une régression
rouge, huit autres cas verts), puis la correction ferme le clavier quand le
panneau PIN disparaît, en le conservant pour un PIN refusé. Les **110 tests
chauffeur** passent (`pin-keyboard-before.log`, `driver-keyboard-full.log`).
La reconstruction et l’essai physique de cette dernière correction sont
en cours. Le nouvel APK devra être identifié par son propre SHA.

Le harnais automatique refuse aussi de remplacer un runtime déjà actif, avant
préparation et avant tout test (`validation-active-runtime-refused.log`).
Cela évite de lancer les scénarios simulés avec le fournisseur Expo réel des
téléphones. Le mode Expo a été rétabli seulement après les mutations.

Le premier retrait du relais ADB ne constituait pas une coupure démontrée :
un nouveau point était encore reçu via une connexion déjà établie. La
reconnexion du transport USB a supprimé ces connexions et les trois relais.
Le téléphone chauffeur est resté sur l’accueil Android, écran allumé, avec
service de localisation au premier plan. De 06:28:08 à 06:29:20 UTC, le nombre
de points serveur est resté à six, dernier échantillon à 06:27:49. Les relais
ont ensuite été rétablis explicitement ; la vidange de la file est à vérifier.
Cette mesure ne représente pas une coupure radio ni un écran verrouillé.

## Reprise GPS en arrière-plan — défaut reproduit

La première coupure récupère douze échantillons au retour au premier plan,
dont ceux enregistrés pendant la coupure (06:28:19, 06:28:49, 06:29:19).
Leurs identifiants sont uniques ; les horodatages d’origine sont conservés.
Cependant, aucun envoi ne reprend pendant les 84 secondes après restauration
du relais tant que l’app reste en arrière-plan.

Le second essai coupe uniquement la passerelle Kong du banc de 06:31:49 à
06:32:38 UTC, sans reconnexion USB. Le service GPS et les livraisons natives
continuent, mais le serveur reste à treize points jusqu’à 06:34:04, soit
86 secondes après restauration, écran allumé sur l’accueil Android. La remise
au premier plan rétablit l’envoi. Ce défaut A20 reste bloquant pour la
validation opérationnelle. Preuves `rounded-gps-gateway-*.txt`,
`rounded-gps-task-service.log`, `rounded-gps-recovered-samples.txt`.

La dépendance installée `expo-task-manager` 57.0.13 enregistre une tâche
headless dont la Promise se résout immédiatement. React Native marque alors
la tâche terminée ; le service natif Expo prévoit pourtant de la terminer
après les événements GPS en cours. Un essai isolé extrait l’enregistrement
réel et démontre cette terminaison immédiate ; le candidat garde la Promise
en attente, sous contrôle de la terminaison native. Résultat :
`task-lifetime-proof.json`, proposition `task-lifetime-candidate.txt`.
Il s’agit d’une piste étayée, **pas encore d’une correction physique prouvée**.
Le choix d’un patch local versionné a été soumis au porteur ; aucun patch
Expo n’est appliqué à ce stade.

## Course cash au nouveau prix — résultat

La course `46c86c58-4038-4eac-ba4a-e1c97394173e` est terminée : prix
estimé et final **1 050**, une seule écriture `commission_due` de **−150**.
Le solde passe de 19,55 à −130,45 ; les centimes sont exclusivement hérités
de la course antérieure, conservée. Le passager voit « Remettez 1 050 FCFA
au chauffeur ». Le flow Maestro chauffeur de clôture et retour accueil
réussit (`maestro-rounded-cash.log`, captures dans le dossier associé,
`rounded-passenger-payment.txt`, `rounded-ride-cash-check.json`).

L’APK chauffeur corrigeant le clavier est construit, vérifié et installé :
SHA-256 `b892013e4f68afd63458e530a8ea3727a4f66270d3a9b7b24c499330187a5f60`.
Signature alpha attendue, 1 346 fichiers inspectés, sources GPS et panneau PIN
comparées à la carte de sources, aucun secret privé de contrôle trouvé
(`driver-keyboard-apk-verified.json`, `driver-keyboard-apk-install.log`).
Le flow PIN de ce nouvel APK réussit sans fermeture manuelle du clavier :
`maestro-keyboard-start.log`, capture `keyboard-fix-device-success.png` et
état Android `mInputShown=false` (`keyboard-fix-ime-state.txt`). A20 n’est
pas corrigé par cette reconstruction.

L’OPPO passager en course utilise 246 700 Kio de PSS, avec 26 019 Kio de
swap PSS (`oppo-live-ride-memory.txt`). C’est une mesure ponctuelle sur le
scénario synthétique, sans budget validé ni preuve d’absence de fuite mémoire.
Le lint des 588 fichiers contrôlés passe ; les tests chauffeur sont à 110/110.

## Dernières vérifications de cette passe

Le départ manuel sur l’OPPO est sélectionné par recherche du repère synthétique
(`manual-origin-selected.txt`), puis la destination par recherche. Le prix
serveur est 1 050 FCFA. La nouvelle course de contrôle PIN est
`4cdaf76e-27e4-485e-ac76-f1e43e0b8ee7`. Le chauffeur accepte, arrive et
démarre avec le code lu au téléphone passager ; le flow Maestro attend le
bouton de fin sans appeler `hideKeyboard` ni envoyer de retour Android.
Le contrôle réussit et la capture montre le bouton entièrement accessible.

La première course conserve **22 échantillons, 22 identifiants distincts**,
dont trois mesures pendant la coupure USB et deux pendant l’arrêt de la
passerelle. Les deux pannes sont donc couvertes pour la conservation et
la reprise au premier plan (`gps-recovered-queue-check.json`). Elles ne
valident pas la reprise automatique en arrière-plan, ni le suivi écran éteint.
Les onze vérifications de types passent après la correction du clavier
(`typecheck-rounding-final.log`).

La seconde course se termine également sur le nouvel APK : prix final 1 050,
une écriture unique de commission −150, solde −280,45, puis retour accueil
chauffeur (`maestro-keyboard-cash.log`, `keyboard-check-final-ledger.txt`).
Les téléphones terminent sans course active ; le chauffeur est hors ligne,
sans présence ni service GPS au premier plan (`device-tests-final-state.txt`,
`driver-final-services.txt`). Un service natif lié subsiste avec
`startRequested=false` (`driver-final-service-details.txt`). Les trois relais ADB ont été restaurés.
Le runtime du banc reste disponible en mode Expo pour les prochains essais.
Structura et la cartographie Teko restent conservés.

## Dossiers de règlement et patch Expo approuvés — suite du 19 octobre

Le porteur impose le pas de 25 aux nouveaux dossiers cash **et** versement
externe, révisions incluses. La migration `20261019101000` contrôle le numeric
d’entrée avant coercition à deux décimales ; aucun justificatif n’est arrondi.
Trois tests API échouaient avant correction puis les six nouveaux cas passent :
240, 249,999 et 250,001 sont refusés ; 250 est transmis exactement ; une
révision refusée conserve preuve, référence et version ; un dossier historique
de 240 reste approuvable exactement. Les dossiers valides sont crédités une
seule fois, exclusivement après Finance. Preuves `receipt-step-before.log`,
`receipt-step-after.log` et `receipt-cash-step.test.ts`.

La suite complète est à **89 assertions SQL, 125 tests API, 21 fautes
injectées détectées** (`validation-receipt-step.log` et journaux associés).
Les deux nouvelles fautes suppriment le pas de 25 ou arrondissent l’entrée
avant contrôle ; elles sont détectées par de vraies assertions. La console
refuse aussi les montants invalides sans en modifier la preuve. Deux cas UI
échouaient avant correction, puis les 82 tests admin passent ; les cinq tests
finance sont rejoués après extraction du lecteur de formulaire. Le build
Turbopack réussit et les onze contrôles de types passent.

Le porteur autorise le patch local pnpm de `expo-task-manager` 57.0.13.
Le JavaScript livré et le source TypeScript laissent la Promise headless
attendre sa terminaison native. `check-task-lifetime.mjs` contrôle le code
installé et détecte l’ancienne terminaison immédiate sur une copie en mémoire,
sans modifier la dépendance ; l’enregistrement iOS reste inchangé. Ce test
de contrat est ajouté à la CI, dont l’exécution distante n’est pas observée.

Nouvel APK GPS : SHA-256
`efbc76d600f565719b69aaff1d7a35b8a38e6643552e915a4344d065376dec05`.
Signature alpha attendue, 1 346 entrées inspectées sans secrets privés de
contrôle ; le code Expo patché est aussi comparé à la carte de sources du
bundle réellement incorporé (`driver-gps-task-apk-verified.json`). Installé
sur Pixel et OPPO. Les essais de reprise automatique sont en cours ; A20
reste ouvert tant que les preuves physiques ne sont pas obtenues.

## Pixel : reprise GPS automatique démontrée avec le patch

Course `0736c1f6-0737-4b89-b2ff-f308871546bf` : devis HTTP puis commande
par le JWT du passager synthétique, acceptation/arrivée/PIN dans l’APK
chauffeur. Le prix de ce trajet synthétique est 1 425 FCFA.

La passerelle du seul banc est arrêtée de 12:30:30 à 12:31:40 UTC. Le
Pixel reste sur l’accueil Android, écran allumé ; les quatre points serveur
restent inchangés pendant la panne. Après remise en service, les livraisons
natives terminent normalement et le serveur possède huit points à 12:32:24,
sans retour de Teko au premier plan. Les logs situent la fin du premier
traitement réussi à 12:32:05.817, environ 25 secondes après restauration ;
cela ne constitue pas un engagement de délai terrain. Le contrôle ultérieur
compte dix échantillons uniques, dont trois enregistrés pendant la panne.

Preuves : `pixel-gps-patched-*.txt`,
`pixel-gps-patched-recovered-background.txt`,
`pixel-gps-patched-native-recovery.txt`,
`pixel-gps-task-recovery-check.json`. L’ancienne version avait échoué dans
ce même scénario, en attendant le retour au premier plan. La correction
physique est donc démontrée sur Pixel ; l’OPPO écran éteint reste à contrôler.

La réinstallation `pnpm install --frozen-lockfile --ignore-scripts` conserve
le hash du module corrigé (`expo-task-patch-frozen-install.log`,
`task-lifetime/results.json`). La passe workspace réussit : **523 tests** ;
les trois apps et le client API sont réexécutés, cinq packages purs inchangés
utilisent leur cache. Sept tests d’intégration sont explicitement sautés hors
banc ; les scénarios du backend ont leur exécution distincte de 125 tests.
Les onze contrôles de types et le build Turbopack restent verts.

## OPPO : fermeture du clavier avant transition

Le premier flow PIN sur l’OPPO échoue après démarrage serveur : le clavier
reste ouvert (`oppo-gps-start-progress.png`, `maestro-oppo-gps-start.log`).
La fermeture lors du démontage, suffisante sur Pixel, ne convient pas à
l’ordre de traitement du clavier de cet appareil. Ce résultat corrige donc
la portée de la validation précédente ; il est suivi en A21.

Le hook ferme désormais le clavier **avant** d’appliquer le statut qui retire
le champ PIN. Le retour explicite ferme aussi le clavier avant navigation ;
un code refusé laisse la saisie ouverte. Une nouvelle régression échoue avant
correction puis vérifie cet ordre, au lieu de compter seulement un appel à
`Keyboard.dismiss` (`pin-before-transition-red.log`). Les tests et une nouvelle
reconstruction sont en cours. Le premier parcours OPPO est terminé avec
fermeture manuelle du clavier ; il n’est pas présenté comme une validation
de ce correctif. Le test écran éteint sera effectué sur l’APK reconstruit.

La correction A21 est couverte par **112 tests chauffeur réussis**
(`driver-pin-transition-full.log`). Le test d’ordre vérifie une fermeture
avant le callback d’application de la course ; le test de refus confirme
l’absence de fermeture et d’application du statut. Ce contrôle complète la
régression d’écran, qui ne vérifiait auparavant que le nombre d’appels.

Une nouvelle restauration SQL + fichiers réussit après les deux migrations
financières : 37 tables sous RLS, 398 fichiers dont les hashes correspondent,
et huit fonctions protégées dont le corps et les ACL correspondent à la
source. Les neuf ordonnanceurs sont capturés sans être activés dans la copie
(`restore-receipt-step.log`). Cette preuve locale ne ferme pas la validation
de restauration HTTP complète sur un autre hôte.

## APK final de contrôle PIN sur OPPO

SHA-256 `2ec3385030f54087a1c5c52cf4589350c19735793d6565cf01d42704ef3e878d`.
La signature et les 1 346 entrées sont vérifiées ; la carte de sources est
comparée au module Expo corrigé, au worker GPS et au hook des actions PIN
(`driver-final-gps-apk-verified.json`). Installé sur les deux téléphones.

Sur OPPO, course `955cc717-ffed-42d4-acfb-f3a88301f8dc`, l’acceptation,
l’arrivée, la saisie du PIN et l’accès au bouton de fin réussissent. Le code
est lu avec le JWT passager et saisi par ADB dans le champ focalisé par
Maestro ; aucun retour ni `hideKeyboard` n’est envoyé. L’image prise après
l’animation montre la carte et le bouton entièrement visibles, et Android
indique `mInputShown=false` (`maestro-oppo-final-gps-start.log`,
`oppo-final-pin-keyboard-closed.png`, `oppo-final-pin-ime-state.txt`). A21
est corrigé et validé au banc.

Le Pixel est arrêté pendant le test OPPO, pour exclure un second émetteur
sous le même compte synthétique. L’OPPO dispose de la seule permission de
localisation pendant l’utilisation et du service au premier plan ; aucun
réglage global de batterie n’est neutralisé. Le test écran éteint commence
à 12:53:24 UTC. Mesure avant extinction : PSS 195 754 Kio et swap PSS
40 639 Kio (`oppo-final-gps-memory-awake.txt`) ; aucune conclusion sur la
stabilité de plusieurs heures n’en est déduite.

## OPPO écran éteint : conservation et reprise automatique validées

Le téléphone est mis en veille à 12:53:24 UTC, après vérification de la
fermeture du clavier. À 12:54:20, le serveur passe de deux à cinq points,
avec une mesure à 12:54:09 : le suivi continue donc après extinction. Android
confirme `mWakefulness=Asleep`, écran `OFF`, service de localisation au premier
plan ; le Pixel chauffeur est arrêté pour exclure un second émetteur.

La passerelle du banc est arrêtée à 12:54:54 et rétablie à 12:56:25. Les six
points présents avant panne restent inchangés pendant la coupure. À 12:57:13,
le serveur contient onze échantillons, onze identifiants **et onze heures de
mesure distinctes**, dont trois mesures pendant la panne. Aucun réveil ni
retour de Teko au premier plan n’est demandé avant ce contrôle ; Android
confirme encore l’écran éteint. Preuve validée :
`oppo-final-gps-recovery-check.json`, avec le SHA de l’APK final, et fichiers
`oppo-final-gps-*.txt`. Les tâches natives se terminent normalement
(`oppo-final-gps-native-recovery.txt`). A20 est corrigé et vérifié au banc.

Ces essais sont courts, en USB et avec coordonnées fictives signalées. Ils
ne remplacent pas le GPS réel, les réseaux Airtel/Moov et une session longue
sur batterie à Libreville. La validation Pixel utilise l’APK GPS précédent
`efbc76…` ; le dernier APK `2ec338…` ajoute la correction du clavier. Le module
Expo et le worker GPS sont identiques et leur provenance est vérifiée dans
les deux archives. Le test OPPO complet utilise bien `2ec338…`.

## État de fin de cette passe

Le dernier parcours OPPO termine la course et revient à l’accueil par Maestro
(`maestro-oppo-final-cash.log`). Prix final 1 425, une écriture de commission
−225 ; le solde de fixture devient −655,45, dont les centimes restent hérités
des écritures antérieures conservées. Le chauffeur est remis hors ligne :
zéro présence et zéro course active pour les comptes des téléphones
(`gps-final-device-state.txt`). Le service n’est plus au premier plan.

Lint : 592 fichiers contrôlés, sans erreur (`lint-gps-delivery.log`). Types :
onze tâches réussies après la dernière correction (`typecheck-gps-pin-final.log`).
Le runtime Edge et la passerelle du banc restent disponibles, avec refus
anonyme vérifié ; aucun autre projet Docker n’a été arrêté. A20 et A21 ont
leurs preuves locales, mais les critères terrain et la revue indépendante
restent bloquants pour l’ouverture.

## Reprise du banc après redémarrage — 22 octobre 2026

Docker répond et les conteneurs Supabase sont actifs, mais le répertoire
`/tmp/teko-alpha-bench` a disparu. `prepare-bench.mjs` recrée les copies de
sources et la configuration, en réutilisant les secrets conservés hors Git.
Aucun reset ni nouvel ensemencement n’est effectué ; la migration
`20261019101000` est déjà présente dans la base. Structura et les services
cartographiques Teko restent actifs.

La validation du banc réussit à nouveau : **89 tests SQL, 125 tests JWT/HTTP
et 21 fautes injectées détectées**, avec restauration des gardes par le
harnais. Le contrat JavaScript du correctif Expo Task Manager reste valide,
y compris la détection de sa version fautive. Les onze contrôles de types
réussissent depuis le cache Turbo ; ils ne constituent pas une nouvelle
compilation sans cache. Preuves locales : `retry-20261022-validation.log`,
`database-validation.log`, `backend-validation.log`, `mutations/results.json`
et `retry-20261022-typecheck.log`.

Après les validations simulées, le webhook du seul banc est reconfiguré,
le mode Expo est rétabli et le runtime détaché est relancé. Le contrôle de
disponibilité confirme le refus anonyme (`retry-20261022-ready.log`).
Les comptes des téléphones n’ont aucune course active ni présence chauffeur.
Le chauffeur synthétique est inactif après cette passe
(`retry-20261022-fixture-state.txt`) : sa remise en état pour un prochain
parcours doit suivre les opérations de fixture et le circuit Finance, sans
contourner directement les gardes en base.

Le poste dispose d’environ 16 Gio de mémoire disponible ; les moyennes de
pression mémoire à 10, 60 et 300 secondes sont nulles lors du contrôle.
Cela reste une mesure ponctuelle. ADB répond, mais aucun appareil n’est
présent lors du dernier relevé : l’OPPO est apparu brièvement entre deux
contrôles. Aucun nouveau parcours physique n’est donc validé dans cette
passe. Le relevé initial est conservé dans
`retry-20261022-environment.json` ; il capture cette présence transitoire.

## Téléphones reconnectés — 22 octobre 2026

Les deux téléphones sont reconnectés et leurs APK installés sont relus par
ADB : chauffeur `2ec338…`, passager `6c6f61…`, identiques aux archives déjà
vérifiées (`retry-20261022-device-apks.json`). Aucun remplacement d’APK ni
changement global de batterie n’est effectué. Les redirections USB du banc
et de la cartographie sont rétablies.

Le compte chauffeur synthétique est réactivé par un dossier Ops avec preuve
PNG de test, puis approbation par un vrai JWT Finance : référence
`USB-SYNTHETIQUE-REPRISE-20261022`, montant 1 000, solde −655,45 → 344,55.
Il n’y a aucun encaissement réel ; les centimes historiques ne sont pas
réécrits (`retry-20261022-settlement.log`).

Sur Pixel, la course `b2a29003-3ae1-41bd-b196-8c5920d6ef39` est commandée par
le JWT passager du harnais, puis acceptée, démarrée par PIN et terminée dans
l’APK final par Maestro. Le clavier se ferme sans retour manuel. Le parcours
cash réussit : prix 1 425 et une écriture de commission −225
(`retry-20261022-pixel-start.log`, `retry-20261022-pixel-cash.log`).

Pendant cette course, Teko reste en arrière-plan sur le lanceur Pixel, écran
allumé. La passerelle est complètement arrêtée à 19:02:03 UTC, puis relancée
à 19:03:10. À 19:03:48, sans retour au premier plan, six points, six
identifiants et six heures distinctes sont présents. Deux mesures sont
strictement comprises entre l’arrêt complet et la relance. Une troisième
appartient à l’intervalle plus large commençant à la demande d’arrêt ; les
deux fenêtres sont distinguées dans `retry-pixel-gps-state.json`.
Cette passe complète la preuve Pixel précédente avec le dernier APK final.

Sur OPPO, course `b6dc37c1-360d-4e84-854a-122b11ca782f`, le même parcours
d’acceptation et PIN réussit sans fermeture manuelle du clavier. Le chauffeur
Pixel est arrêté pour exclure un second émetteur sous le même compte.
L’application passager Pixel est connectée par l’OTP local de test et
retrouve automatiquement la course en cours et le tarif 1 425
(`retry-pixel-passenger-live.txt`, capture du même nom). Aucun SMS réel
n’est envoyé par ce parcours local.

L’OPPO est mis en veille après le démarrage. Android confirme écran `OFF`,
`Asleep` et service de localisation au premier plan. Le serveur passe de
deux à trois points après extinction. Pendant l’arrêt complet de la
passerelle, de 19:08:03 à 19:09:03 UTC, le compteur reste à trois. À
19:09:28, six points distincts sont reçus, dont deux mesures prises pendant
cette indisponibilité, sans réveil ni retour au premier plan. Le suivi se
poursuit ensuite ; le processus Android reste le même
(`retry-oppo-gps-state.json`, `retry-oppo-gps-native.txt`).

Le relevé final à 19:12:24 confirme **300 secondes de veille mesurée**,
toujours sans réveil : douze points, douze identifiants et douze heures de
mesure distinctes. L’assertion de durée et les contrôles d’unicité passent
dans `retry-oppo-gps-state.json`. L’OPPO est réveillé seulement après cette
preuve pour terminer la course.

Mémoire PSS chauffeur OPPO : 169 084 Kio avant veille, puis 137 127 Kio après
reprise ; swap PSS respectivement 45 789 et 53 023 Kio
(`retry-oppo-memory-before.txt`, `retry-oppo-memory-after-recovery.txt`).
Ces valeurs ponctuelles ne démontrent ni l’absence de fuite sur plusieurs
heures ni une autonomie acceptable. Le test reste en USB, avec positions
fictives et panne de la passerelle locale ; GPS réel, radio Airtel/Moov,
veille longue sur batterie et revue indépendante restent à valider.

La course OPPO est terminée par Maestro avec affichage du montant à encaisser
et retour à l’accueil (`retry-20261022-oppo-cash.log`). Le passager Pixel
passe par l’écran cash, ignore la note facultative et consulte le reçu de
1 425 FCFA, puis revient à l’accueil (`retry-pixel-passenger-receipt.txt`
et capture du même nom). Aucun écran Airtel n’est proposé dans ce parcours.

Le contrôle final affirme, pour chacune des deux courses : statut terminé,
prix final 1 425, exactement une commission −225. Le solde synthétique est
−105,45 après ces deux nouvelles commissions ; ses centimes historiques
restent conservés. Les comptes des téléphones n’ont aucune course active ni
présence chauffeur. Le service OPPO n’est plus au premier plan et indique
`startRequested=false` après mise hors ligne ; le pilote Pixel reste arrêté
(`retry-20261022-final-state.json`, `retry-oppo-offline-services.txt`).
La passerelle et le runtime Edge du banc restent disponibles ; aucun autre
projet Docker n’a été arrêté pour cette passe.
