# Backend et données — contrat de l’alpha

Mis à jour le 18 octobre 2026. Les migrations de `supabase/migrations` et les
scénarios JWT de `supabase/tests/e2e` sont les références exécutables. Le
[plan alpha](../plan/08-plan-alpha.md) définit les critères d’ouverture ; le
[rapport d’audit](../plan/09-audit-alpha.md) distingue corrections et preuves
encore attendues.

## Autorité et frontières

PostgreSQL porte les transitions de course, les rôles, la tarification, le
grand livre et les clôtures. Les apps utilisent `@teko/api-client` pour les
RPC, les lectures RLS et les Edge Functions. Un bouton masqué dans l’interface
ne constitue jamais un contrôle d’autorisation.

Les Edge Functions servent les intégrations : calcul d’itinéraire pour le
devis, notifications, purge Auth, anciens adaptateurs de paiement. Leurs clés
de service restent côté serveur. L’alpha désactive les paiements Airtel réels ;
le fournisseur mock n’est utilisable que dans un bac à sable explicitement
configuré avec son secret.

## Données principales

| Ensemble | Tables / schéma | Règle essentielle |
|---|---|---|
| Identité | Auth, `profiles`, `drivers`, `vehicles` | Le numéro vérifié vient d’Auth, pas d’un profil modifiable. |
| Alpha | `alpha_invites` | Ops/superadmin invitent par numéro et rôle ; refus serveur hors invitation. |
| KYC | `driver_documents`, bucket privé `kyc` | Sept pièces, fichiers immuables, revue Ops et vérification physique avant activation. |
| Devis | `ride_quotes` | Calcul serveur, propriétaire, expiration cinq minutes configurable et consommation unique. |
| Courses | `rides`, `ride_events`, `ride_offers`, `driver_presence` | Écriture métier par RPC ; une offre ne révèle pas la destination avant acceptation. |
| PIN | `private.ride_pins` | Aucun PIN dans la ligne publique ; lecture dédiée du passager uniquement. |
| GPS de course | `ride_locations` | Chauffeur assigné, course active, horodatage réel, identifiant de mesure et rétention sept jours. |
| Finance | `ledger`, `payments`, `daily_statements`, `payout_requests` | Grand livre autoritaire ; clôture cash produit un versement en attente. |
| Encaissements | `cancellation_claims`, `manual_receipts`, bucket privé `finance-proofs` | Crédit seulement après encaissement complet et validation Finance ; référence, preuve et versions tracées. |
| Exploitation | `incidents`, `notifications`, `audit_log`, `app_config`, `app_config_history` | Droits selon rôle ; secrets de déploiement exclus des lectures et de l’historique. |
| Cartographie | Zones, repères et tables de traces/propositions | Règles séparées du suivi nominatif ; ne pas confondre les rétentions. |

## Contrats de course

1. `price-quote` vérifie le JWT, appelle Valhalla depuis le serveur et crée un
   devis en base. Les distances et prix proposés par l’app ne font pas foi.
2. `request_quoted_ride` consomme le devis du passager. Deux appels concurrents
   retrouvent une seule course. Un devis expiré demande une nouvelle
   confirmation du prix. L’ancien contrat acceptant des métriques client
   n’est plus exécutable par les utilisateurs.
3. `driver_heartbeat` renouvelle la disponibilité d’un chauffeur actif, invité
   et validé. `driver_offline` la retire et fait expirer ses offres en attente.
   La présence expirée ne rend plus le chauffeur éligible.
4. Le dispatch propose une offre à la fois, retente les chauffeurs devenus
   éligibles et termine explicitement la recherche après trois minutes
   configurables. `respond_offer` contrôle l’invitation et la disponibilité.
5. Les transitions sont `mark_arrived`, `start_ride_checked`, `complete_ride`
   et `cancel_ride`. Les transitions internes ne sont pas exposées aux JWT
   ordinaires. Le prix final reste celui accepté au devis.
6. `ride_pin` est réservé au passager. `start_ride_checked` retourne soit la
   course, soit une erreur structurée. Une erreur de PIN ne lève pas une
   exception SQL annulant le compteur : cinq erreurs persistent puis
   déclenchent cinq minutes de blocage.

Seules les courses immédiates en cash sont ouvertes dans l’alpha. Les anciens
contrats de courses programmées et de paiement restent historiques ; leur
présence dans le dépôt n’autorise pas leur activation.

## Finance et séparation des rôles

Ops prépare un dossier avec référence unique et justificatif joint. Finance
ou superadmin vérifie puis approuve. Les preuves ne sont pas remplaçables.
Un refus exige un motif ; une nouvelle version conserve la référence et le
lien avec la précédente. Une seule validation financière est possible pour
la référence, y compris sous concurrence.

Les annulations et non-présentations créent une créance. La part chauffeur de
70 % est figée à sa création et créditée uniquement après règlement complet
et validation Finance. À 4 h Libreville, un solde positif crée une demande de
versement manuel ; il n’est pas déclaré payé sans justificatif approuvé.

Le chauffeur consulte ses finances. Finance/superadmin lisent les données
financières globales. Ops accède aux dossiers nécessaires à la préparation,
mais ne valide pas le crédit et ne lit pas le grand livre global. Les pièces
KYC sont réservées au chauffeur concerné, à Ops et au superadmin.

## Hors réseau et conservation

Les commandes et annulations exigent une confirmation serveur, sans file de
rejeu tardif. L’historique local est lié au compte et exclut PIN et géométries
précises. Le changement de compte vide les caches exposés par l’interface.

La file GPS SQLite du chauffeur conserve uniquement ses mesures, au maximum
24 h, avec leur heure et leur identifiant d’origine. Les envois répétés ne
créent pas de doublon. Les mesures expirées ou futures sont refusées ; les
points trop anciens ne deviennent jamais des positions « fraîches » au
retour du réseau. La lecture serveur s’arrête après sept jours et une tâche
planifiée purge les lignes expirées toutes les cinq minutes.

Le service Android au premier plan affiche une notification permanente et
continue les mesures écran éteint tant que le chauffeur est en ligne ou en
course. Son fonctionnement réel sur l’OPPO et le Pixel reste à démontrer.

## Migrations, types et tests

Une migration supplémentaire corrige les installations existantes ; modifier
une ancienne migration déjà livrée ne suffit pas. Les types TypeScript sont
générés depuis le schéma, puis remplacés atomiquement. Ne pas écrire dans un
fichier de types pendant qu’un autre processus le compile.

Le banc `teko-alpha-audit` possède ses ports et secrets locaux. Les tests
adversariaux refusent une cible différente. Le projet `teko` existant alimente
encore la cartographie locale et doit être préservé. La CI utilise un contrat
HTTP de routage déterministe ; il ne prouve pas la qualité des routes réelles.

La validation comprend migration complète, pgTAP, JWT/API/Storage, tests
unitaires, fautes injectées, sauvegarde/restauration et parcours sur APK signé.
Les chiffres de couverture et les commandes sont consignés dans les journaux
et le rapport d’audit, avec leurs limites.
