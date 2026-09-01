# Teko — Questions ouvertes & décisions à arrêter

Points à trancher pour finaliser le produit. Regroupés par thème. Les décisions arrêtées sont déplacées dans la section « Décisions tranchées » avec leur date — on ne supprime jamais une question, on la clôt.

**Dernière mise à jour : 1ᵉʳ septembre 2026** (ajout §3 : plancher d'affichage des offres presque échues ; précédente : 18 août, clôture de la phase maquettes UX — voir `../design/06-maquettes.md`).

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
