# Teko — Questions ouvertes & décisions à arrêter

Points à trancher pour finaliser le produit. Regroupés par thème. Les décisions arrêtées sont déplacées dans la section « Décisions tranchées » avec leur date — on ne supprime jamais une question, on la clôt.

**Dernière mise à jour : 18 octobre 2026** (périmètre alpha confirmé par le porteur ; arbitrages précédents du 2 septembre conservés ci-dessous).

## Décisions du porteur du 18 octobre 2026 pour l’alpha

Réponses enregistrées dans [le suivi](../plan/04-suivi-client.md).
Le [plan alpha](../plan/08-plan-alpha.md) décrit les travaux et les preuves
attendues. Ces décisions définissent une cible à implémenter et à vérifier.

| Sujet | Décision |
|---|---|
| Public et territoire | Alpha fermée à Libreville avec de vraies courses et des utilisateurs invités. |
| Taille | Environ 20 chauffeurs. Nombre de passagers, durée, créneaux et responsables Finance/SOS encore ouverts. |
| Paiements | Cash uniquement. Paiements Airtel réels désactivés côté serveur. Règlements en cash ou versement externe : Ops prépare, Finance ou superadmin valide ; référence unique et justificatif joint obligatoires. |
| Planification | Courses immédiates uniquement pour l’alpha. Les courses programmées restent prévues au MVP ultérieur. |
| Hors réseau | Historique en cache et GPS conservé temporairement. Commandes et annulations confirmées uniquement par le serveur, sans rejeu tardif automatique. Cette décision amende, pour l’alpha, la file automatique de ces actions décrite au §4 des règles d’ingénierie. |
| Audit | Audit technique et tests adversariaux, puis revue indépendante avant les premières courses réelles. |
| Critères bloquants | Aucun risque critique ou élevé ouvert ; tous les scénarios critiques réussis sur build signé ; tests de sécurité éprouvés par fautes injectées ; restauration de sauvegarde vérifiée ; procédures Finance/SOS prêtes ; revue indépendante terminée. |
| Gouvernance | Soumettre tout nouvel arbitrage au porteur avant application. Une proposition ou une absence de réponse ne vaut pas décision. |
| Devis | Enregistré en base, lié au passager et au trajet, usage unique avec répétition idempotente ; validité configurable de 5 minutes. Le serveur calcule les métriques et le prix. |
| Recherche | Retenter les nouveaux chauffeurs éligibles ; fin de recherche à 3 minutes configurables. |
| Confidentialité du PIN | Stockage privé et lecture réservée au passager. Cinq erreurs maximum, puis blocage de cinq minutes par course ; échecs tracés sans enregistrer le code saisi. |
| Frais d’annulation | Créance en attente, aucun crédit chauffeur avant encaissement complet et validation Finance. Part chauffeur figée à la création de la créance. |
| Clôture cash | À 4 h, un solde positif prépare un versement manuel en attente ; statut payé seulement après validation Finance du justificatif. |
| Distribution | Applications alpha séparées : « Teko Alpha » et « Teko Chauffeur Alpha », identifiants distincts. |
| SMS et push | Aucun compte SMS ni projet Firebase disponible. Comparer Twilio et un fournisseur régional sur devis et petits essais Airtel/Moov avant sélection. Aucun compte payant ni SMS facturé autorisé à ce stade. |
| Gravité de l’audit | Critique : prise de contrôle ou écriture financière non autorisée ; élevé : fuite de KYC/GPS/PIN, contournement des règles de course ou de l’alpha. Moyen/faible : impact limité, justifié pour chaque constat. |
| Invitations | Liste par numéro de téléphone vérifié par Auth, gérée par Ops/superadmin ; refus serveur des courses et de la mise en ligne pour les non-invités. Le champ téléphone du profil ne fait pas foi. |
| GPS | File locale : 24 h maximum. Positions précises de suivi sur le serveur : 7 jours, suppression automatique. Les traces anonymisées de cartographie restent un traitement distinct. |
| Arrière-plan chauffeur | Service Android au premier plan avec notification permanente, actif pendant la disponibilité ou une course ; arrêt hors ligne ou fin de course. |
| Signature alpha | Clé dédiée générée localement et conservée hors Git ; même clé nécessaire pour les mises à jour. Sauvegarde sécurisée à organiser. |
| Correction des règlements | Finance peut refuser avec motif ; nouvelle version sous la même référence, historique conservé, une seule validation financière pour le dossier. |
| Correctifs de dépendances | Mises à jour de sécurité compatibles autorisées ; MapLibre GL JS web migré vers 6.4.1 avec vérification des interactions. Moteur Android distinct. |

Les décisions antérieures restent applicables en dehors de ces adaptations
explicites. Commission, prix ferme, part chauffeur des frais et clôture à 4 h
ne sont pas modifiés par le choix du cash seul.

## Décisions déjà validées (5 juin 2026 — rappel)
Périmètre MVP = ride-hailing seul ; déploiement national progressif ; auth OTP SMS (Supabase) ; **modèle solde journalier** ; paiements client = **cash + Airtel Money** (Moov Money reporté en version future) ; tarif estimé distance/temps GPS ; carte custom complète dès le MVP ; courses immédiates + programmées ; sécurité SOS + partage trajet + code PIN ; français d'abord (i18n prête) ; widget data + mode économie ; KYC avec casier judiciaire obligatoire ; frais d'annulation sur no-show/no-answer.

## Décisions tranchées le 18 août 2026 (phase UX)

| # | Question d'origine | Décision |
|---|---|---|
| 1 | Base de code frontend : adapter le template Taxido ou construire ? *(ex-§9)* | **Construction neuve** dans le monorepo `apps/` ; les templates Taxido restent une référence de flux uniquement. |
| 2 | Direction visuelle : dark néon du cahier des charges ? *(ex-§9)* | **Light-first violet→magenta** conformément à `design-tokens.json` ; le dark néon est définitivement abandonné. |
| 3 | Catégories MVP | **3 catégories : Éco, Moto-taxi, Confort.** Le covoiturage sort du MVP (reporté en vision future — règle de partage du prix à concevoir à ce moment-là). |
| 4 | Canal OTP de secours | **E-mail, MVP uniquement** (collecté en optionnel au profil, présenté comme filet de récupération). Sera retiré après le MVP. |
| 5 | Frais d'annulation : forme | **Configurables par l'admin** : montant fixe et/ou pourcentage de l'estimation (formule « max des deux » possible), plus une **part chauffeur** (défaut maquetté : 70 % si le chauffeur était en route). L'UI n'affiche jamais la formule, seulement le montant calculé en XAF avant confirmation. |
| 6 | Courses programmées en v1 ? | **Oui**, conservées au MVP (écran C-18). |
| 7 | Numéros prépayés recyclés | **Vérification douce après 1 mois d'inactivité** à la reconnexion (prénom ou dernière course) avant réouverture de l'historique. |
| 8 | Suppression de compte : fenêtre de rétractation | **30 jours**, puis anonymisation (écritures financières conservées — grand livre append-only). Chauffeur : solde à zéro requis avant demande. |
| 9 | Rôles admin séparés dès le départ ? *(ex-§8)* | **Oui** : ops / carto / finance / superadmin (enum `admin_role` en base), matrice de permissions maquettée (A-09), anti-auto-élévation, dernier superadmin protégé. |
| 10 | Plateformes au lancement *(ex-§8)* | **Android d'abord** (ADR-09 confirmée par la phase UX — maquettes 360×800). |
| 11 | Destination visible du chauffeur avant acceptation ? | **Cachée** (anti-écrémage) — décision UX à réévaluer si l'offre de chauffeurs est trop faible au lancement (voir question 3.4). |

Valeurs **par défaut maquettées, à confirmer avant le go-live** (réglables en admin, A-07) : délai d'acceptation chauffeur **12 s** ; attente passager absent **5 min** ; seuil d'urgence solde **4 h avant clôture** ; frais d'annulation **max(300 FCFA, 20 %)** ; part chauffeur **70 %** ; commission **15 %**.

## Décisions client du 25 août 2026 (réponses au document du 18 août)

Les **26 questions** ont reçu réponse (`docs/plan/04-suivi-client.md` fait
foi du détail). **Les 6 bloquantes sont levées** — la Phase 0 démarre.

| N° | Décision |
|---|---|
| 1 | Commission **identique** espèces et Airtel Money |
| 2 | Clôture 04 h : **report du résiduel** + suspension automatique |
| 3 | **Versement quotidien automatique** à la clôture, **sans seuil** (config `payout_threshold = 0`) |
| 4 | Pas de plafond de dette intrajournalier au lancement |
| 5 | ⛔ Les six valeurs par défaut **validées** : commission 15 % · annulation max(300 F, 20 %) · part chauffeur 70 % · acceptation 12 s · no-show 5 min · urgence 4 h |
| 6 | **Prix ferme et garanti**, marge de prudence dans le calcul |
| 7 | ⛔ Grille tarifaire → **séance de travail dédiée** (simulateur + relevés terrain) — seul point encore ouvert |
| 8 | Taux d'acceptation : aucun effet en bêta, puis **priorité douce** |
| 9 | **Destination cachée** jusqu'à acceptation (réévaluée en bêta) |
| 10 | Règlements manuels validés par le rôle **Finance**, avant la clôture de la nuit |
| 11 | ⛔ Démarche compte marchand **Airtel lancée immédiatement** côté client |
| 12 | Route inconnue proposée à validation : **≥ 10 passages, ≥ 5 chauffeurs, 3 semaines** (config) |
| 13 | Ouverture de zone : axes principaux + repères clés validés ; **seuil chiffré à formaliser** ensemble |
| 14 | Traces GPS : **anonymisation immédiate, conservation 12 mois** (réserve juridique n° 16) |
| 15 | Doublon de repères : **50 m** (config `landmark_duplicate_m`) |
| 16 | ⛔ **Cabinet juridique gabonais mandaté dès maintenant** (protection des données) |
| 17 | SOS → **équipe opérations** avec engagement de rappel (permanence 24/7 plus tard) |
| 18 | **Vérification physique** des chauffeurs de la première vague à Libreville |
| 19 | Budget data confirmé : **100 Mo/mois, alerte 50 %, critique 80 %** |
| 20 | Mode économie : réglages maquettés **validés** (5 s, carte allégée, initiales) |
| 21 | ⛔ SMS OTP : **devis parallèles** Twilio/Vonage + acteur régional, décision sur **délivrabilité mesurée** Airtel/Moov |
| 22 | ⛔ Hébergeur carto : **Scaleway ou OVH (Paris)**, sous réserve d'une **mesure de latence réelle** depuis Libreville |
| 23 | Cartes de secours : **MapTiler** |
| 24 | Reconstruction des itinéraires : **chaque nuit + bouton manuel** dans la console |
| 25 | **Libreville** confirmée première zone |
| 26 | **Android uniquement** au lancement, iPhone ensuite |

## Arbitrages du 2 septembre 2026 (suite de la validation générale du 1ᵉʳ septembre)

Écarts code/produit relevés en validation de bout en bout, tranchés **dans le sens des décisions client déjà validées** (aucune règle nouvelle) :

| # | Écart constaté | Arbitrage |
|---|---|---|
| A | `cancel_ride` créditait **100 %** du frais d'annulation au chauffeur ; la décision n° 5 (25 août) fixe la **part chauffeur à 70 %**. | **Le code s'aligne sur la décision** (migration `20260902090000`) : le client doit le frais entier (C-21, notification, encaissement Airtel inchangés) ; le chauffeur est crédité de `driver_share_percent` (70 %, clé `cancellation_fee`, réglable A-07), arrondi à l'unité ; le reste revient à Teko. Appliqué à tous les frais (annulation client après acceptation, no-show, no-answer). Au passage : `confirm_payment` ne recréditait plus le frais Airtel une seconde fois (double crédit latent). |
| B | « Passager absent » partait en `cancelled_driver` avec motif texte : le frais no-show (1 000 F) **n'était jamais appliqué** (dette n° 3 du doc 12 — perte de paie chauffeur). | **Statut `no_show` exposé** dans `@teko/api-client` (`cancelRide(..., status)`) et utilisé par l'app chauffeur (D-11b). 1 000 F dus par le client, 700 F crédités au chauffeur. |
| C | Airtel Money proposé en C-10 alors que le compte marchand n'est pas ouvert hors sandbox (R1 signature des callbacks + idempotence rejouée non validées). | **Airtel masqué côté client, temporairement** (`apps/client/src/features/booking/payment-methods.ts`, une ligne à remettre). Pas une décision produit : le MVP reste « cash + Airtel Money » (5 juin). Le règlement chauffeur D-16 par Airtel n'est pas touché (fournisseur simulé en local). |
| D | Un compte purgé (J+30) restait **pleinement utilisable** : l'identité GoTrue survivait à l'anonymisation. | Edge Function `account-purge` (migration `20260902100000`) : soft-delete GoTrue (numéro libéré, sessions révoquées), déclenchée à la fin de la purge et par un job de rattrapage quotidien. |

## 1. Modèle financier
- La commission s'applique-t-elle **aussi** aux paiements mobile money, ou seulement au cash ? (Hypothèse actuelle : commission dans les deux cas ; le mobile crédite `P − C`.)
- **Clôture quotidienne** : remise du solde à zéro après règlement, ou **report** du résiduel non réglé ? *(Les maquettes D-15 illustrent un report — à confirmer.)*
- **Payout** : fréquence (quotidien / hebdo ?) et **seuil minimal** de décaissement ?
- **Plafond de dette intra-journée** : faut-il bloquer un chauffeur avant 4h si sa dette dépasse un seuil ? (Décision retenue : échéance quotidienne uniquement — à confirmer comme définitif.)
- **Fenêtre de rappel** d'échéance (combien de temps avant 4h ? Le seuil d'« urgence » maquetté est 4 h).

## 2. Mobile money — Airtel Money (MVP)
**Décision : le MVP intègre Airtel Money uniquement ; Moov Money est reporté à une version future.** Restent à confirmer côté Airtel :
- Cohérence des en-têtes **X-Country / X-Currency** (exemples doc semblant inversés : attendu pays GA, devise XAF).
- Comportement exact d'**idempotence** sur rejeu d'un même `transaction.id`.
- **Rate limits**, montants min/max, **frais** par transaction, délai d'**activation production**, format MSISDN gabonais.
- Sécurisation des **callbacks** (variante authentifiée + message signing) — **la vérification de signature est un pré-requis go-live** (voir `../plan/01-registre-risques.md`, R1).
- Procédure de **repli manuel** (versement + preuve) : qui valide, sous quel délai. *(Maquettée côté chauffeur D-16 et admin A-05 — procédure opérationnelle à écrire.)*

*Version future (Moov Money) :* lancer tôt l'**accord marchand B2B** avec Moov Africa Gabon (pas de portail self-service) ; conserver l'**abstraction paiement commune**.

## 3. Tarification & appariement
- **Prix ferme** affiché avant la course, ou **fourchette** ajustée à la fin ? *(Les maquettes affichent un prix ferme — « prix fixe, aucun marchandage » — à confirmer comme engagement produit.)*
- Valeurs par défaut : base, prix/km, prix/min, **minimum**, multiplicateurs par catégorie, suppléments (nuit, zone) ? *(Le seed contient des valeurs de travail.)*
- Effet des **refus répétés** côté chauffeur : le taux d'acceptation (affiché en D-18) influence-t-il la priorité de cascade ?
- Réévaluation éventuelle de la **destination cachée** avant acceptation (décision 11) selon la liquidité au lancement.
- **Plancher d'affichage d'une offre presque échue** (chauffeur, ajout 1ᵉʳ sept. 2026) : le repli au retour au premier plan peut présenter une offre à moins de 2 s de l'échéance — modal éclair, illisible et inacceptable à temps (cf. doc ingénierie 10, §8 Q1). Ne pas l'afficher sous un seuil (~2-3 s) et la compter « manquée » ? Seuil à trancher.

## 4. Cartographie
- Confirmation du **fond OSM** et des conditions d'utilisation/tuiles (auto-hébergement pour la sobriété data).
- **Seuils de détection** d'une route proposée (nb de passages, nb de chauffeurs distincts, fenêtre temporelle). *(Maquette A-04 : exemple à 14 traces / 9 chauffeurs / 3 semaines.)*
- **Seuil de couverture** pour ouvrir une zone au service.
- Politique de **conservation/anonymisation** des traces GPS.
- Seuil de l'**alerte doublon** de repères (maquette A-04 : 50 m) — à valider.

## 5. Sécurité & conformité
- Destinataire(s) du **SOS** : centrale Teko, contact de confiance, services d'urgence ? Procédure opérationnelle. *(Maquette C-27 : appel secours + partage live + signalement Teko.)*
- Exigences locales de **protection des données** (Gabon) : consentement, durées de conservation (dont la rétractation 30 j et la purge des documents KYC après suppression), droits des personnes — validation juridique requise.
- **KYC physique** : faut-il un point de vérification en personne des chauffeurs en complément de l'upload ?

## 6. Données & sobriété
- Méthode de **mesure** de la consommation data affichée par le widget (app seule vs système) et précision attendue. *(Maquettes : budget indicatif 100 Mo/mois, alerte 50 %, critique 80 % — à calibrer.)*
- Réglages exacts du **mode économie** (fréquence GPS 1 s → 5 s, résolution carte, désactivations) — la table de la maquette C-25 fait foi comme point de départ.

## 7. Notifications & SMS
- **Fournisseur SMS** pour l'OTP au Gabon (coût, fiabilité, sender ID) — **bloquant lot 3** (0.3 du plan).
- Service push : FCM (Android) — confirmer la cible iOS au lancement (Android-only d'abord ?).

## 8. Plateforme & déploiement
- Ordre de **déploiement géographique** : quelle agglomération en premier (Libreville pressenti — les maquettes l'assument) ?
- **Hébergeur carto** (Scaleway / OVH / AWS) — bloquant lot 2 (0.2 du plan).
- **Tuiles managées de repli** (MapTiler vs Stadia) — 0.6 du plan.
- **Cadence de rebuild Valhalla** (B4 du plan).

## Compléments alpha confirmés — 18 octobre 2026

- KYC réservé au chauffeur concerné, à Ops et au superadmin ; grand livre et
  relevés globaux réservés à Finance/superadmin. Ops prépare les règlements.
- Activation après validation des sept pièces et vérification physique.
- GPS fictif à Libreville autorisé uniquement sur le banc USB, signalé dans
  l’app. Les essais GPS réels à Libreville restent bloquants avant ouverture.
- Après validation KYC, le chauffeur ne modifie plus véhicule, plaque ou
  catégories ; Ops traite le changement avec nouvelle vérification avant
  remise en ligne.

- SMS : comparaison Twilio et eSMS Africa confirmée, sans engagement, avec qualification, devis et essais Airtel/Moov avant choix. Notifications : comparaison FCM/Expo expliquée pour Android et iOS ; arbitrage encore ouvert.

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

## Indisponibilité des tarifs — 19 octobre 2026

Le porteur valide un message distinct « Tarifs temporairement indisponibles »
lorsque le service de devis ne répond pas. Le message « Pas de connexion »
reste réservé à une absence de réseau constatée. Le réessai est manuel ; une
reconnexion ne déclenche aucune commande et ne relance pas ces devis échoués.

## Arrondis cash confirmés — 19 octobre 2026

- **Clôturé :** pour les nouvelles courses, arrondir les prix, frais
  d’annulation/non-présentation et commissions au multiple de **25 FCFA**
  le plus proche. Une égalité va vers le multiple supérieur : 112,50 → 125.
  Cette décision remplace la première proposition d’arrondi au franc.
- La part chauffeur des frais encaissés suit la même règle :
  300 × 70 % = 210 → **200 FCFA**, après encaissement complet et validation
  Finance. La créance conserve la part ainsi calculée.
- Les devis, créances et écritures antérieurs restent conservés sans recalcul.
- **Clôturé par la décision ci-dessous :** contrainte du pas de 25 sur les nouveaux dossiers de règlement
  saisis par Ops, en cash et/ou versement externe. Aucun justificatif
  d’encaissement réel ne doit être arrondi silencieusement.

## Règlements au pas de 25 — décision du 19 octobre 2026

**Clôturé :** les nouveaux dossiers Ops, y compris les révisions, imposent un
montant positif multiple de 25 FCFA, en cash comme en versement externe.
Aucun montant de justificatif n’est arrondi automatiquement, même à deux
décimales. Les dossiers antérieurs restent conservés à leur montant exact.
La garde est commune à la préparation des règlements et des versements.

## Chiffrage du mois d’essai — décisions du 22 octobre 2026

- **SMS :** le porteur retient eSMS Africa. Ce choix remplace la comparaison
  encore ouverte avec Twilio ; les conditions commerciales et les essais
  réels Airtel/Moov restent à confirmer. Aucun compte payant ni envoi facturé
  n’est engagé par la préparation du budget.
- **Stockage :** conserver Supabase pour l’instant. Aucun abonnement de
  stockage externe n’est ajouté au chiffrage ; la copie et la restauration
  des objets Storage restent à prévoir.
- **Hypothèses validées pour le budget :** dix chauffeurs Android, cent
  passagers invités, 500 SMS sur un mois, renvois et essais compris. Chiffrer
  le coût total, Supabase et Vercel inclus. Google Play est déjà payé.
- Expo EAS Build/Update et SMTP sont inclus dans l’estimation. Les offres
  Starter et Resend Free servent d’hypothèses de calcul, sans abonnement
  autorisé par ce seul document. OVH reste un candidat à évaluer depuis les
  réseaux de Libreville ; aucun classement de latence n’est acquis.
- Le budget des services et du domaine atteint 88 759 FCFA avec provision
  globale de 30 %, soit une enveloppe proposée de 90 000 FCFA. Le pays de
  facturation, les frais eSMS non publiés et les prestations humaines restent
  à préciser. Cette estimation n’autorise pas l’ouverture aux vraies courses.

Document : [Budget Teko pour un mois de tests](../../livrables/budget-alpha-un-mois-2026-10-22.docx).
