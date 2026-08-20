# Tests de la base de données Teko — catalogue & intentions

Documentation de chaque test automatisé : **ce qu'il vérifie** et **pourquoi il existe**.
Deux suites : **pgTAP** (56 tests, exécution réelle sur Postgres) et **Deno** (4 tests, logique paiement).

## Comment exécuter
```bash
# depuis la RACINE du projet (bug CLI si lancé depuis supabase/)
supabase db reset      # applique migrations + seed
supabase test db       # 56 tests pgTAP
deno test supabase/functions   # 4 tests unitaires (logique paiement)
```

## Philosophie
- La **logique métier sensible** (solde, clôture, tarif, cycle de vie, repères) vit dans des fonctions Postgres : on la teste donc **au plus près de la vérité**, en exécution réelle (pas seulement en syntaxe).
- Chaque test tourne dans une **transaction annulée** (`rollback`) : aucune donnée résiduelle.
- Les fixtures emploient des **noms dédiés** (préfixe `ZZ`) pour rester robustes au `seed`.
- Conventions pgTAP : `throws_ok(sql, errcode, NULL, desc)` (on vérifie le **SQLSTATE**, pas le texte) ; l'identité (`auth.uid()`) est simulée via `request.jwt.claims`.

---

## `00_schema.test.sql` — structure & invariants (15 tests)

| # | Vérifie | Pourquoi |
|---|---|---|
| 1‑8 | Présence des tables `profiles`, `drivers`, `rides`, `payments`, `ledger`, `landmarks`, `road_segments`, `daily_statements` | Détecter immédiatement une migration cassée/oubliée : ce sont les tables structurantes du MVP. |
| 9 | Colonne `ledger.amount_signed` | C'est la colonne pivot du modèle financier (montant signé) ; sa disparition casserait le solde. |
| 10 | Colonne `rides.origin_landmark_id` | Garantit que l'**adressage par point de repère** est bien inscrit dans le schéma. |
| 11‑12 | `business_day('03:59')` = J‑1 et `business_day('04:00')` = J (Africa/Libreville) | La **coupure de 4 h** conditionne tout le solde journalier ; une erreur rattacherait les transactions au mauvais jour. |
| 13‑14 | `UPDATE`/`DELETE` sur `ledger` rejetés (P0001) | **Intégrité financière** : le grand livre est append‑only, on ne réécrit jamais un solde. |
| 15 | Un non‑admin ne peut pas changer de rôle (P0001) | **Anti‑escalade de privilèges** (la garde de rôle fonctionne). |

## `01_rls.test.sql` — isolation (Row Level Security) (6 tests)

| # | Vérifie | Pourquoi |
|---|---|---|
| 1 | Le client A voit sa propre course | Un utilisateur doit accéder à ses données. |
| 2 | Seuls les repères **validés** sont visibles | Les propositions non validées ne doivent pas fuiter (modération). |
| 3 | Un client ne lit **aucune** écriture du `ledger` | Cloisonnement financier (données chauffeur/Teko). |
| 4 | A ne peut pas créer une course **au nom de B** (42501) | Empêcher l'usurpation d'identité (politique `WITH CHECK`). |
| 5 | Le client B ne voit pas la course de A | Isolation stricte entre clients. |
| 6 | Un chauffeur ne peut pas **s'auto‑activer** (P0001) | L'activation/KYC reste une prérogative admin/service, pas du chauffeur. |

## `02_balance.test.sql` — moteur de solde (6 tests)

Reproduit l'exemple chiffré des règles métier avec **commission 15 %**.

| # | Vérifie | Pourquoi |
|---|---|---|
| 1 | `commission_amount(2000)` = 300 | Le calcul de commission (15 %) est correct. |
| 2 | Course **cash** 2000 → solde −300 | Le cash crée une **dette** (commission due) ; signe négatif correct. |
| 3 | Course **mobile** 3000 → solde +2250 | Le paiement mobile crédite le chauffeur de `P − commission` ; le solde cumule. |
| 4‑5 | Cash 1500 puis 5000 → +2025 puis +1275 | La séquence cumulative (`balance_after`) reste exacte au fil des écritures. |
| 6 | `driver_balance` = 1275 | Le **solde courant** est cohérent avec la somme du journal. |

## `03_daily_close.test.sql` — clôture journalière (7 tests)

| # | Vérifie | Pourquoi |
|---|---|---|
| 1 | `daily_close()` traite 2 chauffeurs | La clôture parcourt bien les comptes ayant de l'activité. |
| 2‑3 | Chauffeur A (solde −1000) **désactivé**, motif `overdue_balance` | Sanction automatique d'un solde négatif à l'échéance + traçabilité du motif. |
| 4‑5 | Relevé de A = `overdue`, `closing` = −1000 | Le relevé journalier reflète exactement la situation. |
| 6 | Un **payout** de 2000 est enqueué pour B (solde +) | Teko doit reverser le solde positif au chauffeur. |
| 7 | Relevé de B = `paid_out` | Statut de relevé correct côté créance. |

## `04_rides.test.sql` — tarification & cycle de vie (9 tests)

| # | Vérifie | Pourquoi |
|---|---|---|
| 1 | `estimate_price('eco',5km,10min)` = 2000 | Tarification déterministe à partir du barème (estimation GPS). |
| 2 | `request_ride` → statut `requested` | Création de course par le client. |
| 3 | Code **PIN à 4 chiffres** généré | Sécurité d'appariement (le client devra le communiquer). |
| 4 | `accept_ride` → `accepted` | Prise en charge par un chauffeur **autorisé** (KYC validé, actif, catégorie desservie). |
| 5 | `mark_arrived` → `arrived` | Transition d'état contrôlée (chauffeur assigné). |
| 6 | **PIN erroné rejeté** (P0001) | On ne démarre pas sans le bon code (anti‑erreur / anti‑fraude). |
| 7 | PIN correct → `started` | Démarrage légitime de la course. |
| 8 | `complete_ride` → `completed` | Clôture de course. |
| 9 | Course cash → solde chauffeur −300 | L'**effet financier** de fin de course (commission) est bien posté au journal. |

## `05_landmarks_notifications.test.sql` — repères & notifications (6 tests)

| # | Vérifie | Pourquoi |
|---|---|---|
| 1 | `suggest_meeting_landmark` renvoie le repère proche | Proposer un **point de rendez‑vous** pertinent (réduit les malentendus de localisation). |
| 2 | `reverse_geocode_landmark` → « près de \<repère\> » | **Adressage par repère** (pas d'adresse fiable au Gabon). |
| 3 | `nearest_landmarks` classe par saillance puis distance | Choisir le **bon repère** pour le guidage. |
| 4 | `propose_landmark` crée une proposition (`proposed`) | Contribution collaborative (chauffeurs/clients). |
| 5 | `validate_landmark_proposal` (admin) publie le repère | **Validation admin** obligatoire avant exploitation. |
| 6 | `enqueue_notification` crée une notification | La file de notifications fonctionne. |

## `06_commission.test.sql` — commission réservée au superadmin (7 tests)

| # | Vérifie | Pourquoi |
|---|---|---|
| 1 | `is_superadmin()` = false pour un admin **finance** | Distinguer le plus haut droit des sous‑rôles admin courants. |
| 2 | `set_commission` refusée à l'admin finance (42501) | La commission engage directement les revenus : **réservée au superadmin** (RPC). |
| 3 | Écriture directe sur `app_config.commission` refusée à un non‑superadmin (42501) | La **garde** protège aussi le contournement par écriture table directe, pas seulement la RPC. |
| 4 | `is_superadmin()` = true pour le superadmin | Le plus haut droit est bien reconnu. |
| 5 | `set_commission('percent',12)` accepté pour le superadmin | Le superadmin **peut** paramétrer la commission. |
| 6 | `get_commission()` reflète la nouvelle valeur | L'écran admin relit la valeur effective. |
| 7 | Taux > 100 % rejeté (22023) | **Garde‑fou de saisie** (bornes de validité). |

---

## Tests Deno — logique de paiement (`supabase/functions/_shared/payments/payments_test.ts`, 4 tests)

| Test | Vérifie | Pourquoi |
|---|---|---|
| `resolveOutcome mappe les statuts` | success→confirm, failed→fail, pending/ambiguous→retry | Règle d'aiguillage centrale : décide quand muter le solde, **sans jamais doubler un paiement** (les cas incertains attendent la réconciliation). |
| `MockProvider.collect …` | Le statut simulé dépend du `partnerTxnId` | Permet des scénarios déterministes (succès/échec/attente) sans dépendre d'Airtel. |
| `MockProvider.disburse et enquire` | Cohérence des trois opérations | Garantir un comportement homogène collect/disburse/enquire. |
| `MockProvider.verifyCallback` | Parsing du corps de callback (valide/invalide) | Base de la confirmation asynchrone côté `airtel-callback`. |

> Les Edge Functions réelles (Airtel) ne sont pas testables sans identifiants/déploiement ; on teste donc la **logique pure** (aiguillage, idempotence, parsing) via le fournisseur simulé. L'intégration end‑to‑end se fera en sandbox Airtel.
