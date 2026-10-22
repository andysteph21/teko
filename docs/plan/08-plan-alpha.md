# Plan de préparation de l’alpha fermée Teko

**Date :** 18 octobre 2026 · **État :** périmètre et critères d’ouverture
confirmés ; réalisation en cours, ouverture terrain non autorisée. Ce plan organise la préparation d’une alpha
avec de vraies courses à Libreville, en reliant documentation, audit,
corrections et preuves de validation.

## Périmètre confirmé

Les réponses du porteur sont enregistrées dans le
[suivi](04-suivi-client.md) et le
[registre des décisions produit](../product/05-questions-ouvertes.md).

| Domaine | Décision |
|---|---|
| Public | Chauffeurs et passagers invités, alpha fermée à Libreville. |
| Taille | Premier mois chiffré pour 10 chauffeurs et 100 passagers invités ; zone et créneaux encore ouverts. |
| Plateforme | Android, conformément au périmètre déjà validé. |
| Courses | Immédiates uniquement ; programmation différée après l’alpha. |
| Paiement | Cash uniquement ; paiements Airtel réels désactivés côté serveur. |
| Hors réseau | Historique en cache, GPS conservé temporairement ; commandes et annulations confirmées par le serveur, sans rejeu tardif automatique. |
| Sécurité | Audit technique et tests adversariaux, puis revue indépendante avant les premières courses réelles. |
| Arbitrages | Toute nouvelle décision est présentée au porteur avec options, conséquences et recommandation avant application. |

Commission 15 %, prix ferme, partage des frais d’annulation et clôture à
4 h Africa/Libreville restent les règles validées. Le cash seul exige de
définir le règlement manuel des dettes et des éventuelles créances ; il ne
supprime pas ces obligations.

## Séquence de réalisation proposée

Les lots ci-dessous reprennent le plan présenté au porteur. Les choix qui
restent ouverts sont listés plus bas et ne doivent pas être résolus par défaut.
Une réponse manquante ne bloque que les travaux qui en dépendent.

| Lot | Travail | Preuve attendue pour le terminer |
|---|---|---|
| 0 | Compléter le contrat alpha : fonctionnalités, invitations, exploitation, responsabilités et arbitrages. | Périmètre traçable ; décisions ouvertes identifiées avec leur étape bloquée. |
| 1 | Réconcilier documentation, règles validées, code et commandes d’installation. | Installation reproductible ; aucun désaccord documentaire non signalé sur une règle sensible. |
| 2 | Établir le modèle de menaces et réaliser l’audit sur un environnement isolé à données synthétiques. | Rapport avec scénarios reproduits, périmètre, gravité, impact et limites de vérification. |
| 3 | Corriger les risques : permissions et confidentialité, intégrité des courses et finance, puis fiabilité mobile. | Test en échec avant chaque correction sensible, succès après correction et parcours légitimes préservés. |
| 4 | Éprouver le mordant des tests et fiabiliser la CI. | Matrice règle vers preuve ; fautes ciblées détectées ; suites obligatoires réellement exécutées et ressources fermées. |
| 5 | Valider les parcours complets sur builds signés et appareils physiques. | Traces des parcours, vérification des effets en base et résultats des essais en conditions dégradées. |
| 6 | Préparer exploitation, sauvegardes et revue indépendante ; constituer le dossier d’ouverture. | Preuves des critères bloquants, revue indépendante terminée et constats traités. |

Les tests ciblés accompagnent les corrections du lot 3 ; le lot 4 vérifie
leur capacité à détecter une régression et la fiabilité de leur exécution.
Le calendrier dépend des arbitrages et des disponibilités pour les essais
terrain et la revue indépendante.

## Documentation à réconcilier

- **README et démarrage :** état réel, prérequis, installation propre, commandes
  et fonctionnalités effectivement disponibles. Retirer les comptes de tests
  fixes des configurations destinées aux vraies courses.
- **Architecture :** rôle réel de Postgres, RPC, Edge Functions, Realtime,
  Storage, Martin et Valhalla ; accès directs permis et opérations réservées.
- **Produit :** résoudre les formulations historiques contradictoires avec les
  décisions datées, notamment 20 % contre 15 %, remise à zéro contre report,
  programmation et paiements hors périmètre alpha. Conserver l’historique.
- **Contrats et tests :** catalogue de ce que chaque suite prouve, commandes,
  prérequis et limites. Les nombres de tests ne valent pas preuve de couverture
  d’une règle.
- **Risques et opérations :** constats de sécurité, responsables, état,
  dépendances externes, Finance, SOS, KYC physique, incident, restauration et
  interruption contrôlée du service.

Chaque fonctionnalité doit distinguer son état prévu, implémenté et vérifié,
avec la version et la preuve de validation. Un amendement documentaire ne
doit jamais être présenté comme une correction du logiciel.

## Audit de sécurité

Tester les rôles anonyme, client, chauffeur éligible ou suspendu, admins ops,
carto, finance, superadmin et services. Couvrir les requêtes HTTP directes,
RPC, réponses, événements Realtime et accès Storage ; un bouton caché ne
constitue pas une restriction de sécurité.

| Surface | Vérifications prioritaires |
|---|---|
| Courses | Insertion et modification directes ; transitions interdites ; attribution concurrente ; visibilité du PIN ; prix falsifié ; double commande ; attente no-show. |
| Finance | Droits sur les soldes ; grand livre immuable ; commission et arrondis ; concurrence ; doublons ; clôture rejouée ; suspension et réactivation ; règlement manuel. |
| Edge Functions | Identité et autorisation sur l’objet visé ; exposition des opérations utilisant service_role ; erreurs RPC propagées ; absence de succès trompeur. |
| Authentification | OTP et abus ; invitations ; récupération ; sessions révoquées ; comptes inactifs ; séparation des sous-rôles admin. |
| Données personnelles | KYC privé et URLs signées ; GPS ; liens de partage expirés ou révoqués ; suppression ; purge ; données présentes dans les journaux. |
| Déploiement | Secrets ; configuration réelle ; absence de comptes OTP fixes et de fournisseur simulé actif ; interfaces exposées ; dépendances ; protections de l’infrastructure. |

Les premiers constats de lecture concernent les écritures sensibles sur
`rides`, la visibilité du PIN et les entrées de prix contrôlées par l’appelant.
Ils doivent être reproduits dans l’environnement d’audit avant clôture.
Examiner également les opérations de paiement utilisant service_role et le
traitement des erreurs de confirmation dans les callbacks.

Chaque constat porte un identifiant, les rôles et prérequis, la reproduction,
l’impact, une gravité justifiée, la correction envisagée, la décision éventuelle
du porteur et le test associé. Les critères de gravité et les choix de
correction seront soumis au porteur avant adoption. Les preuves ne contiennent
pas de secrets ni de données personnelles de participants.

## Tests mordants

La matrice de validation relie **décision ou règle, risque, scénario,
résultat attendu, test et preuve d’exécution**. Les résultats financiers
attendus sont calculés indépendamment des fonctions testées.

| Invariant | Scénario qui doit le vérifier |
|---|---|
| Les mutations sensibles passent par les opérations autorisées | Un JWT participant tente une modification directe ; la requête est refusée et l’état reste inchangé. |
| Le PIN reste réservé au passager | Le chauffeur tente de le lire par table, RPC, réponse d’acceptation ou Realtime ; aucun chemin exposé ne le révèle. |
| Le prix annoncé reste garanti | Distance, durée ou prix final falsifiés ne changent pas le prix autorisé ni la commission. Vérifier aussi la cohérence du devis moto et de la commande. |
| Une seule attribution est possible | Des acceptations lancées sur des connexions distinctes ne produisent qu’un chauffeur assigné. |
| Une opération financière produit un seul effet | Rejeu et appels concurrents ne doublent ni le grand livre ni l’effet externe. |
| Une course cash produit le bon solde | Prix, commission, reçu, grand livre, relevé et cache de solde concordent. |
| Les frais respectent les conditions métier | Vérifier les conditions d’attente et les montants, la part chauffeur et le traitement d’un frais non encore encaissé selon l’arbitrage attendu. |
| L’inactivité réseau ne crée pas d’action tardive | Réponse perdue, redémarrage et reconnexion ne créent pas une seconde course ou une annulation automatique différée. |
| Les exclusions alpha sont effectives | Un appel direct ne permet ni course programmée ni paiement Airtel réel, y compris depuis un job ou une ancienne version de l’app. |

Pour chaque invariant critique, introduire temporairement une faute pertinente
dans une copie isolée : retirer une garde, exposer une donnée, altérer un
arrondi ou neutraliser l’idempotence. Conserver la preuve que le test échoue
pour la raison attendue, puis rétablir le code. Une faute non détectée exige
de revoir le test ou son scénario.

Les mocks servent à provoquer des cas locaux et des erreurs. Les preuves
d’autorisation utilisent PostgREST avec de vrais JWT ; l’accès privilégié
sert aux fixtures et à l’inspection. Les tests de concurrence utilisent de
vraies connexions concurrentes. Les tests d’intégration préparent des données
dédiées sans supprimer l’état d’une autre suite ou d’un environnement utilisé.

Traiter les attentes asynchrones fragiles, les ressources non fermées et les
collisions aléatoires, notamment le mauvais PIN fixe pouvant coïncider avec
le code généré. Une relance verte isolée ne clôt pas une instabilité.

Les cibles de couverture existantes restent la référence. Leur application
réelle doit être contrôlée, notamment les exclusions et les commandes qui
collectent effectivement la couverture.

## CI et validation sur appareils

La CI doit découvrir toutes les suites attendues, échouer si un prérequis
obligatoire manque et conserver les rapports associés à la révision testée.
Vérifier les filtres de chemins : une modification du backend doit déclencher
les tests des contrats affectés. Vérifier les tests ignorés et les succès
qui reposeraient uniquement sur un cache antérieur.

Valider une installation propre, les migrations sur une base neuve et la
mise à niveau depuis des données de la version précédente. Éprouver les
suites sans relance masquant une instabilité ; le nombre de répétitions et
les budgets de temps restent à arrêter avec le porteur.

Le parcours Maestro actuel
[`course-complete.yaml`](../../apps/client/e2e/course-complete.yaml) s’arrête
à la recherche d’un chauffeur. Le compléter jusqu’à la réception de l’offre,
l’acceptation, le PIN, le trajet, le paiement cash et les effets financiers.
Couvrir également KYC, refus et expiration d’offre, annulation, historique,
SOS et règlement manuel. Valider les parcours admin avec le backend réel.

Sur le parc Android physique, avec builds signés : écran verrouillé,
arrière-plan, push réel, réseau instable, GPS refusé, redémarrage, double appui,
carte indisponible et reprise de course. La file GPS doit rester bornée et
respecter consentement, rétention et déconnexion ; ses limites restent à
soumettre au porteur.

## Décisions closes pendant la réalisation

Les décisions datées du porteur complètent le périmètre initial : devis serveur
nominatif à usage unique, validité cinq minutes configurable ; recherche trois
minutes maximum configurable ; PIN privé lisible par le seul passager, cinq
erreurs puis cinq minutes de blocage ; invitations vérifiées côté serveur.

Règlements cash ou versement externe, avec référence unique et justificatif ;
Ops prépare, Finance ou superadmin approuve. Refus motivé et versions tracées.
Les frais doivent être encaissés en totalité avant le crédit chauffeur de 70 %.
Un solde positif à la clôture reste un versement manuel en attente de preuve.
Les nouveaux dossiers cash et versement externe imposent un montant exact
positif au pas de 25 FCFA, révisions incluses, sans arrondi du justificatif.

Historique local par compte ; mesures GPS locales au plus 24 heures et suivi
précis serveur sept jours. Le chauffeur utilise un service de localisation au
premier plan avec notification permanente. Le patch Expo autorisé est validé
au banc pour la reprise après panne en arrière-plan et écran éteint sur OPPO ;
les essais réels et de longue durée restent requis. Les essais USB seuls peuvent
employer le GPS fictif signalé à Libreville. Sept pièces KYC et vérification
physique sont requises ; Ops revérifie les changements de véhicule validé.

Les identifiants et la signature alpha sont distincts. Expo Push Service est
retenu pour Android/iOS, dans l'organisation Teko `teko241`, avec Firebase
`teko-firebase` pour Android. Twilio et eSMS Africa restent à comparer sur devis
et essais réels, sans engagement. La durée de conservation KYC attend l'avis du
conseil juridique ; aucune purge KYC à J+30 n'est ajoutée par défaut.

## Décisions et dépendances encore ouvertes

| Sujet | Travail qui en dépend |
|---|---|
| Nombre de passagers, durée, zone précise et créneaux | Organisation et dimensionnement de la campagne. |
| Responsables, remplaçants et disponibilité Finance/SOS | Validation et exercice des [procédures](11-procedures-alpha.md). |
| Grille tarifaire terrain et zones approuvées | Vérification des prix et itinéraires réels à Libreville. |
| Plancher d'affichage d'une offre presque échue | Lisibilité du modal chauffeur au retour dans l'app. |
| Hébergement terrain, sauvegarde hors machine et objectifs de reprise | Test de restauration applicative sur un nouvel hôte et distribution HTTPS. |
| Budget/SIM d'essais et choix SMS après comparaison | Inscription en conditions réelles Airtel et Moov. |
| Accès Apple et appareil iOS | Validation future APNs/iPhone ; aucun essai Apple réalisé ici. |
| Budgets mesurés de latence, mémoire et stabilité | Seuils de performance de l'OPPO à arrêter à partir des mesures. |
| Revue indépendante : responsable et créneau | Fermeture du critère de sécurité avant toute course réelle. |
| Conservation KYC/finance et information des participants | Validation juridique des données terrain. |

Une réponse manquante ne bloque que les travaux qui en dépendent. Les corrections
et les résultats locaux sont dans l'[audit](09-audit-alpha.md), avec leurs limites.

## Critères bloquants confirmés avant les premières courses réelles

- [ ] Aucun risque critique ou élevé ouvert dans le périmètre exposé.
- [ ] Tous les scénarios critiques réussissent sur la version signée distribuée.
- [ ] Les tests de sécurité démontrent leur mordant par des fautes injectées.
- [ ] Une restauration de sauvegarde a été effectivement réalisée et vérifiée.
- [ ] Les procédures Finance et SOS sont prêtes, avec responsables et créneaux.
- [ ] La revue indépendante est terminée et ses constats sont traités en
  conformité avec les critères précédents.

Le dossier d’ouverture identifie la version, la configuration, les migrations,
les résultats, les limites connues et la procédure d’interruption du service.
Les volumes et hypothèses d’une bêta ultérieure ne fixent pas le périmètre
de cette première campagne alpha.
