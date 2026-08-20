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
└─ payments-reconcile/          # rattrape les paiements pending/ambigus (enquiry)
```

## Flux
- **Encaissement** : une RPC (`complete_ride` mobile, ou `create_settlement_payment`) crée une ligne `payments` (status `initiated`). `airtel-collect` initie le USSD Push ; la confirmation arrive par **callback** ou par **réconciliation**.
- **Payout** : `daily_close` enqueue un paiement `payout` ; `airtel-disburse` l'exécute.
- **Confirmation** : seules `confirm_payment`/`fail_payment` (Postgres) modifient le solde. Idempotence garantie par `partner_txn_id` (unique) et le court-circuit `status='success'`.

## Variables d'environnement
| Variable | Rôle |
|---|---|
| `PAYMENT_PROVIDER` | `mock` (défaut) ou `airtel` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | client service-role |
| `AIRTEL_BASE_URL` | `https://openapiuat.airtel.ga` (staging) / `https://openapi.airtel.ga` (prod) |
| `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET` | OAuth2 |
| `AIRTEL_X_COUNTRY`, `AIRTEL_X_CURRENCY` | en-têtes pays/devise (**à confirmer** : GA / XAF) |
| `AIRTEL_DISBURSE_PIN_ENC` | PIN de décaissement **chiffré RSA** |
| `AIRTEL_CALLBACK_SECRET` | vérification de signature des callbacks (à implémenter) |

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
