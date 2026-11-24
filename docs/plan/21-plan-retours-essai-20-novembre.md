# Plan d’implémentation — retours de l’essai terrain du 20 novembre 2026

**Date :** 23 novembre 2026 · **État :** accord du porteur le 23 novembre pour implémenter les six suggestions ; lot R2 fait dans le dépôt le même jour, arbitrages A1 à A19 tranchés un par un le 23 novembre (registre produit), dont quatre écarts avec les recommandations ci-dessous : A1, A13, A17 et véhicules de livraison. Texte d’origine : Aucune ligne de
ce plan n’est une décision : chaque arbitrage listé au §3 est soumis au porteur
avant application, puis reporté dans le [suivi](04-suivi-client.md) et le
[registre produit](../product/05-questions-ouvertes.md).

**Sources :** message de retour du 21 novembre (six suggestions), trois vidéos
de l’essai (course réelle en voiture, passager et chauffeur), document
« TEKO COVOITURAGE » joint, et l’état des essais précédents
(rapports 14 à 20 de ce dossier).

## 1. Où en sont les essais

Base de travail : la branche `codex/alpha-essai-distance` (pull request n° 2,
brouillon, 44 commits d’avance sur `main`), fusionnée dans la branche de ce
plan. `main` s’arrête au 22 octobre et ne reflète plus l’état réel.

| Passe | Acquis | Resté ouvert |
|---|---|---|
| Durcissement et banc USB, 18–22 octobre ([audit](09-audit-alpha.md)) | Devis serveur, PIN privé, invitations, règlements manuels, arrondi au pas de 25 ; courses cash complètes en GPS fictif. | Revue indépendante, restauration prouvée, responsables Finance/SOS. |
| Mise en ligne du banc, 8–9 novembre ([exploitation](12-exploitation-alpha-vps.md)) | VPS `alpha.tekomove.com` : portail d’installation par rôle, console, cartes, Valhalla ; APK signés « GPS réel · paiement simulé ». | — |
| Jour 2, 10–11 novembre ([rapport](15-rapport-test-jour2.md)) | Zone Gabon, 1 697 repères OSM, nouvelle proposition après expiration, délai de 30 s, VPS durci. | Distance maximale de dispatch, repères au nom générique, copie des sauvegardes hors serveur, fermeture de l’accès root. |
| Jour 3, 12 novembre ([rapport](17-rapport-test-jour3.md)) | Point du chauffeur vivant, position du passager à la commande, pastilles Teko, clôture automatique après 3 h. | Course acceptée mais jamais démarrée. |
| Salve des 15–16 novembre ([rapport](19-rapport-test-jour4.md), [mesures OPPO](20-performance-oppo-a15.md)) | 4 courses jusqu’au reçu ; Moto masquée ; sonnerie dédiée aux propositions ; annonces vocales ; pas de réécriture native justifiée. | J4-01 (aucune position de course enregistrée) corrigé par déduction, **jamais confirmé sur téléphone** ; compteur de données à zéro ; erreurs 502/503 du push ; lot 2 de l’alerte ; livraison à cadrer. |
| **Essai du 20 novembre** (APK du 17 novembre) | Course réelle en voiture filmée : écran « En course » passager (itinéraire, pastilles, partage, SOS) et « Terminer la course » chauffeur. Retour : « tout s’est bien passé ». | Pas encore de rapport ni de relevé du VPS pour cette salve. |

Ce qui reste à établir pour l’essai du 20 novembre, par un relevé du VPS en
lecture seule (je n’y ai pas accès depuis cette session) : des positions de
course ont-elles bien été enregistrées (J4-01), la sonnerie et les annonces
vocales ont-elles fonctionné, et combien de courses ont abouti.

La demande de livraison n’est pas nouvelle : le 16 novembre le porteur
proposait déjà de remplacer le taxi-moto par la livraison, et Moto a été
masquée le 17. Les six critères bloquants du [plan alpha](08-plan-alpha.md)
restent tous non cochés ; les suggestions ci-dessous s’y ajoutent.

## 2. Les six suggestions, confrontées à l’existant

| # | Suggestion | État actuel dans le code | Écart avec les décisions actées |
|---|---|---|---|
| 1 | Changer de destination | Destination figée à la commande (`rides.dest_geom`, devis à usage unique). | Prix ferme garanti (25 août, n° 6) : tout changement exige un nouveau devis confirmé. |
| 2 | Arrêts en cours de trajet | Une origine, une destination ; aucun point intermédiaire. | Même contrainte de prix ferme. |
| 3 | Livraison | Rien. Moto est masquée depuis le 17 novembre ; aucun chauffeur du banc n’a cette catégorie. | Exclue du MVP (PRD §5.2) ; « service à cadrer » depuis le 17 novembre. |
| 4 | Covoiturage au tarif à la place | Valeur `covoiturage` présente dans l’enum et dans `seed.sql` (grille provisoire 400 + 150/km), masquée dans les apps. Aucune mutualisation. | Reporté le 18 août ; la règle de prix manquante est maintenant fournie par le document joint. |
| 5 | Accueil affichant directement les options | Accueil = « Où allez-vous ? » + 2 récents + bouton « Ma position » ; la catégorie (Éco ou Confort) n’apparaît qu’au 4ᵉ écran (recherche → affinage → catégorie). Un récent rouvre la recherche au lieu de préremplir la destination. | Maquette C-07 à faire évoluer (tout écart maquette/code est un bug). |
| 6 | Validation par e-mail / Google plutôt que SMS | Connexion par code lié au numéro ; aucun SMS réel n’est envoyé, les codes sont remis à la main aux testeurs. E-mail facultatif. Invitations et portail d’installation rattachés au **numéro vérifié**. | Inverse la décision OTP SMS (PRD §5.1) ; rend sans objet le choix eSMS Africa du 22 octobre et le « SMS de secours » du lot 2 de l’alerte de course. |

## 3. Arbitrages à soumettre au porteur

Chaque point bloque uniquement le lot indiqué. La recommandation est celle du
plan ; elle ne s’applique qu’après réponse.

| N° | Lot | Question | Recommandation |
|---|---|---|---|
| A1 | R1 | Le SMS disparaît-il aussi pour les **chauffeurs** ? | Oui : le numéro du chauffeur est contrôlé lors de la vérification physique KYC, déjà obligatoire. |
| A2 | R1 | Méthodes proposées. | Bouton Google en premier, code à 6 chiffres par e-mail en second (pour les adresses non Google). Pas de mot de passe. |
| A3 | R1 | Un numéro **non vérifié** peut-il être saisi par deux comptes ? | Oui, pas d’unicité bloquante : sans vérification, l’unicité permettrait de bloquer le numéro d’autrui. Le numéro sert au contact, l’e-mail à l’identité. |
| A4 | R1 | Invitations alpha : par numéro aujourd’hui. | Les basculer sur l’**e-mail vérifié**. Un numéro simplement déclaré ne peut plus prouver une invitation (usurpation triviale). |
| A5 | R1 | Frein aux comptes multiples (un e-mail est gratuit ; un passager avec des frais d’annulation dus peut recréer un compte). | Blocage des frais dus rattaché aussi au numéro déclaré et à l’appareil ; à durcir après l’alpha, où les passagers sont invités. |
| A6 | R3 | Prix après changement de destination ou ajout d’arrêt. | Nouveau prix ferme = distance déjà parcourue + itinéraire restant recalculé par le serveur, jamais inférieur au prix déjà accepté. Affiché et confirmé par le passager avant application. |
| A7 | R3 | Le chauffeur peut-il refuser la modification ? | Oui, 30 secondes pour accepter ; sans réponse ou en cas de refus, la course initiale se poursuit inchangée. |
| A8 | R3 | Limites. | 2 arrêts au plus par course, 3 modifications au plus ; attente à un arrêt gratuite 3 minutes puis facturée à la minute (tarif existant `per_min`). |
| A9 | R4 | « 3 clients maximum » : trois commandes ou trois places ? Un client peut-il réserver 2 places ? | Trois **places** ; un client peut en prendre jusqu’à 3, prix × nombre de places. |
| A10 | R4 | Distance facturée à chaque passager. | Son trajet direct départ → destination, calculé à la commande : prix ferme, indépendant des détours et des autres passagers. |
| A11 | R4 | « Zone limitrophe » : définition mesurable. | Prise en charge à moins de 400 m de l’itinéraire restant et détour total ≤ 5 minutes pour les passagers déjà à bord, valeurs réglables en console. |
| A12 | R4 | Commission. | 15 % par place, comme les autres courses. |
| A13 | R4 | Véhicules admis. | Voitures Éco et Confort dont le chauffeur a activé l’option ; pas de moto. |
| A14 | R4 | Règle « passagère à bord » : le document évoque un client **extérieur à l’application**, alors que la même section interdit toute prise en charge hors application. | Lever la contradiction : aucune prise en charge hors application en covoiturage. La règle devient un engagement de la charte chauffeur, avec signalement possible par la passagère ; l’app ne connaît pas le genre et ne peut pas l’appliquer seule. |
| A15 | R4 | Frais d’annulation en covoiturage. | Même règle que la course classique, calculée sur le prix de la place. |
| A16 | R5 | Livraison : qui paie, et quand ? | L’expéditeur, en espèces à la remise du colis au coursier (seul mode compatible avec l’alpha cash). |
| A17 | R5 | Preuve de remise. | Code à 4 chiffres transmis par l’expéditeur au destinataire (lien partageable, sans SMS), saisi par le coursier — même mécanique que le PIN de départ. |
| A18 | R5 | Responsabilité, valeur maximale, objets interdits. | À faire valider par le cabinet juridique déjà mandaté avant toute livraison réelle. |
| A19 | Tous | Calendrier par rapport à l’ouverture de l’alpha. | R1 et R2 avant l’ouverture ; R3 pendant l’alpha ; R4 et R5 après les premières semaines de courses réelles. Chaque nouvelle fonction élargit la surface à auditer et repousse la revue indépendante si elle est livrée avant. |

## 4. Lots

Ordre proposé : R0 → R1 → R2 → R3 → R4 → R5. R3 pose le modèle d’itinéraire à
étapes dont R4 a besoin ; R5 est indépendant et peut passer avant R4 si le
porteur le préfère. Les durées sont des ordres de grandeur pour une personne,
hors essais terrain et hors attente d’arbitrage.

### R0 — Cadrage (2 à 3 jours)

- Rédiger le rapport de l’essai du 20 novembre à partir d’un relevé du VPS,
  en confirmant J4-01 ; décider du sort de la pull request n° 2 (la fusionner
  dans `main` avant de démarrer les lots évite de diverger davantage).
- Enregistrer le retour dans le suivi client, obtenir les réponses A1 à A19.
- Amender PRD §5 (périmètre), règles métier §2, §4.1 et §5, glossaire.
- Maquettes à créer ou modifier avant tout écran : C-03/C-04 (connexion),
  C-07 (accueil), C-14 (course avec étapes), nouvelles maquettes covoiturage et
  livraison côté passager et chauffeur. Les jetons de design restent l’autorité.

### R1 — Compte par e-mail ou Google, numéro enregistré (1 à 1,5 semaine)

Supprime la dépendance SMS : aujourd’hui personne ne peut s’inscrire sans
qu’un code lui soit remis à la main.

- **Backend :** activer la connexion Google (`signInWithIdToken`) et l’OTP
  e-mail dans GoTrue ; SMTP via le fournisseur déjà chiffré au budget. Nouvelle
  migration : `profiles.phone` obligatoire, **normalisé en chiffres seuls à
  l’écriture**, modifiable par RPC `update_contact_phone` avec trace d’audit ;
  le trigger de création de profil ne dépend plus de `auth.users.phone`.
- **Invitations :** `alpha_invites` gagne une colonne e-mail ;
  `assert_alpha_invited` et la garde de mise en ligne chauffeur comparent
  l’e-mail vérifié (`email_confirmed_at`) au lieu de `phone_confirmed_at`.
  Console admin et portail `/install` : inviter et se connecter par e-mail.
  La migration `20261019102000_alpha_field_signup_hook`, réservée à l’Auth
  terrain et non appliquée sur le VPS, est à réécrire dans ce sens.
- **Apps :** écrans C-03/C-04 remplacés (bouton Google, saisie e-mail, code),
  numéro demandé à la création du profil ; « Modifier le profil » permet de
  changer de numéro sans perdre l’historique ; l’écran de récupération
  `recovery.tsx` devient inutile. Même parcours côté chauffeur selon A1.
- **Natif :** module Google Sign-In épinglé à une version compatible Expo,
  client OAuth Android déclaré avec l’empreinte de la clé alpha, nouveau dev
  client et nouveaux APK.
- **Tests :** scénarios JWT — invitation par e-mail, refus d’un compte non
  invité ayant saisi le numéro d’un invité, changement de numéro, purge de
  compte ; fautes injectées sur la nouvelle garde d’invitation. Maestro :
  inscription complète sur OPPO.
- **Points de vigilance :** les comptes des testeurs du VPS sont identifiés
  par téléphone : prévoir leur rattachement à un e-mail sans perdre courses
  et soldes ; le numéro Airtel de versement
  chauffeur devra être vérifié autrement quand Airtel sera réactivé ; mise à
  jour du budget (500 SMS en moins) et de la notice données personnelles.

### R2 — Accueil avec options directes (3 à 4 jours)

- Feuille d’accueil : une rangée d’options avec leur pictogramme (Éco, Confort,
  puis Covoiturage et Livraison à mesure qu’ils sont livrés — jamais d’option
  inactive affichée ; Moto reste masquée), le champ de destination, puis les récents.
- Le service choisi présélectionne la catégorie dans le magasin de réservation ;
  l’écran catégorie reste l’endroit où le prix est confirmé.
- Un récent préremplit la destination et mène directement au devis, soit deux
  écrans de moins pour un trajet habituel.
- Aucun changement backend. Tests par variantes de maquette ; contrôle sur OPPO
  que la feuille respecte la barre système et ne recouvre ni le widget de
  données ni « Ma position » (défaut J4-03 déjà vécu côté chauffeur).

### R3 — Changement de destination et arrêts (environ 2 semaines)

Les deux demandes sont une seule fonction : modifier l’itinéraire d’une course.

- **Modèle :** table `ride_stops` (course, ordre, position, repère, heure
  d’arrivée et de départ) ; la destination reste le dernier point. Les arrêts
  peuvent être saisis dès la commande (devis multi-étapes) ou ajoutés en course.
- **Devis :** `price-quote` accepte des étapes (Valhalla gère les itinéraires à
  plusieurs points) ; nouvelle fonction de **devis de modification** qui part
  de la dernière position serveur du chauffeur, pas d’une position envoyée par
  le client.
- **RPC :** `request_route_change` (passager, à partir du devis de
  modification), `respond_route_change` (chauffeur), `arrive_stop` /
  `leave_stop` (chauffeur). Chaque changement est tracé dans `ride_events`
  avec ancien et nouveau prix ; `complete_ride` facture le dernier prix accepté.
- **Annonces vocales :** le chauffeur entend la modification et le nom du
  nouveau repère (module de synthèse déjà en place).
- **Clôture automatique :** le délai (3 h ou quatre fois la durée estimée)
  est recalculé sur la durée du nouvel itinéraire.
- **Apps :** passager — bouton « Modifier le trajet » sur l’écran de course,
  recherche de repère, confirmation du nouveau prix. Chauffeur — demande à
  accepter, itinéraire et liste d’étapes mis à jour, attente à l’arrêt.
- **Tests :** prix non falsifiable, modification refusée par un tiers ou sur
  une course terminée, concurrence entre modification et fin de course, limites
  A8, cohérence reçu / grand livre / commission après modification.

### R4 — Covoiturage à la place (3 à 4 semaines)

Règles reprises du document joint : paiement à la place, 3 places au plus,
passagers ajoutés seulement près de l’itinéraire, arrêts toujours annoncés,
prises en charge uniquement par l’application.

- **Tarif :** 250 FCFA/km par place ; 500 FCFA jusqu’à 2 km ; plafond
  1 850 FCFA (atteint à 7,4 km). La grille actuelle ne sait pas plafonner :
  ajouter `max_fare` et un mode « à la place » à `pricing_rules`, remplacer la
  ligne provisoire de `seed.sql` **et** la configuration correspondante.
  Libellé « par place » partout où le prix s’affiche.
- **Modèle :** un `shared_trip` par chauffeur (places restantes, liste
  ordonnée d’étapes réutilisant R3) auquel se rattachent des **courses
  individuelles**. Chaque passager garde sa propre course : son devis, son PIN,
  son paiement cash, son reçu, sa commission. Le moteur financier n’est pas
  modifié.
- **Appariement :** une demande de covoiturage est proposée d’abord aux
  trajets partagés en cours qui passent à proximité (règle A11), sinon à un
  chauffeur libre qui ouvre un nouveau trajet. Le chauffeur accepte ou refuse
  chaque passager supplémentaire. La garde actuelle « une seule course active
  par chauffeur » est adaptée pour cette catégorie uniquement.
- **App passager :** option Covoiturage avec choix du nombre de places, prix
  par place, information explicite que d’autres passagers peuvent monter,
  ordre des arrêts et heure d’arrivée estimée tenus à jour.
- **App chauffeur :** activation de l’option, file d’étapes (prise en charge
  et dépose de chaque passager), PIN et encaissement par passager, offre d’un
  passager supplémentaire pendant la course.
- **Confidentialité :** un passager ne voit ni le nom complet, ni le numéro,
  ni la destination exacte des autres ; seulement l’ordre des arrêts.
- **Tests :** jamais plus de 3 places même sous acceptations concurrentes,
  prix aux bornes (2 km, 7,4 km, arrondi au pas de 25), isolation des données
  entre passagers, annulation d’un passager sans effet sur les autres, une
  commission par place. Essai terrain à trois passagers avant ouverture.

### R5 — Livraison (environ 2 semaines, après avis juridique)

- **Modèle :** type de service sur la course (`ride` / `delivery`) plutôt
  qu’une nouvelle catégorie de véhicule : le cycle de vie, le dispatch, le
  suivi et la finance sont réutilisés. Détails du colis (description, taille,
  nom et numéro du destinataire) dans une table liée.
- **Parcours :** l’expéditeur commande, remet le colis et paie (A16) ; le
  coursier confirme la prise en charge par le PIN ; le destinataire suit la
  livraison par lien et donne le code de remise (A17).
- **Tarif :** grille propre par type de service. Véhicules : à trancher —
  aucun chauffeur du banc n’est en moto ; commencer par les voitures déjà
  inscrites permet d’essayer le service sans recruter.
- **Chauffeur :** option à activer ; l’offre indique « Livraison » et la
  taille du colis avant acceptation.
- **Admin :** suivi et litiges de livraison dans la console.
- **Tests :** code de remise limité en essais comme le PIN, coordonnées du
  destinataire visibles du seul coursier affecté et effacées avec la rétention
  existante, lien de suivi expirant.

## 5. Règles communes à tous les lots

- Chaque nouvelle RPC arrive avec son scénario JWT dans `supabase/tests/e2e/`
  et au moins une faute injectée détectée ; aucun prix ni statut posé par le
  client.
- `seed.sql` et les migrations restent alignés sur chaque nouvelle clé de
  configuration.
- Chaque lot se termine par un parcours Maestro sur l’OPPO A15 et une entrée
  dans l’audit distinguant prévu, implémenté et vérifié.
- Les fonctions non encore ouvertes sont refusées côté serveur, pas seulement
  masquées dans l’app.
