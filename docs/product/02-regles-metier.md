# Teko — Règles métier

**Version :** 0.1 (brouillon) · **Date :** 5 juin 2026 · accompagne `01-PRD.md`

Ce document décrit la logique métier du MVP : modèle financier (solde journalier), tarification, cartographie collaborative, KYC, annulations, évaluations, notifications. Les valeurs marquées *(paramétrable)* sont configurables par l'admin et leurs valeurs par défaut restent à arrêter (voir `05-questions-ouvertes.md`).

---

## 1. Modèle financier — solde journalier

### 1.1 Principe

Chaque chauffeur possède un **solde** vis-à-vis de Teko, avec la convention :

- **Solde négatif** → le chauffeur **doit** de l'argent à Teko (cash encaissé dont la commission revient à Teko).
- **Solde positif** → **Teko doit** de l'argent au chauffeur (paiements mobile money reçus par Teko pour le compte du chauffeur).

Le solde évolue **course par course**, en temps réel, selon le mode de paiement.

### 1.2 Effet de chaque course sur le solde

Soit `P` le prix de la course et `C` la commission Teko *(paramétrable — taux ou montant fixe, à arrêter)*.

| Mode de paiement | Qui encaisse le cash/argent | Effet sur le solde du chauffeur |
|---|---|---|
| **Espèces (cash)** | Le chauffeur reçoit `P` en monnaie | Le chauffeur doit la commission à Teko → **solde −= C** |
| **Mobile money vers Teko** (Airtel Money au MVP ; Moov Money à venir) | Teko reçoit `P` | Teko doit au chauffeur sa part → **solde += (P − C)** |

> **Conséquence voulue :** plus les clients paient en mobile money *vers Teko*, plus le solde du chauffeur monte (Teko lui doit de l'argent) et moins le chauffeur a de cash à reverser. C'est le levier pour **encourager le paiement mobile**.

### 1.3 Exemple chiffré (illustratif — commission confirmée à 15 % le 25 août 2026)

Journée d'un chauffeur, prix en FCFA :

| # | Course | Paiement | Calcul | Variation solde | Solde cumulé |
|---|---|---|---|---|---|
| 1 | 2 000 | Cash | −(20 % × 2 000) = −400 | −400 | −400 |
| 2 | 3 000 | Airtel Money | +(3 000 − 600) = +2 400 | +2 400 | +2 000 |
| 3 | 1 500 | Cash | −300 | −300 | +1 700 |
| 4 | 5 000 | Cash | −1 000 | −1 000 | +700 |

**Solde de fin de journée = +700** → Teko doit 700 FCFA au chauffeur (payout). Si le solde avait été négatif, le chauffeur devrait verser ce montant à Teko avant l'échéance.

> ⚠️ Ce barème (commission 20 %, sur cash *et* mobile) est **une hypothèse de travail** pour illustrer la mécanique. Le taux/forme exacts et le fait d'appliquer la commission au mobile money sont à valider (`05-questions-ouvertes.md`).

### 1.4 Règlement quotidien et échéance

- L'échéance quotidienne de règlement est fixée à **4h00 du matin** (heure du Gabon).
- **Si solde négatif** à l'échéance : le chauffeur doit avoir versé le montant dû à Teko (via Airtel Money au MVP) **avant 4h**. À défaut → **désactivation automatique** du compte.
- **Si solde positif** : Teko procède à un **payout** vers le chauffeur (règles de fréquence et seuil minimal de payout à définir — *paramétrable*).
- À la clôture journalière, le solde réglé est **remis à zéro** et un **relevé quotidien** est archivé (auditable). *(Détail à confirmer : reset à 0 vs report du résiduel — voir questions ouvertes.)*

### 1.5 Désactivation et réactivation

- **Désactivation automatique** si, à 4h, le solde négatif n'est pas réglé. Un chauffeur désactivé ne reçoit plus de demandes.
- **Réactivation immédiate** dès réception du versement régularisant le solde.
- Notifications associées : rappel d'échéance (avant 4h), confirmation de désactivation, confirmation de réactivation.
- *(À confirmer : délai/heure d'envoi des rappels, éventuel plafond de dette intra-journée déclenchant un blocage anticipé — l'option « heure limite quotidienne » a été retenue plutôt qu'un plafond temps réel.)*

### 1.6 Paiements mobile money

**Rail du MVP : Airtel Money uniquement.** Moov Money est prévu en version future et viendra se brancher derrière la même abstraction (voir `../integrations/`).

Deux flux à intégrer :

1. **Encaissement (client → Teko)** lorsqu'un client paie une course en mobile money — Airtel : *Collection USSD Push* (`POST /merchant/v1/payments/`).
2. **Décaissement / payout (Teko → chauffeur)** pour les soldes positifs — Airtel : *Disbursement* (`POST /standard/v1/disbursements/`) — et **règlement (chauffeur → Teko)** pour les soldes négatifs, via le même mécanisme d'encaissement vers le numéro du chauffeur.

Exigences : authentification OAuth2 (token court à mettre en cache), confirmation fiable de transaction (idempotence via `transaction.id`, suivi de statut, callbacks signés), rapprochement automatique avec la course/le solde, gestion des statuts ambigus/en cours pour éviter les doubles paiements, journal auditable. Prévoir un **mode dégradé** (versement manuel + preuve à valider par l'admin) en repli. **L'API Airtel a été évaluée** : voir `../integrations/airtel-money-evaluation.md`.

> **Conception extensible :** exposer côté backend une interface paiement commune (`collect`, `disburse`, `enquire`, `handleCallback`) afin que l'ajout ultérieur de Moov Money ne touche pas la logique de solde.

### 1.7 Intégrité

Toute mutation de solde doit être **atomique, idempotente et journalisée** (transaction + écriture immuable). Aucune course ne doit modifier le solde deux fois ; aucun paiement ne doit être perdu. La source de vérité du solde est le **journal des transactions**, le solde courant en étant la somme.

---

## 2. Tarification

- Prix **estimé à partir de la distance et de la durée** calculées sur la carte custom (itinéraire + vitesse moyenne attendue par zone/catégorie).
- Composantes *(toutes paramétrables)* : prise en charge de base, prix au km, prix à la minute, **tarif minimum**, multiplicateur par **catégorie** (Éco, Moto-taxi, Confort), éventuels suppléments (nuit, zone).
- En raison de l'**imprécision cartographique**, l'estimation est encadrée par des garde-fous (marges) et peut être **affinée** au fil de l'enrichissement de la carte. *(À trancher : prix ferme affiché avant la course vs fourchette ajustée à la fin — voir questions ouvertes.)*
- La grille **par zones** sert de garde-fou et de repli là où le routing est peu fiable.
- *Version future :* le covoiturage (sorti du MVP le 18 août 2026) appliquera une logique de **partage du prix** entre passagers — règle de calcul à détailler lors de la conception de cette catégorie.

---

## 3. Cartographie collaborative (carte custom)

### 3.1 Couches

1. **Fond de base** : OpenStreetMap (tuiles, de préférence vectorielles pour la légèreté).
2. **Couche Teko** : routes ajoutées/corrigées manuellement par les admins.
3. **Couche propositions** : tracés candidats générés automatiquement à partir des **traces GPS des chauffeurs**.

### 3.2 Cycle de vie d'une route proposée

1. **Collecte** : les traces GPS des chauffeurs (avec consentement) sont agrégées.
2. **Détection** : le système repère des segments fréquemment empruntés **absents** de la carte et propose un tracé (statut `proposé`).
3. **Revue admin** : un admin cartographie examine la proposition (fréquence, nombre de chauffeurs distincts, cohérence géométrique) et la **confirme** (`validée`) ou l'**infirme** (`rejetée`).
4. **Publication** : une route validée intègre la couche Teko et devient utilisable pour le routing et la tarification.
5. **Amélioration continue** : les traces continuent d'affiner géométrie et attributs (sens, praticabilité).

### 3.3 Règles et garde-fous

- Une proposition n'est routable **qu'après validation** admin (pas de publication automatique).
- Seuils de déclenchement d'une proposition *(paramétrables)* : nombre minimal de passages, nombre minimal de chauffeurs distincts, sur une fenêtre de temps.
- Anonymisation/agrégation des traces ; pas d'exposition des trajets individuels.
- Une zone n'est **ouverte au service** qu'au-dessus d'un seuil de couverture cartographique jugé suffisant (cohérent avec le déploiement national progressif).

---

## 3bis. Navigation par points de repère

Au Gabon, on se repère par **points de repère** plutôt que par adresses/noms de rue. Teko en fait un mécanisme central, sur le modèle de la navigation par landmarks de Google Maps en Inde.

### 3bis.1 Qu'est-ce qu'un point de repère
Un lieu nommé, reconnaissable depuis la route et utile pour s'orienter : **station-service, rond-point, marché, église, école, pharmacie, bar/maquis, immeuble ou bâtiment connu, carrefour**, etc. Chaque repère a : un **nom** (et des **alias** locaux), une **catégorie**, une **position** (point), éventuellement une **photo**, une **zone**, et un **score de saillance** (à quel point il est connu/visible — sert à choisir le meilleur repère pour une instruction).

### 3bis.2 Deux usages
1. **Adressage** : le client situe départ et destination **par rapport à un repère** (saisie hybride : recherche de repère mise en avant → affinage par épingle sur la carte → précision texte « derrière », « à côté de », « en face de »). Le repère est mis en avant mais l'épingle reste la position exacte transmise.
2. **Guidage** : les instructions du chauffeur sont **formulées en repères** aux points de décision (« tournez à droite après la station-service », « continuez jusqu'au rond-point du marché »), le nom de rue n'étant ajouté que s'il existe.

### 3bis.3 Point de rendez-vous
Pour la prise en charge, l'app **suggère un repère connu proche** comme lieu de rencontre client↔chauffeur, afin de réduire les malentendus de localisation. Le client peut l'accepter ou garder sa position GPS.

### 3bis.4 Alimentation et validation (collaboratif)
- **Sources** : repères ajoutés par les **admins**, et **proposés par les chauffeurs et les clients**.
- **Validation** : toute proposition passe en revue admin (`proposé` → `validé`/`rejeté`) avant d'être exploitable, comme pour les routes. Doublons fusionnés.
- **Qualité** : la **saillance** se renforce avec l'usage (fréquence de sélection comme repère/destination) et la validation ; un repère mal placé ou obsolète peut être corrigé/retiré par l'admin.

### 3bis.5 Garde-fous
- Un repère n'est utilisé pour l'**adressage public et le guidage qu'après validation**.
- Modération (noms inappropriés, repères trompeurs) ; journalisation des actions admin.
- Les repères sont **légers en données** (nom + point) → embarquables dans les paquets carte hors-ligne par zone.

---

## 4. Comptes, rôles et KYC

### 4.1 Authentification

- Inscription/connexion par **OTP SMS** sur le numéro de téléphone (client et chauffeur), gérée par **Supabase Auth**.
- E-mail **optionnel**.
- Acceptation des **CGU et politique de confidentialité** à l'inscription (incluant le consentement à la collecte GPS pour les chauffeurs).

### 4.2 KYC client

Téléphone validé par OTP ; nom ; photo facultative. Géolocalisation à activer pour commander.

### 4.3 KYC chauffeur (validation admin obligatoire)

Pièces requises : **CNI ou passeport**, **permis de conduire valide**, **carte grise**, **assurance du véhicule**, **photo du véhicule**, **casier judiciaire (obligatoire)**, photo de profil. À l'inscription, le chauffeur choisit sa/ses **catégorie(s)** (Éco, Moto-taxi, Confort) ; la catégorie proposée est **confirmée par l'admin** lors de la validation KYC.

Processus : création compte (OTP) → upload des pièces → **vérification KYC par l'admin** → **activation** → accès au tableau de bord (solde, recettes) et aux demandes. Documents stockés de façon chiffrée et à accès restreint.

---

## 5. Cycle de vie d'une course

États principaux : `demandée` → `acceptée` → `chauffeur en route` → `arrivé` → `démarrée` (après **code PIN**) → `terminée` → `évaluée`. États alternatifs : `annulée (client)`, `annulée (chauffeur)`, `no-show`, `aucune réponse (no-answer)`, `échouée`.

- **Immédiat** : appariement au chauffeur disponible le plus pertinent ; délai d'acceptation borné, puis réattribution.
- **Programmé** : réservation à une date/heure ; rappels et dispatch différé à l'approche de l'horaire.
- **Code PIN** : le client communique un code au chauffeur pour passer à `démarrée`, garantissant le bon appariement.
- **SOS** et **partage de trajet** disponibles pendant la course.

---

## 6. Annulations

- **Annulation client** avant acceptation : **sans frais**.
- **No-show / no-answer** : des **frais d'annulation** s'appliquent *(paramétrables)* lorsque le client ne se présente pas ou ne répond pas après l'arrivée du chauffeur (délai d'attente avant déclenchement à définir).
- **Annulation chauffeur** : suivie statistiquement ; un taux excessif peut entraîner une mise en revue.
- **Répartition** *(décision n° 5, 25 août 2026 ; appliquée en base le 2 sept. 2026)* : le client doit le frais entier ; le chauffeur mobilisé en reçoit la **part chauffeur** (70 % par défaut, `cancellation_fee.driver_share_percent`, réglable par l'admin), créditée à son solde dès l'annulation ; le reste revient à Teko.
- L'impact financier des frais d'annulation sur le solde suit la même mécanique que les courses (selon le mode de paiement applicable) ; en espèces, le recouvrement auprès du client est différé (v1).

---

## 7. Évaluations et qualité

- Après chaque course : **note 1–5 + commentaire facultatif**, dans les deux sens (client et chauffeur).
- **Note moyenne publique** du chauffeur ; **badge « Top Service »** si moyenne **≥ 4,5** (sur fenêtre glissante, ex. 30 jours).
- Signalement d'incident possible ; le prestataire peut répondre ; modération par l'admin.

---

## 8. Notifications (push)

- **Client :** chauffeur trouvé / prise en charge, chauffeur arrivé, fin de course, rappel d'évaluation, alertes SOS/sécurité.
- **Chauffeur :** nouvelle demande, rappel d'échéance de solde (avant 4h), confirmation de désactivation/réactivation, nouvelle évaluation, validation/refus KYC.
- **Sobriété :** notifications via push (FCM) plutôt que polling, pour limiter la consommation data.

---

## 9. Jobs automatiques (logique planifiée)

- `cloture_journaliere` (≈ 4h) : fige le solde du jour, déclenche **désactivations** pour impayé, génère les relevés.
- `payouts` : décaissements vers chauffeurs au solde positif (selon fréquence/seuil).
- `reactivation` : réactive immédiatement à réception d'un règlement.
- `detection_routes` : agrège les traces GPS et génère les propositions de routes.
- `rappels` : envoie les rappels d'échéance et autres notifications planifiées.

*(Le découpage technique exact relève de la phase architecture.)*

---

## 10. Paramètres administrables (synthèse)

Taux/forme de **commission** ; composantes **tarifaires** par catégorie ; **frais d'annulation** et délai de no-show ; **heure d'échéance** (4h par défaut) et fenêtre de rappel ; **seuil/fréquence de payout** ; **zones** et grille de repli ; **seuils** de détection de routes ; seuil de **badge qualité** (4,5). Toute modification doit être journalisée.


## Addendum — règles confirmées par le client (25 août 2026)

Codification des réponses au document « Décisions » (détail :
`../plan/04-suivi-client.md`) :

- **Commission unique** (15 %) sur tous les modes de paiement — aucune
  différenciation espèces / Airtel Money.
- **Report du résiduel** à la clôture de 04 h, suspension automatique tant
  que la dette n'est pas réglée ; **pas de plafond intrajournalier**.
- **Versement chauffeur quotidien automatique** à la clôture, **sans seuil
  minimum** au lancement (`payout_threshold = 0`).
- **Prix ferme et garanti** : le montant annoncé avant la course est celui
  payé — la marge de prudence est intégrée au calcul, le risque d'estimation
  est porté par Teko, jamais par le client.
- **Destination cachée** au chauffeur jusqu'à acceptation (anti-écrémage) ;
  le taux d'acceptation n'a **aucun effet en bêta**, puis une **priorité
  douce** dans l'attribution.
- **Règlement manuel** (panne Airtel) : validé par le rôle **Finance** avant
  la clôture de la nuit même — un chauffeur ne doit jamais être suspendu
  faute de traitement d'une preuve valide.
- **Carte collaborative** : proposition de route à ≥ 10 passages par
  ≥ 5 chauffeurs distincts sur 3 semaines ; doublon de repères signalé à
  moins de **50 m** ; traces GPS **anonymisées à la collecte** et conservées
  **12 mois** (sous réserve de l'avis juridique) ; reconstruction du calcul
  d'itinéraires **chaque nuit + à la demande** depuis la console.
- **KYC renforcé au lancement** : vérification **physique** (rencontre,
  autocollant, contrôle du véhicule) pour la première vague de chauffeurs
  à Libreville, en plus des documents.
- **SOS** : alerte à l'équipe opérations avec **engagement de rappel**.
- **Compteur data** : budget indicatif 100 Mo/mois, alerte 50 %, critique
  80 % ; réglages du mode économie tels que spécifiés (position 5 s, carte
  allégée, initiales à la place des photos).
- **Périmètre de lancement confirmé** : Libreville, Android uniquement.
