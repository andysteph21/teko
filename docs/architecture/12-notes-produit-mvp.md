# Notes produit & dettes assumées — sortie des lots 3, 4, 5

Constats faits en construisant les trois applications contre le backend réel
(stack locale + appareils). Rien ici ne bloque le MVP ; chaque point est déjà
signalé par un `TODO` dans le code concerné. Classés par gravité produit.

## À traiter avant le lancement

1. **Pas de re-dispatch** : une course `requested` sans chauffeur éligible au
   moment de la demande n'est **jamais re-proposée** (l'offre part une seule
   fois à la création). Il faut un re-dispatch périodique (pg_cron sur les
   `requested` de plus de N secondes) ou un déclencheur sur l'arrivée d'un
   heartbeat éligible. Impact client : « Recherche d'un chauffeur… » sans fin.
2. **Positions temps réel absentes de la console** (A-02/AM-06) : aucun canal
   admin vers `driver_presence`/positions de course — la carte en direct
   n'affiche que le fond. Prévoir un canal Realtime dédié (ADR-13 étendu) ou
   une vue lisible admin.
3. ~~**Statut `no_show` côté app chauffeur** : `cancel_ride` accepte un statut
   dédié côté SQL mais l'api-client ne l'expose pas — « Passager absent »
   part aujourd'hui en `cancelled` avec motif texte.~~ **Traité le 2 sept. 2026** :
   `cancelRide(client, rideId, reason, status)` expose `no_show`/`no_answer`,
   l'app chauffeur l'utilise — le frais de non-présentation (1 000 F, part
   chauffeur 70 %) est enfin appliqué (il ne l'était jamais : perte de paie
   chauffeur constatée en validation générale).

## Améliorations visibles à l'écran (données manquantes en base)

4. **Net chauffeur par course** : la commission ne vit qu'au grand livre —
   D-14/D-20 affichent le brut + « commission déduite au solde ». Exposer le
   net par course (jointure ledger ou colonne calculée).
5. **Stats chauffeur** (D-18 : nombre de courses, taux d'acceptation ;
   A-02 : temps d'attribution médian ; A-05 : volume réel du jour) : aucun
   agrégat backend. Prévoir vues matérialisées ou RPC de stats.
6. **Expiration des pièces KYC** : `driver_documents` n'a pas de
   `expires_at` — l'alerte « Expire bientôt » (D-18) et la relance J-30 sont
   impossibles.
7. **Noms joints manquants** : relevés admin sans nom du chauffeur,
   propositions carto sans nom du proposant, grand livre sans passager —
   jointures à exposer côté api-client (RLS admin le permet déjà).
8. **Recents sans coordonnées** (C-08) : les recherches récentes du client ne
   gardent pas le point — re-sélection = nouvelle recherche.
9. **Motif de rejet des propositions de repères** : `landmark_proposals` n'a
   pas de colonne motif — le client voit « Refusée » sans explication.

## Parcours différés (assumés MVP)

10. **Choix d'origine sans GPS** (C-06bis) : pas d'écran de saisie manuelle du
    point de départ quand la localisation est refusée — l'app recadre sur
    Libreville.
11. **Changement du numéro de versement** (parcours J) : double vérification
    (OTP + mini-versement) non construite — stub explicite dans D-18.
12. **Justificatif de règlement manuel** (DOC-01) : le repli hors Airtel est
    décrit à l'écran mais le dépôt du reçu n'est pas implémenté.
13. **Demandes de suppression de compte côté console** : aucune vue admin des
    `deletion_requested_at`.
14. **Notation chauffeur→client** (D-14) : lien présent, écran non construit.
15. **Upload de la photo de profil chauffeur** (D-04) : pastille décorative,
    upload réel à brancher (type `profile_photo`, bucket kyc).

## Notes techniques utiles

- `TekoMapView` (RN) n'expose pas les rappels caméra — l'affinage du point
  par glisser de carte (C-09) est en TODO.
- La proposition acceptée passe en statut **`merged`** (pas `validated`) —
  toute lecture « validées récemment » doit interroger `merged`.
- `rides.updated_at` sert de repère au compte à rebours no-show (pas de
  colonne `arrived_at`) — dérive possible si un autre update touche la ligne.
- Reconstruction du graphe routier (Valhalla) : manuelle (CL-05), affichée
  comme telle dans la console carto.
