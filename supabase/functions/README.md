# Edge Functions — paiements mobiles (Airtel) & I/O externe

Logique d'I/O externe uniquement (la logique de solde vit dans Postgres). Le solde
n'est muté que par les RPC `confirm_payment` / `fail_payment` appelées ici.

## Structure
```
functions/
├─ _shared/
│  ├─ db.ts                     # client service-role + helpers (json, resolveMsisdn)
│  └─ payments/
│     ├─ provider.ts            # interface MobileMoneyProvider + resolveOutcome
│     ├─ mock.ts                # fournisseur simulé (tests/dev)
│     ├─ airtel.ts              # fournisseur Airtel (REST/OAuth2) — secrets requis
│     ├─ index.ts               # getProvider() selon PAYMENT_PROVIDER
│     └─ payments_test.ts       # tests unitaires Deno
├─ airtel-collect/              # encaissement (client/chauffeur -> Teko) : USSD Push
├─ airtel-disburse/             # décaissement (Teko -> chauffeur) : payout
├─ airtel-callback/             # callback Airtel -> confirm/fail
├─ payments-reconcile/          # rattrape les paiements pending/ambigus (enquiry)
├─ notify-push/                 # webhook pg_net -> push FCM (_shared/push)
└─ account-purge/               # webhook pg_net/pg_cron -> soft-delete GoTrue des comptes purgés (_shared/purge)
```

## Flux
- **Encaissement** : une RPC (`complete_ride` mobile, ou `create_settlement_payment`) crée une ligne `payments` (status `initiated`). `airtel-collect` initie le USSD Push ; la confirmation arrive par **callback** ou par **réconciliation**.
- **Payout** : `daily_close` enqueue un paiement `payout` ; `airtel-disburse` l'exécute.
- **Confirmation** : seules `confirm_payment`/`fail_payment` (Postgres) modifient le solde. Idempotence garantie par `partner_txn_id` (unique) et le court-circuit `status='success'`.
- **Purge de compte** : `purge_deleted_accounts` (pg_cron 02:30) anonymise côté métier puis POSTe sur `account-purge` (`app_config.purge_webhook_url`, secret `purge_webhook_secret`) ; rattrapage quotidien 02:45. La fonction soft-delete via `auth.admin.deleteUser(id, true)` chaque `pending_auth_purges()` : numéro/e-mail obfusqués (réinscription possible), sessions et refresh tokens révoqués — un jeton d'accès déjà émis reste valable jusqu'à son expiration (≤ 1 h).

## Variables d'environnement
| Variable | Rôle |
|---|---|
| `PAYMENT_PROVIDER` | `mock` (défaut) ou `airtel` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | client service-role |
| `AIRTEL_BASE_URL` | `https://openapiuat.airtel.ga` (staging) / `https://openapi.airtel.ga` (prod) |
| `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET` | OAuth2 |
| `AIRTEL_X_COUNTRY`, `AIRTEL_X_CURRENCY` | en-têtes pays/devise (**à confirmer** : GA / XAF) |
| `AIRTEL_RSA_PUBLIC_KEY` | clé publique Airtel (PEM, SPKI ou PKCS#1) — chiffrement du PIN à chaque appel |
| `AIRTEL_DISBURSE_PIN` | PIN de décaissement en clair (chiffré RSA PKCS#1 v1.5 par la fonction) |
| `AIRTEL_DISBURSE_PIN_ENC` | variante : PIN **déjà chiffré** (prioritaire sur les deux précédentes) |
| `AIRTEL_CALLBACK_TOKEN` | jeton « Callback With Authentication » (portail Airtel) — **sans lui, tout callback est rejeté** |
| `AIRTEL_CALLBACK_HMAC_SECRET` | optionnel : HMAC-SHA256 du corps attendue dans `X-Signature` (Message Signing — en-tête/format à confirmer en sandbox) |
| `PUSH_TRIGGER_SECRET` / `PURGE_TRIGGER_SECRET` | secrets partagés des webhooks `notify-push` / `account-purge` (doivent égaler `app_config.push_webhook_secret` / `purge_webhook_secret` ; absents en local → non vérifiés) |

## Tests
```bash
deno test supabase/functions/        # logique pure (provider/mock/outcome) — sans base ni réseau
```

## Points à finaliser (TODO, cf. docs/integrations/airtel-money-evaluation.md)
- Chiffrement **RSA** du PIN de décaissement.
- Chemin exact de **Transaction Enquiry**.
- Schéma de **signature des callbacks** (Callback With Authentication + Message Signing).
- Format du **MSISDN** (sans indicatif pays) et cohérence **X-Country/X-Currency**.
- Déploiement : `supabase functions deploy <name>` + planification de `payments-reconcile`.
