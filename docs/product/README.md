# Documentation produit — Teko

Plateforme de transport de personnes à la demande pour le **Gabon** (MVP *ride-hailing*), avec vision long terme de super-app de services urbains.

**Stack cible :** monorepo Turborepo + pnpm · 2 apps Expo React Native (client, chauffeur) · plateforme admin web · backend Supabase.

## Comment lire cette documentation

1. **[01-PRD.md](01-PRD.md)** — Document d'exigences produit : vision, objectifs, contexte Gabon, personas, périmètre MVP, fonctionnalités par app, exigences non fonctionnelles, risques, vision super-app.
2. **[02-regles-metier.md](02-regles-metier.md)** — Logique métier : modèle financier (solde journalier, mobile money, désactivation 4h), tarification, cartographie collaborative, KYC, annulations, évaluations, jobs.
3. **[03-user-stories.md](03-user-stories.md)** — Epics et user stories (P0/P1/P2) avec critères d'acceptation, identifiants `TK-xxx`.
4. **[04-glossaire.md](04-glossaire.md)** — Terminologie partagée.
5. **[05-questions-ouvertes.md](05-questions-ouvertes.md)** — Décisions restant à arrêter avant/pendant l'architecture.

## Quatre partis pris différenciants (contexte gabonais)
- **Sobriété data** : widget de consommation journalière + mode économie de données.
- **Carte custom collaborative** : OSM + routes ajoutées par admin + propositions issues du GPS chauffeurs, validées par admin.
- **Navigation par points de repère** : adressage et guidage par repères (station-service, rond-point, marché…), repères collaboratifs validés par l'admin — comme on s'oriente réellement au Gabon.
- **Solde journalier cash** : dette/créance chauffeur↔Teko, règlement quotidien par mobile money avant 4h (**Airtel Money** au MVP ; Moov Money en version future).

## Décisions validées
Voir le rappel en tête de [05-questions-ouvertes.md](05-questions-ouvertes.md).

## Statut
Version 0.1 — brouillon en revue. Prochaine étape après validation : **document d'architecture système**, puis **design**, puis **implémentation**.

## Source d'origine
Cahier des charges client : `../../indication client/TEKO_CahierDeCharges.html` (décrit la super-app complète).
