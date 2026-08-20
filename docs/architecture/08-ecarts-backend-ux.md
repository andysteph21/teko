# 08 — Confrontation backend Supabase ↔ UX (79 maquettes)

**Date :** 20 août 2026 · **Méthode :** chaque écran/parcours des maquettes (`../design/maquettes/`) a été confronté aux 24 tables, 41 fonctions SQL et politiques RLS des 15 migrations (`../../supabase/migrations/`). Ce document liste ce qui est couvert, puis les écarts classés par gravité. Les écarts sont des **migrations à écrire**, pas des refontes — le socle (ledger, RLS, machine à états course) tient.

## ✔ Écarts comblés le 20 août 2026 (migrations 0016 → 0019)

Tous les écarts base-de-données sont comblés et couverts par les tests (56 pgTAP + 52 e2e verts) :

| Migration | Écarts | Contenu |
|---|---|---|
| `20260820100000_securite_grants` | **E-15, E-16** + failles d'audit | Grants DML aux rôles API (la RLS prend effet), `anon` désarmé, EXECUTE révoqué sur les fonctions internes (`set_service_mode`, `post_ledger`, `confirm_payment`…), garde `assert_admin_or_service` sur `daily_close` |
| `20260820100100_dispatch_offres` | **E-01** | `driver_presence` (heartbeat), `ride_offers`, cascade au plus proche, `respond_offer`/`offer_details` (destination cachée — anti-écrémage), `accept_ride` re-branché sur l'offre, `expire_stale_offers` |
| `20260820100200_compte_sos_favoris` | **E-04, E-05, E-06, E-08, E-09, E-10** | Suppression de compte (30 j + purge anonymisante), `trip_shares` (lien public à jeton), `incidents` (SOS/report/litiges + alerte ops), `saved_places`, `admin_invites` (réclamées à l'inscription), re-vérification d'inactivité |
| `20260820100300_frais_jobs_validations` | **E-02, E-03, E-07, E-11, E-13, E-14, E-17** | Frais d'annulation max(fixe, %) + no-show au ledger, `validate_kyc`, `validate_road_proposal`, notification du proposant de repère, bucket `landmarks`, **pg_cron** (clôture 03:00 UTC, expiration d'offres 15 s, courses planifiées, rappels, purge) |

Restent ouverts, hors périmètre base : **E-12** (activer l'OTP e-mail + choisir le fournisseur SMS — config Auth, question client n°21) et **R1** au registre des risques (signature du callback Airtel — Edge Function, lot 6). Le texte d'origine ci-dessous est conservé comme trace d'analyse.

## 1. Ce que le backend couvre déjà (conforme aux maquettes)

| Domaine UX | Écrans | Support backend |
|---|---|---|
| Inscription / profils / rôles | C-01→06, D-01→03 | `profiles` + trigger `handle_new_user`, gardes anti-élévation |
| KYC chauffeur self-service | D-04→08, D-08b, A-03 | `drivers`, `driver_documents` (statuts, note de refus), bucket privé `kyc`, RLS propriétaire/admin |
| Commande & estimation | C-08→12 | `estimate_price`, `request_ride` (repères, hints, RDV suggéré, PIN), `pricing_rules` versionnées |
| Cycle de course complet | C-13→17, D-10→14 | `accept_ride` → `mark_arrived` → `start_ride(PIN)` → `complete_ride` / `cancel_ride` ; `ride_events` immuable ; notifications à chaque transition |
| Solde journalier & urgence | D-15→17, A-05 | `ledger` append-only, `driver_balance`, `daily_close(04:00)`, `daily_statements`, `create_settlement_payment`, `confirm_payment` (idempotent), `maybe_reactivate_driver` |
| Paiement Airtel | C-16, D-14b | `payments` (machine à états), Edge Functions collect/callback/disburse/reconcile |
| Repères collaboratifs | C-26, C-31, A-04 | `landmarks`, `landmark_proposals` (photo_url), `propose_landmark`, `validate_landmark_proposal`, `nearest_landmarks`, `bump_landmark_usage` |
| Routes crowdsourcées | A-04 | `gps_traces`, `road_proposals` (seuils config), `road_segments` |
| Notes | C-17, D-14 | `ratings` bidirectionnelles, RLS participant |
| Admin : rôles, config, audit | A-07→10 | `admin_role` (ops/carto/finance/superadmin), `has_admin_role`, `app_config` + historique + gardes finance/superadmin, `audit_log`, `prevent_mutation` |
| Widget conso data | C-25 | `data_usage` (agrégat serveur optionnel) |
| Langue | C-30 | `profiles.locale` |

## 2. Écarts P0 — bloquants pour livrer les parcours maquettés

### E-01 · Dispatch / offres aux chauffeurs (D-10) — **l'écart le plus structurant**
Les maquettes montrent une **offre nominative avec compte à rebours 12 s et cascade** (invisible côté client). Le backend n'a **ni table `ride_offers`, ni timer, ni cascade** : `accept_ride` est un « premier arrivé, premier servi » sur une course `requested`. Pire : la politique RLS `rides_select_participant_or_admin` fait qu'**un chauffeur ne peut même pas voir les courses `requested`** — il ne peut accepter que s'il reçoit l'id par un autre canal, qui n'existe pas.
**À construire :** table `ride_offers` (ride, driver, expires_at, statut), fonction de sélection des chauffeurs éligibles (zone PostGIS + catégorie + présence), notification FCM de l'offre, expiration + passage au suivant (job), et `accept_ride` re-branché sur l'offre. C'est le chaînon entre `request_ride` et `accept_ride`.

### E-02 · Aucun ordonnanceur branché (jobs)
`daily_close` (04:00), la cascade d'offres, les rappels d'échéance (`reminder_window_min` en config mais inutilisé), la réconciliation paiements et le déclenchement des **courses planifiées** supposent tous des jobs. **Aucun `pg_cron` ni planification d'Edge Function n'existe dans les migrations.** Sans cela, `daily_close` ne tourne jamais — le modèle de solde journalier est inopérant en production.
**À construire :** migration `pg_cron` (daily_close 04:00 Africa/Libreville, expiration des offres, rappels, activation des courses planifiées à T-x) + planification de `payments-reconcile`.

### E-03 · Frais d'annulation jamais comptabilisés (C-14, A-07)
La décision produit (montant fixe **et/ou** pourcentage, paramétrable admin) est dans les maquettes et la clé `cancellation_fee` existe en config, le `ledger_kind='cancellation'` aussi — mais **`cancel_ride` ne poste aucun frais** : elle change le statut et journalise, c'est tout. `no_show`/`no_answer` (1 000 F au seed) ne débitent personne.
**À construire :** calcul du frais dans `cancel_ride` selon config (fixe/pourcentage/max), écriture ledger côté chauffeur lésé + paiement `cancellation_fee` côté client si Airtel.

### E-04 · Suppression de compte (C-28) — engagement légal affiché
L'écran C-28 promet : confirmation par code, **fenêtre de rétractation 30 jours**, restauration à l'identique, suppression du profil/favoris/historique, **conservation anonymisée des écritures financières**. Le backend n'a **rien** : ni `deletion_requested_at`, ni fonction de purge/anonymisation, ni job de purge à J+30, ni restauration à la reconnexion.
**À construire :** colonnes de cycle de vie sur `profiles`, `request_account_deletion` / `cancel_account_deletion`, job de purge anonymisante (préserve `ledger`/`payments`), blocage de connexion post-purge.

### E-05 · SOS, partage de trajet, incidents (C-13/C-13b/C-27, A-06, AM-02)
`ride_events.type` prévoit `'sos'` et `'share'` (simple journal), mais : **pas de jeton public de partage de trajet** (le lien SMS/WhatsApp de C-27 doit donner une vue temps réel sans compte), **pas de table d'incidents** pour « Signaler un problème — l'équipe vous rappelle en priorité », et donc **rien à afficher** dans la file SOS/litiges de l'admin (A-06) ni dans le « poste de garde » mobile (AM-02) qui promet SOS push → action.
**À construire :** `trip_shares` (token, expiration, RLS anonyme lecture seule), `incidents` (type sos|report, statut, assigné, sévérité), notification temps réel aux admins ops.

### E-15 · Aucun grant DML : les politiques RLS sont lettre morte — **découvert par les tests e2e**
Les privilèges par défaut du schéma `public` ne donnent aux rôles API (`anon`, `authenticated`, `service_role`) que `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` — **aucun SELECT/INSERT/UPDATE/DELETE n'est accordé sur aucune table**. Conséquences vérifiées : toutes les politiques RLS soigneusement écrites (rides, ratings, notifications, ledger…) sont **inatteignables** (`permission denied` avant même l'évaluation RLS) ; les écrans qui lisent directement les tables (historique C-18, cloche C-07, relevés D-16, notation C-17…) n'ont aucun chemin de données ; et le grant `TRUNCATE` à `anon` est une anomalie à retirer (non exploitable via PostgREST, mais sans raison d'être).
**À décider puis construire :** soit accorder les grants DML aux rôles API (les politiques RLS existantes prennent alors effet — c'est visiblement l'intention d'origine), soit assumer une API 100 % RPC et écrire les fonctions de lecture manquantes. Dans les deux cas : révoquer `TRUNCATE`.

### E-16 · `daily_close` sans garde — **faille avérée par les tests e2e**
`daily_close()` est `SECURITY DEFINER` et **n'importe quel utilisateur authentifié peut l'exécuter** (démontré : un compte client fraîchement créé la lance avec succès). Un tiers peut donc déclencher la clôture comptable à volonté, y compris avant 04:00, et faire basculer des chauffeurs en `overdue`/désactivation.
**À corriger immédiatement** (même famille que R1 au registre des risques) : exiger `is_admin()` ou le contexte service (`teko.service`), et révoquer EXECUTE aux rôles API.

## 3. Écarts P1 — fonctionnalités v1 maquettées, à faire avant leur écran

| # | Écart | Écrans | Détail |
|---|---|---|---|
| E-06 | **Lieux favoris** | C-08, C-19 | Aucune table `saved_places` (domicile, travail, favoris) — l'accueil maquette des raccourcis qui n'ont nulle part où vivre |
| E-07 | **Courses planifiées : déclenchement** | C-10 | `rides.scheduled_at` accepté par `request_ride`, indexé… et plus rien : aucun job ne bascule la course en dispatch à l'approche de l'heure (dépend d'E-01 + E-02) |
| E-08 | **Litiges / support** | A-06, C-27 | Pas de table `disputes`/tickets ; l'onglet « Litiges » de l'admin n'a pas de source de données (fusionne naturellement avec `incidents` d'E-05) |
| E-09 | **Invitations équipe admin** | A-08 | Les gardes de rôle existent, mais aucune trace des **invitations en attente** (numéro + rôle) maquettées ; à porter par une table `admin_invites` ou le flux d'invitation Supabase Auth + métadonnées |
| E-10 | **Re-vérification après 1 mois d'inactivité** (numéros recyclés) | décision produit | Rien ne trace la dernière activité ni ne force une re-vérification OTP à la reconnexion tardive |
| E-11 | **Bucket photos de repères** | C-26 | `landmark_proposals.photo_url` existe mais seul le bucket privé `kyc` est créé — il manque un bucket `landmarks` (upload proposant, lecture publique après validation) |
| E-17 | **Notification du proposant de repère** | C-26, C-31 | « Vous serez notifiée du résultat » : `validate_landmark_proposal` ne poste aucune notification (vérifié e2e) |

## 4. Écarts P2 — mineurs ou hors-schéma

- **E-12 · OTP e-mail (secours MVP)** : décision actée, purement config Auth (activer email+OTP dans `config.toml`/dashboard) — rien en base, à ne pas oublier en staging. Le fournisseur SMS reste la question ouverte n°21.
- **E-13 · Validation des routes proposées** : `road_proposals` a le statut et `reviewed_by`, mais pas d'équivalent de `validate_landmark_proposal` (fusion vers `road_segments` + reconstruction Valhalla). L'admin peut faire un update direct ; une RPC dédiée journaliserait et déclencherait le pipeline carto proprement.
- **E-14 · `profiles.role` vs onboarding chauffeur** : un inscrit reste `client` tant qu'un admin ne le passe pas `driver` ; le moment exact du flip (à la validation KYC ?) n'est écrit nulle part — à fixer dans une RPC `validate_kyc` qui fait les deux atomiquement.

## 5. Synthèse

Le socle transactionnel est solide et fidèle aux maquettes pour le cœur (course, solde, repères, admin). Les écarts se concentrent sur **quatre familles** : (1) l'**orchestration temporelle** — dispatch avec cascade, jobs planifiés, courses planifiées — totalement absente ; (2) la **surface d'accès** — grants DML manquants (E-15) et garde absente sur `daily_close` (E-16), tous deux révélés par les tests e2e ; (3) le **cycle de vie du compte et la sécurité des personnes** — suppression 30 j, SOS/partage/incidents ; (4) des **petites tables de confort** promises par les écrans (favoris, invitations, litiges). Ordre de traitement recommandé : **E-16 immédiatement** (faille), E-15 + E-01 + E-02 (rend le produit opérable), puis E-03/E-04/E-05 (engagements affichés au client), puis P1 au fil des lots d'écrans.

> Les tests e2e (`../../supabase/tests/e2e/`) matérialisent une partie de ces constats : le chauffeur des tests reçoit l'id de course « hors bande », précisément parce qu'E-01 n'existe pas encore.
