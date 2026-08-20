# Évaluation — API Airtel Money (Gabon) pour Teko

**Date :** 5 juin 2026 · **Source :** portail développeur Airtel `developers.airtel.ga` (compte connecté, op-co Gabon)
**Objet :** vérifier que l'API Airtel Money couvre les flux financiers du modèle de **solde journalier** de Teko.

> Lecture faite depuis la session authentifiée. Le détail exact de certaines sous-pages (Refund, Transaction Enquiry, Error Codes, Callbacks) a été identifié mais pas intégralement retranscrit ; les endpoints clés ont été lus directement.

---

## 1. Conclusion en bref

**L'API Airtel Money couvre les trois flux dont Teko a besoin** : encaisser un client, faire régler un chauffeur, et payer un chauffeur. La documentation est claire, en environnement **staging + production**, avec OAuth2, confirmations asynchrones (callbacks) et suivi de statut. **C'est une base solide et exploitable.**

Points de vigilance principaux : **token très court (180 s)**, gestion des statuts **ambigus (TA) / en cours (TIP)** à réconcilier rigoureusement pour éviter les doubles paiements, **chiffrement PIN en RSA 1024** (imposé), et quelques **incohérences de codes pays/devise** dans les exemples à confirmer.

---

## 2. Accès & environnements

| Élément | Valeur |
|---|---|
| Portail | `developers.airtel.ga` (gestion désormais **par op-co** — sélection du pays Gabon) |
| Base URL staging | `https://openapiuat.airtel.ga` |
| Base URL production | `https://openapi.airtel.ga` |
| Identifiants | `client_id` / `client_secret` (clés générées par application dans le dashboard ; staging puis activation pour la prod) |

---

## 3. Authentification & sécurité

- **OAuth2 — `POST /auth/oauth2/token`**, `grant_type: client_credentials`. Réponse : `access_token`, `token_type: bearer`, **`expires_in: 180`** (≈ 3 minutes).
- **Chiffrement** (section dédiée) :
  - **PIN** : RSA, mode **ECB**, padding **PKCS1Padding**, **clé 1024 bits** (clé publique fournie dans la doc). Requis pour les décaissements.
  - **Callback Encryption**, **Message Signing**, **Encryption Keys** : mécanismes pour sécuriser/authentifier les callbacks entrants.

---

## 4. Couverture fonctionnelle vs besoins Teko

| Flux financier Teko | Endpoint Airtel | Statut |
|---|---|---|
| **Client paie une course → Teko** (mobile money) | **Collection — Payments USSD Push** : `POST /merchant/v1/payments/` (push USSD au client pour autoriser) | ✅ Couvert |
| **Chauffeur règle son solde négatif → Teko** | Même **Collection USSD Push** (Teko initie une demande de paiement vers le MSISDN du chauffeur) | ✅ Couvert |
| **Teko paie un solde positif → chauffeur** (payout) | **Disbursement — Payments** : `POST /standard/v1/disbursements/` (PIN chiffré requis) | ✅ Couvert |
| **Vérifier le statut d'une transaction** | **Transaction Enquiry** (côté Collection et Disbursement) | ✅ Couvert |
| **Confirmation asynchrone** | **Callbacks** (avec et sans authentification) | ✅ Couvert |
| **Remboursement client** | **Refund** (Collection) | ✅ Couvert |
| **Rapprochement / reporting** | **Transactions-Summary-APIs**, **Account**, **Cash-Out-APIs**, **KYC** disponibles | ✅ Présents (à explorer) |

### Détails endpoints clés

**Encaissement — `POST /merchant/v1/payments/`**
Headers : `X-Country`, `X-Currency`, `Authorization: Bearer`. Corps : `reference`, `subscriber.msisdn` (sans indicatif pays), `transaction.amount`, **`transaction.id` (id unique partenaire)**. Le client reçoit un push USSD pour autoriser ; réponse avec `transaction.status` + `status.response_code`.

**Payout — `POST /standard/v1/disbursements/`**
Corps : `payee.msisdn`, `reference`, **`pin` chiffré (RSA)**, `transaction.amount`, **`transaction.id` (id unique partenaire)**. Réponse : `airtel_money_id`, `reference_id`, et **`status` ∈ {TS, TF, TA, TIP}** = Succès / Échec / **Ambigu** / **En cours**.

---

## 5. Adéquation au modèle « solde journalier »

- L'**`transaction.id` unique partenaire** (obligatoire en collection et disbursement) est exactement ce qu'il faut pour **l'idempotence et le rapprochement** course ↔ paiement ↔ mouvement de solde.
- Le **push USSD** est adapté au Gabon : le client/chauffeur valide sur son téléphone, sans saisie de carte. Le même mécanisme sert au **règlement du chauffeur** (collection initiée vers son numéro) — pas besoin que le chauffeur fasse une manip manuelle externe.
- Les **callbacks + Transaction Enquiry** permettent de confirmer de façon fiable avant de **muter le solde** (cf. exigence d'atomicité du PRD §02).

---

## 6. Manques, risques et points à confirmer

1. **Token court (180 s).** Imposera un **cache de token avec refresh** côté backend (Edge Function), partagé entre instances. À gérer dès le départ.
2. **Statuts ambigus (TA) / en cours (TIP) au payout.** Risque de **double versement** si on retente naïvement. → **Toujours faire un Transaction Enquiry sur le même `transaction.id` avant tout retry** ; ne jamais régénérer un nouvel id pour la même opération métier.
3. **Idempotence réelle à vérifier.** Confirmer le comportement d'Airtel si on **rejoue** une requête avec le même `transaction.id` (rejet ? renvoi du résultat ?). Crucial pour la sûreté financière.
4. **Incohérence codes pays/devise dans les exemples.** Les exemples montrent `X-Country: CFA` et `X-Currency: GA`, ce qui paraît **inversé** (attendu : pays **GA**, devise **XAF**). À **confirmer** avec le support / le sandbox avant intégration.
5. **PIN en RSA 1024 / ECB.** Cryptographiquement daté (1024 bits, ECB) mais **imposé** par Airtel ; à implémenter tel quel, en isolant la clé/PIN côté serveur uniquement.
6. **Sécurité des callbacks.** Utiliser impérativement la variante **Callback With Authentication** + **Message Signing** pour éviter les faux callbacks de paiement.
7. **Non documenté ici (à vérifier) :** limites de débit (rate limits), montants min/max par transaction, format exact du MSISDN gabonais, délais de settlement réels, frais Airtel par transaction, et processus/durée d'**activation production**.
8. **Format des codes de statut** : `result_code` est **déprécié** au profit de `response_code` — coder sur `response_code` dès le départ.

---

## 7. Recommandations d'intégration pour Teko

- **Centraliser** tous les appels Airtel dans des **Edge Functions Supabase** (jamais côté app) : token cache, chiffrement PIN, secrets, signature des callbacks.
- **Clé d'idempotence = `transaction.id`** dérivée de l'entité métier (id de course / id de règlement / id de payout), persistée avant l'appel.
- **Machine à états de paiement** persistée : `initié → en_attente → (succès | échec | ambigu)` ; mutation de solde **uniquement** sur succès confirmé (callback **ou** enquiry).
- **Job de réconciliation** périodique : pour tout TIP/TA, interroger Transaction Enquiry et/ou Transactions-Summary, puis corriger l'état.
- **Mode dégradé** (déjà prévu au PRD) : si l'API est indisponible, fallback versement manuel + preuve validée par l'admin.
- **Commencer en staging** (`openapiuat`) avec les identifiants de test avant toute activation production.

---

## 8. Prochaines étapes

1. Confirmer les points §6 (codes pays/devise, idempotence, limites, frais, activation prod) via le **sandbox** et/ou le support Airtel.
2. Faire la **même évaluation pour Moov Money** afin de comparer les deux rails et homogénéiser l'abstraction « paiement mobile » côté Teko.
3. Concevoir, en phase architecture, le **module Paiements** (interface commune Airtel/Moov : `collect()`, `disburse()`, `enquire()`, `handleCallback()`).

> Mise à jour des questions ouvertes : le point « capacités des APIs Airtel/Moov » de `docs/product/05-questions-ouvertes.md` est **partiellement levé pour Airtel** (collection, disbursement, enquiry, callbacks confirmés). Reste Moov + les vérifications §6.
