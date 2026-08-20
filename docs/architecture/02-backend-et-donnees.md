# 02 — Backend Supabase & modèle de données

## 1. Services Supabase utilisés

- **Auth** — inscription/connexion par **OTP SMS** (numéro de téléphone), e-mail optionnel. Un fournisseur SMS est branché comme provider (à sélectionner pour le Gabon ; voir questions ouvertes). Les rôles applicatifs (client, chauffeur, admin) sont portés par la table `profiles` + claims.
- **Postgres 17** — base relationnelle + **PostGIS** (géométries : positions, routes, zones) + index géospatiaux.
- **Realtime** — diffusion des positions et des changements d'état de course ; présence (chauffeurs en ligne).
- **Edge Functions (Deno)** — toute la logique sensible : calcul du prix final, mutations de solde, intégration Airtel, webhooks de paiement, jobs planifiés.
- **Storage** — documents KYC (accès restreint), photos de véhicules/profil.
- **RLS (Row Level Security)** — isolation stricte des données par utilisateur/rôle.

## 2. Principes de données

- **Source de vérité du solde = journal `ledger`** (écritures immuables). Le solde courant d'un chauffeur est la somme de ses écritures ; on **ne met jamais à jour un montant « en place »**.
- **Géométries en PostGIS** (SRID 4326) pour positions, routes (`LineString`), zones (`Polygon`).
- **Journalisation** systématique des transitions de course (`ride_events`) et des actions admin (`audit_log`).
- **Jour ouvré (business day)** ancré sur la coupure **04:00 Africa/Libreville** : une fonction `business_day(ts)` rattache chaque transaction au bon jour pour le modèle de solde journalier.

## 3. Modèle de données (tables principales)

> Présentation logique ; les types exacts et contraintes seront fixés dans les migrations SQL. PK = clé primaire, FK = clé étrangère.

### Comptes & profils
- **`profiles`** — `id` (FK auth.users), `role` (client|driver|admin), `phone`, `email?`, `full_name`, `photo_url?`, `locale` (def. `fr`), `created_at`.
- **`drivers`** — `id` (FK profiles), `kyc_status` (pending|validated|rejected), `is_active`, `deactivated_reason?` (overdue_balance|admin|…), `rating_avg`, `categories` (text[]: eco|moto|confort|covoiturage), `gps_consent` (bool), `current_balance_cache` (numéraire indicatif, recalculé depuis `ledger`).
- **`driver_documents`** — `id`, `driver_id` (FK), `type` (id_card|license|registration|insurance|vehicle_photo|criminal_record|profile_photo), `storage_path`, `status`, `reviewed_by?`, `reviewed_at?`, `note?`.
- **`vehicles`** — `id`, `driver_id` (FK), `category`, `plate`, `photo_url`, `created_at`.

### Référentiels & tarification
- **`zones`** — `id`, `name`, `geom` (Polygon), `is_active`, `coverage_status` (insufficient|ready). Ouverture du service par zone.
- **`pricing_rules`** — `id`, `category`, `base_fare`, `per_km`, `per_min`, `min_fare`, `multipliers` (jsonb: nuit/zone), `valid_from`. Versionné (historisé).
- **`config`** — paramètres globaux (commission, frais d'annulation, heure d'échéance=04:00, fenêtre de rappel, seuils de détection de routes, seuil badge 4.5, seuil/fréquence payout). Modifs journalisées.

### Courses
- **`rides`** — `id`, `client_id` (FK), `driver_id?` (FK), `category`, `status` (requested|accepted|enroute|arrived|started|completed|cancelled_client|cancelled_driver|no_show|no_answer|failed), `scheduled_at?` (null = immédiat), `origin_geom` (Point), `dest_geom` (Point), `origin_landmark_id?` (FK landmarks), `dest_landmark_id?` (FK landmarks), `origin_hint?` (text: « derrière », « à côté de »…), `dest_hint?` (text), `meeting_landmark_id?` (FK landmarks: point de rendez-vous), `distance_est`, `duration_est`, `price_est`, `price_final?`, `payment_method` (cash|airtel), `pin_code`, `created_at`, `accepted_at?`, `started_at?`, `completed_at?`, `cancel_reason?`.
- **`ride_events`** — `id`, `ride_id` (FK), `type`, `at`, `actor`, `meta` (jsonb). Journal immuable du cycle de vie (audit, litiges, métriques).
- **`ride_locations`** — positions live (échantillonnées) ; rétention courte. Diffusion principalement via Realtime ; persistance limitée pour litiges/reconstruction.

### Finance (cœur du modèle)
- **`payments`** — `id`, `ride_id?` (FK), `driver_id?`, `kind` (ride_collection|driver_settlement|payout|cancellation_fee|refund), `provider` (airtel), `direction` (in|out), `amount`, `currency` (XAF), `partner_txn_id` (**clé d'idempotence**, unique), `provider_txn_id?`, `status` (initiated|pending|success|failed|ambiguous), `raw` (jsonb), `created_at`, `updated_at`.
- **`ledger`** — `id`, `driver_id` (FK), `business_day` (date), `kind` (commission_due|mobile_credit|settlement|payout|cancellation|adjustment), `amount_signed` (négatif = dette envers Teko), `balance_after`, `ride_id?`, `payment_id?`, `created_at`. **Immuable**, source de vérité du solde.
- **`daily_statements`** — `id`, `driver_id` (FK), `business_day`, `opening`, `closing`, `total_commission`, `total_mobile_credit`, `settled_amount?`, `payout_amount?`, `status` (open|settled|overdue|paid_out). Généré à la clôture 04:00.

### Cartographie
- **`road_segments`** — `id`, `geom` (LineString), `source` (osm|admin|proposed), `status` (draft|validated|rejected), `attributes` (jsonb: sens, type, praticabilité), `created_by?`, `validated_by?`, `created_at`. Couche Teko routable.
- **`road_proposals`** — `id`, `geom`, `support_count`, `distinct_drivers`, `window_start`, `window_end`, `status` (proposed|validated|rejected), `derived_from` (jsonb). File de revue admin.
- **`gps_traces`** — `id`, `driver_id` (FK), `ride_id?`, `points` (geometry/temporel), `consented` (bool), `created_at`. Matière première du pipeline (agrégée/anonymisée ensuite).
- **`landmarks`** — `id`, `name`, `aliases` (text[]), `category` (fuel_station|roundabout|market|church|school|pharmacy|bar|building|junction|other), `geom` (Point), `photo_url?`, `zone_id?` (FK zones), `salience` (numeric: score connu/visible), `usage_count` (int: fois choisi comme repère/destination), `source` (admin|driver|client), `status` (proposed|validated|rejected), `created_by?`, `validated_by?`, `created_at`. Couche de repères pour adressage et guidage.
- **`landmark_proposals`** — `id`, `landmark_id?` (si rattaché à un existant), `name`, `category`, `geom`, `aliases`, `photo_url?`, `proposed_by`, `role` (driver|client), `status` (proposed|validated|rejected|merged), `reviewed_by?`, `created_at`. File de revue admin (anti-doublon/fusion).

### Qualité, notifications, technique
- **`ratings`** — `id`, `ride_id` (FK), `from_user`, `to_user`, `stars` (1-5), `comment?`, `created_at`.
- **`devices`** — `id`, `user_id` (FK), `push_token`, `platform` (android|ios), `last_seen`.
- **`notifications`** — `id`, `user_id` (FK), `type`, `payload` (jsonb), `created_at`, `read_at?`.
- **`data_usage`** — `id`, `user_id` (FK), `day`, `bytes_estimated`. Alimente le widget conso (mesure surtout côté app ; agrégat optionnel).
- **`audit_log`** — `id`, `actor` (admin), `action`, `entity`, `entity_id`, `before`, `after`, `at`. Traçabilité des actions admin (KYC, paramètres, validation routes, finance).

## 4. Sécurité d'accès (RLS, esquisse)

- **Client** : lit/écrit ses propres `rides`, `ratings`, `profiles` ; ne voit jamais le solde ni les documents d'autrui.
- **Chauffeur** : lit ses `rides` assignées, son `ledger`, ses `daily_statements`, ses `driver_documents` ; écrit ses `gps_traces` (si consentement).
- **Admin** : accès élargi selon **rôle** (ops/carto/finance), borné par des politiques et journalisé. Les opérations financières et de validation passent par des **Edge Functions** (jamais d'écriture directe du solde côté client).
- **Documents KYC** : Storage privé, URLs signées de courte durée, accès admin uniquement.

## 5. Edge Functions (logique serveur)

| Fonction | Rôle |
|---|---|
| `price-quote` | Estimation de prix (appel routing + `pricing_rules`) — autorité serveur |
| `ride-complete` | Calcule le prix final, écrit `payments`/`ledger` de façon **atomique** |
| `airtel-collect` | Encaissement client→Teko / règlement chauffeur→Teko (USSD Push) |
| `airtel-disburse` | Payout Teko→chauffeur |
| `airtel-callback` | Réception/validation des callbacks signés Airtel |
| `payments-reconcile` | Réconciliation des statuts pending/ambigus (enquiry) |
| `daily-close` | Clôture 04:00 : relevés, désactivations, déclenchement payouts |
| `road-detect` | Génère les `road_proposals` depuis les `gps_traces` (map-matching) |
| `guidance` | Transforme un itinéraire (manœuvres Valhalla) en **instructions par points de repère** (sélection du repère saillant à chaque manœuvre) |
| `landmark-suggest` | Suggère un **point de rendez-vous** (repère saillant proche de la prise en charge) |
| `notify` | Envoi des notifications push (FCM) |

## 6. Jobs planifiés

- **`daily-close`** à 04:00 Africa/Libreville (clôture, désactivations, payouts).
- **`payments-reconcile`** périodique (rattrape les transactions `pending`/`ambiguous`).
- **`road-detect`** périodique (traces GPS → propositions).
- **`reminders`** (rappels d'échéance avant 04:00, rappels d'évaluation).

> Ordonnancement via le planificateur Supabase (cron) déclenchant les Edge Functions correspondantes. Idempotence requise (un job rejoué ne double pas les effets).
