# Teko — User stories (MVP ride-hailing)

**Version :** 0.1 (brouillon) · **Date :** 5 juin 2026 · accompagne `01-PRD.md` et `02-regles-metier.md`

Format : `En tant que <rôle>, je veux <action> afin de <bénéfice>.` Chaque story liste des **critères d'acceptation** (CA). Priorités : **P0** = indispensable au lancement, **P1** = important, **P2** = souhaitable. Identifiants stables `TK-xxx` pour référence ultérieure (backlog, tests).

Épics :
- A. Comptes & KYC
- B. Commande & course (client)
- C. Course & dispatch (chauffeur)
- D. Paiement & solde
- E. Sécurité
- F. Sobriété data
- G. Cartographie collaborative
- H. Évaluations & notifications
- I. Administration
- J. Points de repère & navigation

---

## A. Comptes & KYC

**TK-001 — Inscription client par OTP (P0)**
En tant que client, je veux m'inscrire avec mon numéro de téléphone et un code OTP afin d'accéder rapidement à l'app.
CA : saisie du numéro → réception OTP SMS → validation → création de profil (nom, photo facultative) ; e-mail optionnel ; acceptation CGU + confidentialité obligatoire ; échec OTP géré (renvoi, expiration).

**TK-002 — Inscription chauffeur et upload KYC (P0)**
En tant que chauffeur, je veux créer mon compte et téléverser mes pièces afin d'être validé.
CA : OTP comme TK-001 ; choix d'une ou plusieurs catégories (Éco, Moto-taxi, Confort) ; upload CNI/passeport, permis, carte grise, assurance, photo véhicule, **casier judiciaire**, photo de profil ; statut KYC visible (`en attente`/`validé`/`refusé` + motif) ; consentement explicite à la collecte GPS.

**TK-003 — Validation KYC par l'admin (P0)**
En tant qu'admin, je veux examiner et valider/refuser un dossier chauffeur afin de contrôler l'accès.
CA : file des dossiers en attente ; visualisation des pièces ; action valider/refuser avec motif ; à la validation, le compte devient actif et reçoit des demandes ; notification au chauffeur.

**TK-004 — Connexion ultérieure (P0)**
En tant qu'utilisateur, je veux me reconnecter par OTP afin de retrouver mon compte.
CA : reconnexion par numéro + OTP ; session persistante ; déconnexion possible.

---

## B. Commande & course (client)

**TK-010 — Définir départ et destination (P0)**
En tant que client, je veux indiquer mon point de départ et ma destination sur la carte custom afin de commander.
CA : départ pré-rempli par géolocalisation, ajustable ; recherche/sélection de destination ; rendu sur carte custom Teko ; fonctionne en mode économie de données.

**TK-011 — Choisir une catégorie et voir le prix estimé (P0)**
En tant que client, je veux choisir Éco/Moto-taxi/Confort et voir l'estimation afin de décider.
CA : catégories disponibles affichées ; estimation de prix par catégorie (distance/temps) ; estimation de délai d'arrivée ; comportement défini si carte/zone insuffisante (repli grille de zones).

**TK-012 — Commander une course immédiate (P0)**
En tant que client, je veux commander une course tout de suite afin de partir rapidement.
CA : confirmation de commande ; recherche de chauffeur avec état visible ; cas « aucun chauffeur trouvé » géré ; possibilité d'annuler avant acceptation sans frais.

**TK-013 — Programmer une course (P1)**
En tant que client, je veux réserver une course à une date/heure afin d'anticiper un déplacement.
CA : choix date/heure ; rappel avant l'horaire ; dispatch déclenché à l'approche ; annulation possible selon règles.

**TK-014 — Suivre le chauffeur en temps réel (P0)**
En tant que client, je veux voir l'approche puis le trajet du chauffeur afin d'être informé.
CA : position du chauffeur mise à jour (throttlée pour la data) ; étapes (en route, arrivé, démarré, terminé) ; infos chauffeur/véhicule ; contact possible.

**TK-015 — Code PIN de démarrage (P0)**
En tant que client, je veux fournir un code au chauffeur afin de garantir le bon véhicule.
CA : PIN affiché côté client ; la course ne passe à `démarrée` qu'après saisie correcte par le chauffeur ; gestion des erreurs de saisie.

**TK-016 — Choisir le mode de paiement (P0)**
En tant que client, je veux payer en espèces ou Airtel Money afin d'utiliser mon moyen préféré (Moov Money en version future).
CA : sélection avant/à la fin de course ; cash = paiement direct au chauffeur ; mobile money (Airtel) = paiement à Teko avec confirmation de transaction ; reçu affiché ; l'ajout de Moov Money ne doit pas modifier ce parcours.

**TK-017 — Historique et reçus (P1)**
En tant que client, je veux consulter mes courses passées afin de suivre mes dépenses.
CA : liste avec date, trajet, prix, mode de paiement, chauffeur ; détail/reçu par course.

---

## C. Course & dispatch (chauffeur)

**TK-020 — Passer en ligne / hors ligne (P0)**
En tant que chauffeur, je veux activer ma disponibilité afin de recevoir (ou non) des demandes.
CA : bascule en ligne/hors ligne ; ne reçoit des demandes qu'en ligne et compte actif (KYC validé, solde régulier).

**TK-021 — Recevoir et accepter une demande (P0)**
En tant que chauffeur, je veux recevoir les demandes proches avec un délai afin de les accepter.
CA : notification avec infos clés (zone de prise en charge, estimation, catégorie) ; délai d'acceptation borné ; refus/expiration → réattribution à un autre chauffeur.

**TK-022 — Naviguer sur la carte custom (P0)**
En tant que chauffeur, je veux être guidé sur la carte Teko afin d'atteindre client et destination, même dans les quartiers récents.
CA : itinéraire sur carte custom (routes Teko incluses) ; guidage léger en data ; recalcul raisonnable.

**TK-023 — Dérouler la course (P0)**
En tant que chauffeur, je veux marquer arrivée, saisir le PIN, démarrer et terminer afin de suivre l'état réel.
CA : transitions d'état conformes au cycle de vie ; PIN requis pour démarrer ; fin de course calcule le prix final et met à jour le solde selon le mode de paiement.

**TK-024 — Contribution GPS à la carte (P1)**
En tant que chauffeur consentant, je veux que mes trajets aident à améliorer la carte afin de bénéficier d'itinéraires plus justes.
CA : collecte uniquement si consentement ; agrégée/anonymisée ; aucune exposition de trajets individuels ; respecte le mode économie de données.

---

## D. Paiement & solde

**TK-030 — Voir mon solde journalier en temps réel (P0)**
En tant que chauffeur, je veux voir ma dette/créance vis-à-vis de Teko afin de savoir où j'en suis.
CA : solde courant avec signe clair (je dois / Teko me doit) ; mise à jour après chaque course ; détail des mouvements du jour ; échéance 4h affichée.

**TK-031 — Régler mon solde par mobile money (P0)**
En tant que chauffeur, je veux verser ce que je dois via Airtel Money afin d'éviter la désactivation (Moov Money en version future).
CA : montant dû pré-rempli ; paiement Airtel Money ; confirmation de transaction met le solde à jour ; reçu ; repli versement manuel + preuve si API indisponible.

**TK-032 — Désactivation automatique pour impayé (P0)**
En tant que Teko, je veux désactiver à 4h les chauffeurs au solde négatif non réglé afin de protéger le modèle.
CA : job à l'échéance ; chauffeur désactivé ne reçoit plus de demandes ; rappels envoyés avant ; notification de désactivation.

**TK-033 — Réactivation immédiate au paiement (P0)**
En tant que chauffeur désactivé, je veux régulariser et reprendre afin de retravailler vite.
CA : réception du règlement → réactivation immédiate ; notification ; reprise des demandes.

**TK-034 — Payout des soldes positifs (P1)**
En tant que chauffeur, je veux recevoir ce que Teko me doit afin d'être payé pour les courses mobiles.
CA : décaissement Airtel Money selon fréquence/seuil paramétrés ; confirmation et trace ; relevé.

**TK-035 — Encaissement mobile money client (P0)**
En tant que Teko, je veux encaisser de façon fiable les paiements clients afin de créditer correctement les chauffeurs.
CA : transaction idempotente ; rapprochement course↔paiement↔solde ; gestion échec/double paiement ; journal auditable.

**TK-036 — Relevé quotidien (P1)**
En tant que chauffeur, je veux un récapitulatif de fin de journée afin de vérifier mes recettes et règlements.
CA : relevé archivé (courses, modes de paiement, commission, mouvements de solde, règlement/payout) ; consultable dans l'app.

---

## E. Sécurité

**TK-040 — Bouton SOS (P0)**
En tant qu'utilisateur en course, je veux déclencher une alerte afin d'être secouru en cas de danger.
CA : SOS accessible pendant la course ; alerte vers admin Teko et/ou contact ; position transmise ; trace de l'événement.

**TK-041 — Partage de trajet (P0)**
En tant que client, je veux partager ma course en temps réel à un proche afin de me sentir en sécurité.
CA : génération d'un lien de suivi ; le proche voit position et progression ; expire à la fin de la course.

**TK-042 — Appariement vérifié par PIN (P0)**
(Couvert par TK-015/TK-023.) Le PIN empêche de monter dans le mauvais véhicule.

---

## F. Sobriété data

**TK-050 — Widget flottant de consommation data (P0)**
En tant qu'utilisateur, je veux voir combien de données l'app consomme aujourd'hui afin d'être rassuré sur sa frugalité.
CA : widget flottant affichant la consommation journalière de l'app ; lisible et non intrusif ; activable/masquable ; mesure cohérente.

**TK-051 — Mode économie de données (P0)**
En tant qu'utilisateur, je veux activer un mode économe afin de réduire ma consommation.
CA : réduit la fréquence des mises à jour GPS et la richesse cartographique ; impact sur la consommation visible via TK-050 ; le service reste fonctionnel.

**TK-052 — Fonctionnement en réseau lent/instable (P0)**
En tant qu'utilisateur sur 3G instable, je veux que l'app reste utilisable afin de ne pas perdre ma course.
CA : files d'attente et reprise sur coupure ; états de chargement clairs ; pas de perte de course sur micro-coupure ; échanges minimisés et compressés.

---

## G. Cartographie collaborative

**TK-060 — Ajouter/corriger une route manuellement (P0)**
En tant qu'admin cartographie, je veux éditer des routes afin de compléter la carte là où elle manque.
CA : édition de tracés sur fond OSM ; publication dans la couche Teko ; routes publiées utilisables pour routing et tarif ; actions journalisées.

**TK-061 — Générer des propositions de routes depuis le GPS (P1)**
En tant que système, je veux proposer des tracés issus des traces fréquentes afin d'accélérer l'enrichissement.
CA : détection au-dessus de seuils (passages, chauffeurs distincts, fenêtre) ; proposition créée en statut `proposé` ; données agrégées/anonymisées.

**TK-062 — Valider/infirmer une proposition (P0)**
En tant qu'admin cartographie, je veux confirmer ou rejeter une route proposée afin de garantir la qualité.
CA : revue avec indicateurs (fréquence, nb de chauffeurs, géométrie) ; action valider→publication / rejeter ; aucune publication automatique sans validation.

**TK-063 — Ouvrir une zone au service (P1)**
En tant qu'admin, je veux activer une zone une fois la carte suffisante afin d'assurer une bonne expérience.
CA : seuil de couverture défini ; activation/désactivation par zone ; cohérent avec le déploiement national progressif.

---

## H. Évaluations & notifications

**TK-070 — Évaluer après la course (P0)**
En tant qu'utilisateur, je veux noter (1–5) et commenter afin de signaler la qualité.
CA : évaluation des deux côtés ; commentaire facultatif ; rappel d'évaluation ; mise à jour de la moyenne.

**TK-071 — Note moyenne et badge Top Service (P1)**
En tant que chauffeur, je veux voir ma moyenne et obtenir un badge afin de valoriser ma qualité.
CA : moyenne publique ; badge si ≥ 4,5 sur fenêtre glissante ; perte du badge si la moyenne baisse.

**TK-072 — Notifications push clés (P0)**
En tant qu'utilisateur, je veux être notifié des événements importants afin de suivre sans rafraîchir.
CA : client (chauffeur trouvé, arrivée, fin, rappel d'évaluation) ; chauffeur (nouvelle demande, rappel d'échéance, désactivation/réactivation, évaluation, KYC) ; via push pour limiter la data.

---

## I. Administration

**TK-080 — Tableau de bord temps réel (P0)**
En tant qu'admin, je veux voir courses et chauffeurs en direct afin de superviser l'activité.
CA : carte des courses/chauffeurs ; volumes clés ; filtres par zone/statut.

**TK-081 — Gérer utilisateurs, suspensions, litiges (P0)**
En tant qu'admin, je veux agir sur les comptes et traiter les litiges afin d'assurer le bon fonctionnement.
CA : recherche/consultation ; suspension/réactivation manuelle ; traitement des litiges et annulations ; actions journalisées.

**TK-082 — Console financière (P0)**
En tant qu'admin finance, je veux suivre soldes, versements et payouts afin de piloter le modèle cash.
CA : soldes par chauffeur ; versements entrants et impayés ; déclenchement/contrôle des payouts ; rapprochements ; export.

**TK-083 — Paramétrage (P0)**
En tant qu'admin, je veux configurer commission, tarifs, frais, échéance, zones et seuils afin d'adapter le modèle.
CA : édition des paramètres clés (cf. règles métier §10) ; valeurs effectives sans redéploiement ; historique des changements.

**TK-084 — Modération des évaluations (P1)**
En tant qu'admin, je veux modérer avis et incidents afin de garder une plateforme saine.
CA : file des signalements ; masquage/sanction ; réponse du prestataire visible.

**TK-085 — Valider/infirmer un point de repère proposé (P0)**
En tant qu'admin cartographie, je veux confirmer ou rejeter les repères proposés afin de garantir une donnée fiable.
CA : file des repères `proposé` avec nom, catégorie, position, alias, proposant ; fusion des doublons ; valider→exploitable / rejeter ; correction (position, nom) et retrait possibles ; actions journalisées.

---

## J. Points de repère & navigation

**TK-090 — Situer un lieu par point de repère (P0)**
En tant que client, je veux indiquer mon départ/destination via un point de repère afin de commander comme je m'oriente réellement.
CA : recherche de repère mise en avant (nom/alias/catégorie) ; après sélection, affinage par épingle sur la carte + champ précision (« derrière », « à côté de ») ; la position exacte (épingle) est ce qui est transmis ; repères récents/favoris ; fonctionne en mode économie de données.

**TK-091 — Point de rendez-vous suggéré (P1)**
En tant que client, je veux qu'un repère connu proche me soit proposé comme lieu de prise en charge afin d'éviter les malentendus avec le chauffeur.
CA : suggestion d'un repère proche pertinent ; acceptation ou conservation de la position GPS ; le repère de RDV est visible côté chauffeur.

**TK-092 — Guidage chauffeur par repères (P0)**
En tant que chauffeur, je veux des instructions formulées avec des points de repère afin de naviguer même sans noms de rue fiables.
CA : aux points de décision, instruction référencée à un repère saillant (« tournez à droite après la station-service ») ; nom de rue ajouté si disponible ; repli sur instruction classique si aucun repère pertinent ; léger en données.

**TK-093 — Proposer un nouveau point de repère (P1)**
En tant que chauffeur ou client, je veux proposer un repère manquant afin d'enrichir la carte pour tous.
CA : ajout depuis l'app (nom, catégorie, position, alias, photo facultative) ; statut `proposé` jusqu'à validation admin (TK-085) ; pas d'exposition publique avant validation ; anti-doublon.

**TK-094 — Repères sur la carte et hors-ligne (P1)**
En tant qu'utilisateur, je veux voir les repères validés sur la carte, y compris hors connexion, afin de m'orienter à faible coût data.
CA : affichage des repères validés par catégorie/icône ; inclusion dans les paquets carte hors-ligne par zone ; densité d'affichage réduite en mode économie.

---

## Notes de portée

- Les stories marquées P0 forment le **cœur du MVP** et conditionnent un lancement utile.
- Les valeurs chiffrées (commission, frais, seuils, fenêtres) référencées ici sont définies dans `02-regles-metier.md` et restent à arrêter (`05-questions-ouvertes.md`).
- L'estimation d'effort, le découpage en sprints et la dépendance technique seront traités après le document d'architecture.
