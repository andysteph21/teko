# Évaluation — Moov Money (Moov Africa) pour Teko

**Date :** 5 juin 2026
**Objet :** vérifier la disponibilité et la couverture d'une API Moov Money pour les flux financiers de Teko au Gabon, et comparer avec Airtel Money.

---

## 1. Avertissement : ne pas confondre les deux « Moov »

| | **Moov Financial** (`docs.moov.io`) | **Moov Africa Money** (à utiliser) |
|---|---|---|
| Nature | Fintech **américaine** (ACH, cartes, Google Pay, Tap to Pay, USD) | Opérateur **mobile money** africain (marque wallet « **Flooz** ») |
| Pertinence Gabon | **Aucune** | **Oui** — Moov Africa Gabon Telecom (groupe Maroc Telecom), site `moov-africa.ga` |

➡️ **`docs.moov.io` est hors sujet pour Teko.** Toute la suite concerne **Moov Africa Money**.

---

## 2. Disponibilité de l'API au Gabon

- **Pas de portail développeur self-service** identifié pour Moov Africa Gabon (contrairement à `developers.airtel.ga`). On ne peut pas s'inscrire et générer seul des clés.
- L'API existe : c'est une **API marchand** (plateforme interne « TLC ») utilisée par Moov Africa dans ses différents pays. Elle est documentée de façon fiable par un **SDK PHP communautaire** (`v1p3r75/moov-money-api-php-sdk`), construit sur les endpoints **Bénin** (`moov-africa.bj`) — la même plateforme est déclinée par pays.
- **Conséquence : l'accès passe par un accord marchand B2B** avec Moov Africa Gabon, qui fournit identifiants, URLs (sandbox/prod) propres au Gabon, et clé de chiffrement.

> À confirmer auprès de Moov Africa Gabon : existence d'un endpoint `moov-africa.ga` équivalent, conditions sandbox, frais, délais d'activation.

---

## 3. Caractéristiques techniques (d'après le SDK / plateforme TLC)

| Aspect | Moov Money (TLC) | Comparaison Airtel |
|---|---|---|
| Protocole | **SOAP / WSDL** (ex. `.../com.tlc.merchant.api/UssdPush?wsdl`) | REST/JSON |
| Authentification | **username + password** marchand + **clé AES-256** pour générer le token | OAuth2 `client_credentials` (token 180 s) |
| Environnements | **Sandbox** + **Production** (URLs distinctes par pays) | Staging + Production |
| Idempotence / suivi | **`referenceId`** unique par transaction | `transaction.id` unique partenaire |
| Codes de statut | `0` = succès, `100` = **en attente**, erreurs via exceptions | TS / TF / TA / TIP, `response_code` |
| Devise | FCFA (**XAF** au Gabon) | XAF |

---

## 4. Couverture fonctionnelle vs besoins Teko

| Flux Teko | Méthode Moov Money | Statut |
|---|---|---|
| **Client paie → Teko** | `pushTransaction` / `pushWithPendingTransaction` (demande de paiement USSD au client, confirmation par code) | ✅ Couvert |
| **Chauffeur règle son solde → Teko** | Même `pushTransaction` vers le numéro du chauffeur | ✅ Couvert |
| **Teko paie le chauffeur (payout)** | `transferFlooz` (transfert du compte marchand vers un compte autorisé) | ✅ Couvert |
| **Suivi de statut** | `getTransactionStatus(referenceId)` | ✅ Couvert |
| **Confirmation asynchrone (callback/webhook)** | Non exposé dans le SDK → modèle plutôt **push + polling de statut** | ⚠️ À vérifier (callbacks ?) |
| **Vérifs annexes utiles** | `getBalance` (solde marchand/abonné), `getMobileStatus` (**KYC** : nom, statut ACTIVE/INACTIVE, plafond de transfert), `cashIn`, `airTime` | ✅ Bonus |

**Conclusion :** fonctionnellement, **Moov Money couvre les mêmes besoins qu'Airtel** pour Teko (encaissement, règlement, payout, statut). `getMobileStatus` est un plus : vérifier qu'un numéro est actif et récupérer des infos KYC avant un payout.

---

## 5. Différences clés à anticiper (vs Airtel)

1. **SOAP vs REST.** Moov = SOAP/WSDL ; Airtel = REST/JSON. L'abstraction « paiement mobile » de Teko devra masquer cette différence.
2. **Auth différente.** Moov = user/password + clé AES-256 (token généré côté SDK) ; Airtel = OAuth2. Le SDK communautaire mentionne une clé AES par défaut fournie par Moov — **à remplacer impérativement par celle livrée par Moov Africa Gabon** (ne jamais coder en dur une clé d'exemple).
3. **Callbacks.** Airtel propose des callbacks signés ; côté Moov, le SDK suggère un modèle **push + interrogation de statut**. → prévoir un **job de polling/réconciliation** pour Moov, même si Airtel a des webhooks.
4. **Pas de self-service.** Le démarrage Moov dépend d'un **contact commercial/contractuel**, à lancer tôt car potentiellement long.
5. **Endpoints pays.** Le SDK pointe le Bénin ; il faut les **URLs Gabon** officielles.

---

## 6. Recommandations pour Teko

- **Lancer dès maintenant la prise de contact B2B avec Moov Africa Gabon** (compte marchand, sandbox, URLs/clé Gabon, frais, callbacks éventuels). C'est le chemin critique côté Moov.
- **Concevoir une interface commune** côté backend (Edge Functions Supabase) : `collect()`, `disburse()`, `enquire()`, `handleCallbackOrPoll()`, avec deux implémentations (Airtel REST, Moov SOAP) derrière la même abstraction.
- **Réconciliation robuste** : pour Moov, statut `100` (en attente) → polling `getTransactionStatus` avant toute mutation de solde ; idempotence via `referenceId` dérivé de l'entité métier (course/règlement/payout).
- **Sécurité** : secrets et clé AES uniquement côté serveur ; ne jamais réutiliser la clé d'exemple du SDK ; valider la légitimité des confirmations.
- **Repli manuel** (déjà prévu) si l'API Moov est indisponible ou l'accès pas encore ouvert.
- Le **SDK PHP** n'est pas directement réutilisable (stack Teko = Node/Supabase), mais il sert de **référence fiable** du contrat SOAP pour réimplémenter les appels.

---

## 7. Synthèse comparative Airtel vs Moov

| Critère | Airtel Money | Moov Money |
|---|---|---|
| Portail développeur self-service | ✅ `developers.airtel.ga` | ❌ (accord B2B requis) |
| Protocole | REST/JSON | SOAP/WSDL |
| Auth | OAuth2 (token 180 s) | user/pwd + clé AES |
| Encaissement (collect) | ✅ USSD Push | ✅ pushTransaction |
| Payout (disburse) | ✅ disbursements | ✅ transferFlooz |
| Statut transaction | ✅ enquiry | ✅ getTransactionStatus |
| Callbacks/webhooks | ✅ (signés) | ⚠️ à confirmer (sinon polling) |
| Infos KYC abonné | (KYC séparé) | ✅ getMobileStatus |
| Maturité doc accessible | Élevée | Moyenne (via SDK tiers) |

**Verdict :** les deux rails sont viables et couvrent les besoins de Teko. **Airtel est plus simple à démarrer** (self-service, REST, OAuth, callbacks). **Moov nécessite une démarche commerciale** et une intégration SOAP, mais offre les mêmes flux plus des vérifications KYC pratiques. Prévoir les **deux** derrière une abstraction commune.

---

## 8. Prochaines étapes

1. **Contacter Moov Africa Gabon** pour l'accès marchand + sandbox + URLs/clé Gabon + question callbacks.
2. Mettre à jour `docs/product/05-questions-ouvertes.md` : le point Moov est **partiellement levé** (capacités connues, accès à obtenir).
3. En phase architecture : spécifier le **module Paiements** unifié (Airtel REST + Moov SOAP).

> Sources : portail Airtel (`developers.airtel.ga`), SDK communautaire Moov Money (`github.com/v1p3r75/moov-money-api-php-sdk`), site Moov Africa Gabon (`moov-africa.ga`). À valider par les documents officiels fournis par Moov Africa Gabon lors de l'ouverture du compte marchand.
