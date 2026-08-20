# 03 — Module de paiement & moteur de solde

## 1. Objectifs

- Intégrer **Airtel Money** (MVP) pour : encaissement client→Teko, règlement chauffeur→Teko, payout Teko→chauffeur, suivi de statut.
- Garantir l'**intégrité financière** : mutations de solde atomiques, idempotentes, auditables ; aucun double paiement.
- Rester **extensible** : Moov Money (et d'autres) s'ajoutent sans toucher la logique de solde.

## 2. Abstraction « fournisseur de paiement »

Interface commune (dans `packages/core` pour les types, implémentée côté Edge Functions) :

```ts
interface MobileMoneyProvider {
  collect(p: { msisdn; amount; reference; partnerTxnId }): Promise<TxnResult>;   // entrant
  disburse(p: { msisdn; amount; reference; partnerTxnId }): Promise<TxnResult>;  // sortant
  enquire(p: { partnerTxnId }): Promise<TxnStatus>;                              // statut
  verifyCallback(req): { valid: boolean; event: PaymentEvent };                 // webhook
}
```

- **`AirtelProvider`** : implémentation REST/OAuth2 (voir `../integrations/airtel-money-evaluation.md`).
- **`MoovProvider`** (futur) : implémentation SOAP/TLC, même interface.
- Le reste du système ne connaît que `MobileMoneyProvider` → bascule/ajout transparent.

## 3. Intégration Airtel (rappel technique)

- **Auth** : OAuth2 `client_credentials`, **token ~180 s** → **cache de token** partagé + refresh proactif (Edge Function/secret store).
- **Encaissement** : `POST /merchant/v1/payments/` (USSD Push) — le payeur autorise sur son téléphone.
- **Payout** : `POST /standard/v1/disbursements/` — **PIN chiffré RSA** (clé/serveur uniquement).
- **Statut** : Transaction Enquiry ; **callbacks signés** (variante authentifiée + message signing).
- **Idempotence** : `transaction.id` = `partner_txn_id` dérivé de l'entité métier (jamais régénéré sur retry).
- **Devise/pays** : XAF / Gabon — **vérifier la cohérence X-Country/X-Currency** (exemples doc ambigus).
- **Repli** : si l'API est indisponible → versement manuel + preuve validée par l'admin.

## 4. Mapping des flux Teko → paiement

| Événement métier | Appel | Effet sur `ledger` (à la confirmation) |
|---|---|---|
| Course payée **cash** | aucun appel (cash physique) | `commission_due` : `amount_signed = −C` |
| Course payée **Airtel** (client→Teko) | `collect` vers le client | `mobile_credit` : `amount_signed = +(P − C)` |
| **Règlement** du chauffeur (chauffeur→Teko) | `collect` vers le chauffeur | `settlement` : `amount_signed = +montant réglé` |
| **Payout** (Teko→chauffeur) | `disburse` vers le chauffeur | `payout` : `amount_signed = −montant versé` |
| **Frais d'annulation** (no-show/no-answer) | selon mode | `cancellation` (signe selon cas) |

> `P` = prix de la course, `C` = commission (paramétrable). Convention : `amount_signed` négatif = le chauffeur **doit** à Teko. Voir les exemples chiffrés dans `../product/02-regles-metier.md`.

## 5. Machine à états d'un paiement

```
initiated ──> pending ──> success
                   │
                   ├──> failed        (aucune mutation de solde)
                   └──> ambiguous ──(enquiry)──> success | failed
```

Règles :

1. On crée d'abord la ligne `payments` (status `initiated`, `partner_txn_id` persisté) **avant** l'appel réseau.
2. La **mutation de `ledger` n'a lieu qu'au passage `success`**, confirmé par **callback signé** ou **enquiry** (jamais sur la seule réponse synchrone si elle est ambiguë).
3. `ambiguous`/`pending` → jamais de retry « aveugle » : on **interroge** avec le même `partner_txn_id` (le job `payments-reconcile` s'en charge en continu).
4. Toute transition est journalisée ; `payments` + `ledger` sont écrits dans une **transaction Postgres** (atomicité).

## 6. Moteur de solde (solde journalier)

- **Écritures immuables** dans `ledger`, rattachées au `business_day` (coupure 04:00 Africa/Libreville).
- Le **solde courant** = somme des `amount_signed` du chauffeur (un cache `current_balance_cache` peut être maintenu pour l'affichage, mais le journal fait foi).
- **Clôture `daily-close` (04:00)** :
  1. Fige le `daily_statements` du jour (opening/closing, totaux).
  2. **Solde négatif non réglé** → `is_active = false` (`deactivated_reason = overdue_balance`) + notification.
  3. **Solde positif** → déclenche un `payout` (selon seuil/fréquence paramétrés).
  4. Ouvre le jour suivant (report ou remise à zéro — **décision à confirmer**, cf. questions ouvertes).
- **Réactivation immédiate** : à la confirmation d'un `settlement` régularisant le solde, `is_active = true` + notification.
- **Rappels** : job `reminders` avant l'échéance.

## 7. Sécurité & conformité

- Secrets (client_id/secret Airtel, clé RSA, clé de signature callback) en **secret store** côté serveur ; jamais dans les apps.
- Validation **stricte des callbacks** (signature) avant toute prise en compte.
- Journal d'audit financier ; rapprochement régulier ; alertes sur écarts.
- Conformité : reçus, traçabilité, conservation — à cadrer avec les exigences locales.

## 8. Tests

- **Sandbox Airtel** (`openapiuat.airtel.ga`) pour bout-en-bout avant activation prod.
- Jeux de tests : succès, échec, ambigu/timeout, retry idempotent, callback rejoué, double encaissement, réconciliation.
- Tests unitaires de `packages/core` (calcul prix, signes du `ledger`, clôture) **indépendants du fournisseur**.
