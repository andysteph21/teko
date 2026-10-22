# Teko — Suivi des réponses client

**Paquet envoyé :** préparé le 18 août 2026 (`envoi-client/`). **Réponses reçues le 25 août 2026** (`Teko-Decisions-repondu-detaille.docx`) — **26/26 questions répondues**, dont les 6 bloquantes. Seule la n° 7 (grille tarifaire) renvoie à une séance de travail dédiée.
**Règle :** ce document est LA source de vérité sur ce qu'on attend du client. Une réponse reçue = statut mis à jour ici **puis** décision reportée dans `../product/05-questions-ouvertes.md` (table « Décisions tranchées ») **puis** documents/maquettes impactés mis à jour. Ne jamais mettre à jour les autres documents sans passer par ici.

**Relance suggérée :** J+7 sur les 6 questions bloquantes si aucune réponse.

## Réponses du porteur pour l’alpha du 18 octobre 2026

Ces réponses sont distinctes des 26 réponses client du 25 août. Elles sont
reportées dans le registre produit et le [plan alpha](08-plan-alpha.md).
Leur enregistrement documentaire ne vaut pas implémentation ni validation.

| Sujet | Réponse confirmée | État |
|---|---|---|
| Public | Alpha fermée à Libreville, chauffeurs et passagers invités, vraies courses | Périmètre confirmé |
| Taille | Environ 20 chauffeurs ; nombre de passagers, durée et créneaux non fixés | Partiellement défini |
| Paiement | Cash uniquement ; paiements Airtel réels désactivés côté serveur | À implémenter et vérifier |
| Courses | Courses immédiates uniquement pour l’alpha | À implémenter et vérifier |
| Hors réseau | Historique en cache et GPS conservé temporairement ; commandes et annulations confirmées par le serveur, sans rejeu tardif automatique | À implémenter et vérifier |
| Sécurité | Audit technique et tests adversariaux, puis revue indépendante avant les premières courses réelles | À réaliser |
| Ouverture | Critères du plan alpha tous bloquants : aucun risque critique ou élevé ouvert, scénarios critiques sur build signé, tests de sécurité éprouvés par fautes injectées, restauration vérifiée, Finance/SOS prêts et revue indépendante terminée | À démontrer |
| Arbitrages | Toute nouvelle décision est soumise au porteur avant application | Règle de conduite confirmée |
| Devis | Devis serveur enregistré, nominatif, utilisable une fois, valable 5 minutes configurables ; une répétition retrouve la même course | Implémenté ; tests API réels en cours |
| Recherche | Attribution retentée jusqu’à 3 minutes configurables puis fin explicite | À implémenter et vérifier |
| PIN | Stockage privé, lecture réservée au passager ; 5 échecs puis blocage de 5 minutes par course, échecs tracés sans le code | Confidentialité implémentée ; limitation à vérifier |
| Encaissement des frais | Créance en attente ; règlement complet et validation Finance avant crédit de la part chauffeur de 70 % | Implémenté ; vérification en cours |
| Règlements manuels | Cash ou versement externe ; référence unique et justificatif joint obligatoires ; Ops prépare, Finance ou superadmin valide | Implémenté en base ; API et console à intégrer |
| Clôture cash | À 4 h, solde positif : versement manuel en attente, jamais payé avant validation Finance du justificatif | À implémenter et vérifier |
| Distribution | Identifiants distincts « Teko Alpha » et « Teko Chauffeur Alpha » | À implémenter et vérifier |
| SMS/FCM | Aucun fournisseur SMS ni projet FCM disponible ; comparer Twilio et un fournisseur régional, puis petits essais Airtel/Moov avant choix | Dépendance externe ; aucun SMS payant autorisé |
| Échelle d’audit | Critique : prise de contrôle ou écriture financière non autorisée ; élevé : fuite KYC/GPS/PIN, contournement des règles de course ou de l’alpha ; autres impacts limités : moyen/faible, justification par constat | Confirmée |
| Invitations | Liste par numéro vérifié Supabase Auth ; Ops/superadmin la gèrent ; refus serveur des courses et de la mise en ligne hors invitation | Implémentée ; premiers tests d’usurpation et de révocation réussis |
| GPS local | Points non envoyés conservés 24 h maximum sur le téléphone | Intégration et tests en cours |
| GPS serveur | Positions précises de suivi conservées 7 jours puis supprimées automatiquement ; traces anonymisées cartographiques séparées | À implémenter et vérifier |
| Arrière-plan chauffeur | Service Android de localisation avec notification permanente tant que chauffeur en ligne ou course active ; arrêt hors ligne ou fin de course | À implémenter et vérifier sur appareils |
| Signature | Générer une clé dédiée à l’alpha, conservée hors Git pour les futures mises à jour | Clé créée localement ; sauvegarde sécurisée avant distribution encore ouverte |
| Refus Finance | Refus motivé, nouvelle version sous la même référence, historique conservé et une seule validation financière possible | Implémenté en base ; intégration et vérifications en cours |
| Dépendances | Correctifs de sécurité compatibles et migration MapLibre GL JS vers 6.4.1 validés | Next.js 16.3.8 / MapLibre 6.4.1 installés ; vérifications en cours |
| Droits admin | KYC : chauffeur concerné, Ops, superadmin ; finances globales : Finance/superadmin ; Ops prépare les dossiers | Contrôles serveur et tests ciblés intégrés |
| Activation chauffeur | Sept pièces KYC toutes validées par Ops et vérification physique avant activation | Intégré ; régression avec vrais fichiers réussie |
| GPS du banc USB | Positions fictives à Libreville uniquement dans les APK du banc USB, avec bandeau ; APK terrain en GPS réel | Intégration en cours ; validation terrain bloquante |
| Véhicule après KYC | Modification interdite au chauffeur ; Ops rouvre le dossier et impose une nouvelle vérification avant remise en ligne | Contrôles et parcours en cours |
| Candidat SMS régional | eSMS Africa à qualifier face à Twilio, sans engagement ni envoi payant | Confirmé ; devis et essais à autoriser ensuite |

Les responsables Finance/SOS et leurs créneaux restent ouverts. Les paramètres
financiers déjà validés restent la référence ; leur application opérationnelle
sans Airtel doit être précisée avec le porteur.

## Vue d'ensemble

| | Total | ⏳ En attente | ✅ Répondu | ➡️ Appliqué |
|---|---|---|---|---|
| Bloquantes ⛔ | 6 | 0 | 5 | 1 |
| Avant lancement | 11 | 0 | 1 | 10 |
| Ajustables | 9 | 0 | 0 | 9 |
| **Total** | **26** | **0** | **6** | **20** |

> ✅ = répondu, action hors dépôt en cours (séance tarifaire, démarches Airtel/juridique/SMS/hébergeur, seuil de couverture à chiffrer). ➡️ = réponse intégrée aux documents et à la configuration le 25 août 2026.

## Détail des 26 questions

Statuts : ⏳ en attente · ✅ répondu (réponse notée) · ➡️ appliqué (docs + maquettes à jour). « Défaut » = valeur qui s'applique sans réponse.

### ⛔ Bloquantes (conditionnent le démarrage)

| N° | Question (résumé) | Défaut / recommandation | Statut | Réponse client | Appliqué le |
|---|---|---|---|---|---|
| 5 | Valeurs par défaut (commission 15 %, frais annulation max(300 F, 20 %), part chauffeur 70 %, délai 12 s, no-show 5 min, urgence 4 h) | Valeurs maquettées | ➡️ | Les six valeurs validées telles quelles | 25 août |
| 7 | Grille tarifaire de départ | Séance de travail dédiée | ✅ | Séance de travail dédiée (simulateur + relevés terrain) | — |
| 11 | Compte marchand Airtel — qui porte, quand | Démarrer immédiatement | ✅ | Démarche lancée immédiatement côté client | — |
| 16 | Conseil juridique données personnelles — qui | Mandater un cabinet local | ✅ | Cabinet juridique gabonais mandaté dès maintenant | — |
| 21 | Fournisseur SMS OTP Gabon | Devis parallèles intl + régional | ✅ | Devis Twilio/Vonage + régional, test de délivrabilité Airtel/Moov | — |
| 22 | Hébergeur cartographie | Scaleway ou OVH (Paris) | ✅ | Scaleway ou OVH Paris, sous réserve de latence mesurée | — |

### Avant lancement

| N° | Question (résumé) | Défaut / recommandation | Statut | Réponse client | Appliqué le |
|---|---|---|---|---|---|
| 2 | Clôture 04 h : report ou remise à zéro | Report du résiduel | ➡️ | Report du résiduel + suspension automatique | 25 août |
| 3 | Payout : fréquence + seuil | Quotidien, sans seuil | ➡️ | Quotidien automatique à la clôture, sans seuil | 25 août |
| 6 | Prix ferme garanti ou ajustable | Prix ferme + marge | ➡️ | Prix ferme garanti, marge de prudence dans le calcul | 25 août |
| 9 | Destination cachée avant acceptation | Cachée, réévaluée en bêta | ➡️ | Cachée jusqu'à acceptation, réévaluée en bêta | 25 août |
| 10 | Règlements manuels : qui valide, délai | Rôle Finance, avant clôture | ➡️ | Rôle Finance, traitement avant la clôture de la nuit | 25 août |
| 13 | Seuil de couverture carto par zone | — | ✅ | Axes principaux + repères clés ; seuil chiffré à formaliser | — |
| 14 | Conservation des traces GPS | Anonymisation immédiate, 12 mois | ➡️ | Anonymisation immédiate, 12 mois (réserve juridique n° 16) | 25 août |
| 17 | Procédure SOS : qui est alerté | Équipe ops + engagement de rappel | ➡️ | Équipe opérations + engagement de rappel | 25 août |
| 18 | Vérification physique des chauffeurs | Oui, première vague | ➡️ | Oui, première vague à Libreville | 25 août |
| 25 | Libreville en premier | Confirmer | ➡️ | Libreville confirmé | 25 août |
| 26 | Android d'abord, iOS ensuite | Confirmer | ➡️ | Android uniquement confirmé, iPhone ensuite | 25 août |

### Ajustables (défaut appliqué, modifiable en console)

| N° | Question (résumé) | Défaut / recommandation | Statut | Réponse client | Appliqué le |
|---|---|---|---|---|---|
| 1 | Commission aussi sur Airtel Money | Oui, tous modes | ➡️ | Commission identique sur tous les modes | 25 août |
| 4 | Plafond de dette intra-journée | Non au lancement | ➡️ | Pas de plafond intrajournalier au lancement | 25 août |
| 8 | Effet des refus répétés chauffeur | Aucun en bêta, priorité douce ensuite | ➡️ | Aucun effet en bêta, puis priorité douce | 25 août |
| 12 | Seuil de détection route proposée | 10 passages / 5 chauffeurs / 3 sem. | ➡️ | ≥ 10 passages, ≥ 5 chauffeurs, 3 semaines | 25 août |
| 15 | Distance doublon de repères | 50 m | ➡️ | 50 mètres | 25 août |
| 19 | Budget widget data | 100 Mo, alertes 50/80 % | ➡️ | 100 Mo / alerte 50 % / critique 80 % validés | 25 août |
| 20 | Réglages mode économie | Table maquettée C-25 | ➡️ | Réglages maquettés validés (5 s, carte simplifiée, initiales) | 25 août |
| 23 | Tuiles de repli | MapTiler ou Stadia | ➡️ | MapTiler | 25 août |
| 24 | Cadence rebuild itinéraires | Nocturne + bouton manuel | ➡️ | Chaque nuit + bouton manuel dans la console | 25 août |

## Autres attentes vis-à-vis du client

| Attente | Statut |
|---|---|
| Accusé de réception du paquet (docx + 3 vidéos + PDF coûts) | ⏳ |
| Retour général sur les vidéos / maquettes (ton, identité visuelle) | ⏳ |
| Prix de référence terrain pour la séance tarifaire (question 7) | ⏳ |
| Contact désigné côté client pour les démarches Airtel (question 11) | ⏳ |

## Procédure au retour d'une réponse

1. Noter la réponse + date dans la table ci-dessus (statut ✅).
2. Reporter la décision dans `../product/05-questions-ouvertes.md` (« Décisions tranchées », datée).
3. Mettre à jour les artefacts impactés : maquette A-07 (défauts), `03-estimation-couts-ti.md` (21/22), `01-registre-risques.md` (R2/R7/R8…), PRD/règles métier si périmètre.
4. Passer le statut à ➡️ appliqué avec la date. Quand les 6 bloquantes sont ➡️ : lancer la Phase 0 du plan (`00-plan-execution.md` §4).

## Décisions complémentaires du 18 octobre 2026 — notifications et conservation KYC

- **Clôturé :** Expo Push Service retenu pour la couche commune Android/iOS.
  Projets alpha passager/chauffeur dans l'organisation existante Teko `teko241` ;
  Firebase `teko-firebase` sur le compte Google confirmé. Projets créés, configurations Android reçues et clé du compte FCM dédié
  associée aux deux projets Expo. Premier push réel reçu sur l’OPPO ; essais
  chauffeur, écran éteint et terrain encore ouverts.
- **KYC :** attendre une durée de conservation fixée par le conseil juridique.
  Aucune suppression automatique des pièces KYC à J+30 n'est ajoutée avant cet
  arbitrage. La désactivation du compte reste distincte de la conservation des
  justificatifs, dont la règle juridique demeure un point bloquant à documenter.
- **SMS :** comparer Twilio et eSMS Africa sur devis et petits essais Airtel/Moov,
  sans engagement, création de compte payant ni envoi facturé autorisé ici.

Voir [SMS et notifications](../plan/10-sms-et-notifications-alpha.md).

## Décisions complémentaires — départ manuel et sécurité Expo

- Départ par recherche de repère autorisé sans GPS et accessible même si le GPS
  est accordé ; le choix manuel ne doit pas être remplacé automatiquement.
- Protection renforcée Expo approuvée. Le robot dédié `teko-alpha-push`, rôle
  minimal Viewer dans `teko241`, est explicitement autorisé : lecture des projets
  de cette organisation, sans publication ni gestion des membres. Secret serveur
  hors Git/APK ; activation et essais à consigner après vérification.

## Confirmation de la prise en charge et activation Expo — 19 octobre 2026

- Suggestions conservées : si le départ change vers un repère suggéré,
  recalcul serveur du trajet et nouveau devis à confirmer avant commande.
  « Garder ma position » conserve exactement le départ initial.
- Le robot Viewer Expo autorisé et son jeton serveur sont créés ; protection
  renforcée activée dans teko241, vérifiée après rechargement et par refus
  d'un envoi sans autorisation. Secret hors Git et hors APK.
