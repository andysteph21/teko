# Teko — Document d'exigences produit (PRD)

**Version :** 0.2
**Date :** 18 août 2026 (v0.1 : 5 juin 2026)
**Statut :** Validé — mis à jour après la phase maquettes UX (voir `../design/06-maquettes.md`)
**Périmètre de cette version :** MVP *ride-hailing* (transport de personnes)

> **Changements v0.2 :** le covoiturage sort du MVP (3 catégories : Éco, Moto-taxi, Confort) ; l'e-mail devient un canal OTP de secours **transitoire** (MVP uniquement) ; les décisions UX du 18 août sont intégrées (détail dans `05-questions-ouvertes.md`, section « Décisions tranchées »).

---

## 1. Résumé exécutif

Teko est une plateforme de transport de personnes à la demande (type Uber/Bolt) conçue **spécifiquement pour le Gabon**. Elle met en relation des **clients** et des **chauffeurs** via deux applications mobiles, pilotées par une **plateforme d'administration web** et un **backend Supabase**.

À terme, Teko a vocation à devenir une *super-app* de services urbains (livraison, déménagement, restauration, ambulance), comme décrit dans le cahier des charges client. **Le présent document couvre uniquement le MVP transport de personnes** ; les autres services sont traités en section 11 (vision long terme) afin que l'architecture reste extensible.

Quatre partis pris différencient Teko de ses concurrents et répondent aux réalités gabonaises :

1. **Sobriété data assumée.** Connexions souvent en 3G et payées au crédit. Un **widget flottant de consommation de données** et un **mode économie de données** rendent visible et maîtrisable l'empreinte réseau de l'app.
2. **Cartographie collaborative.** Les cartes existantes (Google Maps) ignorent une grande partie des petites routes et des quartiers récents. Teko construit une **carte custom semi-automatique** : routes ajoutées manuellement par les admins, complétées par des **tracés proposés automatiquement à partir du GPS des chauffeurs**, puis **confirmés ou infirmés** par les admins.
3. **Navigation par points de repère.** Au Gabon, les adresses et noms de rue sont peu fiables : on se repère aux **points de repère** (station-service, rond-point, marché, église, école, bâtiment connu…). Comme Google Maps a dû le faire en Inde, Teko **adresse et guide par repères** : le client situe un lieu par rapport à un repère, et le chauffeur reçoit un guidage formulé en repères (« tournez à droite après la station-service »). Les repères sont **collaboratifs** (proposés par chauffeurs et clients, validés par l'admin), comme les routes.
4. **Gestion du cash via solde journalier.** L'économie reste largement en espèces. Teko introduit un **solde journalier** par chauffeur qui matérialise la dette (cash encaissé) ou la créance (paiements mobiles reçus) entre le chauffeur et Teko, avec règlement quotidien par **mobile money**. Le MVP intègre **Airtel Money** ; **Moov Money** est prévu en version future (cf. §11).

---

## 2. Objectifs et indicateurs de succès

### 2.1 Objectifs produit

- Offrir aux Gabonais une façon fiable, sûre et lisible de commander une course.
- Donner aux chauffeurs un revenu, une visibilité et des règles financières claires.
- Permettre à Teko de monétiser chaque course de façon transparente et automatisée.
- Fonctionner correctement sur des réseaux lents et coûteux.

### 2.2 Indicateurs de succès (à cibler après lancement)

| Domaine | Indicateur | Intention |
|---|---|---|
| Adoption | Courses complétées / semaine | Croissance de l'usage réel |
| Liquidité | Délai moyen d'appariement client↔chauffeur | < quelques minutes en zone dense |
| Fiabilité | Taux de courses complétées / acceptées | Limiter annulations et no-show |
| Finance | Taux de règlement du solde avant 4h | Santé du modèle cash |
| Sobriété | Mo consommés / course active | Prouver la basse consommation |
| Carte | Routes proposées validées / mois | Mesurer l'enrichissement de la carte |
| Qualité | Note moyenne chauffeurs, % ≥ 4,5 | Qualité de service |

> Les seuils chiffrés précis seront fixés avec l'équipe business (voir `05-questions-ouvertes.md`).

---

## 3. Contexte et contraintes (Gabon)

- **Réseau :** couverture mobile inégale, fréquemment 3G, **data payée au crédit** → la frugalité réseau est une exigence de premier ordre, pas une option.
- **Cartographie :** axes principaux représentés, mais petites routes et quartiers récents souvent absents ou erronés sur les cartes grand public.
- **Repérage :** adresses et noms de rue peu fiables ou non utilisés ; les gens se **repèrent et donnent les directions par points de repère** (« derrière la station Total », « au rond-point du marché »). La navigation doit s'appuyer sur ces repères.
- **Paiement :** forte prédominance des **espèces** ; mobile money (**Airtel Money**, **Moov Money**) très répandu et privilégié comme rail de règlement. **Le MVP intègre Airtel Money uniquement ; Moov Money est reporté à une version future** (voir §11).
- **Appareils :** smartphones d'entrée/milieu de gamme Android majoritaires → exigence de légèreté applicative et de tolérance aux appareils modestes.
- **Langue :** français (langue officielle) au lancement ; ouverture future aux langues locales.
- **Déploiement :** ambition **nationale**, à mener de façon **progressive** (densifier zone par zone, en commençant par les agglomérations à forte demande, la couverture cartographique conditionnant l'ouverture d'une zone).

---

## 4. Personas

### 4.1 Client — « Nadia », 29 ans, Libreville
Employée de bureau, smartphone Android milieu de gamme, forfait data limité. Veut un trajet fiable sans négocier longuement, payer en cash ou mobile money, et se sentir en sécurité le soir. Sensible à la consommation de données.

### 4.2 Chauffeur — « Boris », 38 ans
Possède ou loue un véhicule. Cherche un revenu régulier et des règles claires. Encaisse surtout du cash. A besoin de comprendre à tout instant combien il doit reverser à Teko et avant quand, sans surprise de désactivation.

### 4.3 Chauffeur moto — « Steeve », 24 ans
Moto-taxi, agile dans le trafic, courses courtes et fréquentes. Très sensible aux frais et à la consommation data (téléphone modeste).

### 4.4 Administrateur opérations — « Aïcha », siège Teko
Valide les inscriptions (KYC), surveille les courses en temps réel, traite litiges et annulations, gère suspensions/réactivations, et **valide les routes** proposées par le système cartographique.

### 4.5 Administrateur cartographie — rôle dédié
Ajoute manuellement des routes, examine les tracés proposés à partir des traces GPS, les confirme ou les rejette, corrige la grille des zones tarifaires.

### 4.6 Administrateur finance — rôle dédié
Suit les soldes des chauffeurs, les versements mobile money entrants, déclenche/contrôle les payouts vers les chauffeurs créditeurs, supervise les désactivations pour impayé.

> Les rôles admin peuvent être cumulés au lancement et séparés ensuite par un système de permissions.

---

## 5. Périmètre du MVP

### 5.1 Inclus

- Inscription et authentification par **OTP SMS** (Supabase Auth). E-mail optionnel comme **canal OTP de secours et filet de récupération — MVP uniquement**, retiré ensuite.
- **App Client** : commander une course (immédiate ou programmée) en situant départ/arrivée **par point de repère** (saisie hybride : repère + épingle + précision texte), suivi temps réel, paiement (cash / Airtel Money ; Moov Money en version future), historique, évaluation, SOS, partage de trajet, widget data + mode économie.
- **App Chauffeur** : inscription + upload KYC, réception et acceptation des demandes, **navigation guidée par points de repère** sur carte custom, **tableau de solde journalier**, règlement mobile money, historique de recettes, statut en ligne/hors ligne, widget data + mode économie.
- **3 catégories** : Éco, Moto-taxi, Confort. *(Le covoiturage est reporté en vision future — décision du 18 août 2026.)*
- **Plateforme Admin web** : validation KYC, supervision temps réel, gestion des courses/litiges/annulations, suspensions/réactivations, **outils cartographiques** (ajout manuel + validation des tracés GPS **et des points de repère**), gestion des zones et tarifs, **suivi financier** (soldes, versements, payouts), évaluations/modération.
- **Carte custom** : fond OSM + couche de routes Teko + **couche de points de repère** + propositions automatiques issues des traces GPS + validation admin.
- **Navigation par points de repère** : adressage (situer un lieu par repère), guidage (instructions chauffeur formulées en repères) et **point de rendez-vous suggéré** par repère ; repères collaboratifs (chauffeurs + clients) validés par l'admin.
- **Moteur financier** : solde journalier, règles de commission, échéance 4h, désactivation automatique.
- **Notifications push** (demandes, prise en charge, arrivée, rappels de solde, suspension/réactivation, rappel d'évaluation).

### 5.2 Exclu du MVP (vision future — section 11)

Livraison de colis, déménagement, restauration, ambulance ; **covoiturage** (catégorie reportée — règle de partage du prix à concevoir à ce moment-là) ; **Moov Money** (ajouté après le MVP, derrière la même abstraction paiement) ; appels masqués client↔chauffeur ; programme de fidélité ; paiement par carte bancaire ; langues locales (l'app est toutefois conçue i18n-ready dès le départ).

### 5.3 Hors périmètre permanent (à ce stade)

Flotte de véhicules Teko en propre, location de véhicules, achats in-app non liés au transport.

---

## 6. Aperçu fonctionnel par application

### 6.1 Application Client (Expo React Native)

Commande de course avec **saisie des lieux par point de repère** (recherche de repère mise en avant, puis affinage par épingle et précision texte type « derrière »/« à côté ») ; choix de catégorie et estimation de prix ; **point de rendez-vous suggéré** (repère connu proche) ; appariement et suivi du chauffeur en temps réel sur la carte custom ; possibilité de **proposer un nouveau point de repère** ; messagerie/contact chauffeur ; choix du mode de paiement ; confirmation de fin de course et reçu ; évaluation 1–5 + commentaire ; SOS et partage de trajet ; historique des courses ; profil ; **widget flottant de consommation data** et **mode économie de données**.

### 6.2 Application Chauffeur (Expo React Native)

Inscription par rôle avec upload des pièces KYC et suivi du statut de validation ; bascule en ligne/hors ligne ; réception des demandes avec délai d'acceptation ; **navigation guidée par points de repère** sur la carte custom (instructions du type « tournez à droite après la station-service ») ; déroulé de course (arrivée, code PIN, démarrage, fin) ; **tableau de bord du solde journalier** (dette/créance en temps réel, échéance 4h, bouton de règlement mobile money) ; historique des recettes ; notes et badges ; widget data + mode économie. Les traces GPS du chauffeur alimentent (avec consentement) le système cartographique.

### 6.3 Plateforme Admin (web)

Tableau de bord temps réel (carte, courses en cours, volumes) ; file de validation KYC ; gestion des utilisateurs, suspensions et réactivations ; gestion des courses, litiges et annulations ; **console cartographique** (édition manuelle des routes **et des points de repère**, revue des tracés et **repères proposés**, zones tarifaires) ; **console financière** (soldes, versements entrants, payouts, impayés) ; modération des évaluations ; paramètres (taux de commission, plafonds, horaires, frais d'annulation, zones).

### 6.4 Backend (Supabase)

Auth (OTP SMS), base Postgres, temps réel (positions, statuts de course), Edge Functions pour la logique métier sensible (calcul de prix, mutations de solde, intégrations mobile money, jobs planifiés de désactivation et de payout), stockage des documents KYC. *(Le détail technique relève de la phase architecture.)*

---

## 7. Exigences non fonctionnelles

- **Sobriété réseau (priorité 1).** Minimiser octets échangés : positions throttlées et compressées, cartes en tuiles vectorielles mises en cache, images optimisées, synchronisation différée et par lots quand c'est possible. Le **widget data** mesure et affiche la consommation journalière de l'app ; le **mode économie** réduit fréquence GPS et richesse cartographique.
- **Tolérance à la mauvaise connexion.** Comportement raisonnable hors-ligne/again-online : files d'attente, reprise, états de chargement clairs, pas de perte de course sur micro-coupure.
- **Performance sur appareils modestes** (Android entrée de gamme).
- **Sécurité & confidentialité.** KYC chiffré et à accès restreint ; consentement explicite pour la collecte des traces GPS ; conformité aux exigences locales de protection des données ; traçabilité des actions admin.
- **Fiabilité financière.** Mutations de solde **atomiques et auditables** (aucune perte/double comptage) ; journal immuable des transactions.
- **Disponibilité temps réel** de l'appariement et du suivi.
- **Internationalisation** prête dès le départ (français livré, structure prête pour langues locales).
- **Observabilité** : journaux, métriques et alertes (notamment jobs financiers et désactivations).

---

## 8. Hypothèses

- Les chauffeurs disposent d'un compte Airtel Money pour régler leur solde (Moov Money en version future).
- L'API Airtel Money expose les flux nécessaires (encaissement client→Teko, payout Teko→chauffeur, suivi de statut, callbacks) — **évaluée et confirmée** (voir `../integrations/airtel-money-evaluation.md`). Moov Money sera intégré plus tard (`../integrations/moov-money-evaluation.md`).
- Un fournisseur d'envoi de SMS (OTP) au Gabon est disponible à coût soutenable.
- OpenStreetMap est utilisable comme fond de carte de base, enrichi par la couche Teko.
- Les chauffeurs acceptent la collecte de leurs traces GPS pour améliorer la carte.

---

## 9. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| APIs mobile money limitées/instables | Modèle financier fragilisé | Étudier tôt les APIs ; prévoir versement manuel + preuve, et rapprochement |
| Carte incomplète au lancement d'une zone | Mauvaise expérience, prix faux | Ouverture **zone par zone** conditionnée à une couverture minimale ; tarif par estimation prudente |
| Estimation de distance fausse (carte imprécise) | Prix erronés, litiges | Marges/garde-fous sur l'estimation ; possibilité d'ajustement ; collecte GPS pour corriger |
| Chauffeurs ne règlent pas le solde | Pertes pour Teko | Échéance 4h + désactivation auto + réactivation immédiate au paiement ; plafonds éventuels |
| Consommation data perçue comme élevée | Rejet utilisateurs | Widget transparent + mode économie + optimisation continue |
| Fraude (fausses courses, faux paiements) | Pertes, abus | KYC strict, code PIN, journaux, détection d'anomalies côté admin |
| Sécurité des personnes | Grave | SOS, partage de trajet, KYC + casier judiciaire, traçabilité |

---

## 10. Architecture cible (rappel, détaillée en phase suivante)

Monorepo **Turborepo + pnpm** regroupant : app client (Expo RN), app chauffeur (Expo RN), app admin (web), packages partagés (UI, types, logique métier, client API/Supabase, i18n), et le backend Supabase (migrations, Edge Functions). La conception détaillée fait l'objet du document d'architecture, **après validation de ce PRD**.

---

## 11. Vision long terme — super-app (hors MVP)

Conformément au cahier des charges client, Teko pourra ajouter par étapes : **livraison** de colis (scan, preuve de livraison), **déménagement** (devis au volume, moto-cargo/camion, abonnement mensuel), **restauration** (catalogue, commande, livraison par coursier Teko), **ambulance** (urgent/programmé, priorité de dispatch). Ces extensions réutiliseront le socle commun (comptes/KYC, carte, paiements, évaluations, notifications). L'architecture du MVP doit donc rester **modulaire et multi-rôles**, sans préjuger du calendrier d'ouverture de ces services.

S'ajoute à cette feuille de route l'intégration de **Moov Money** comme second rail de paiement mobile. Pour la préparer sans surcoût, le MVP expose dès le départ une **abstraction « paiement mobile »** (interface commune `collect` / `disburse` / `enquire`) dont Airtel Money est la première implémentation ; Moov Money viendra s'y brancher (l'accès Moov nécessite un accord marchand B2B — voir `../integrations/moov-money-evaluation.md`).

---

## 12. Documents liés

- `02-regles-metier.md` — règles financières, cartographie, KYC, tarification, annulations, évaluations.
- `03-user-stories.md` — epics et user stories avec critères d'acceptation.
- `04-glossaire.md` — terminologie partagée.
- `05-questions-ouvertes.md` — points à trancher avant/pendant l'architecture.
- `indication client/TEKO_CahierDeCharges.html` — cahier des charges d'origine (super-app).
