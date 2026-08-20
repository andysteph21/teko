# Teko — Suivi des réponses client

**Paquet envoyé :** préparé le 18 août 2026 (`envoi-client/` — document Word remplissable + 3 vidéos + PDF coûts). **Date d'envoi effectif : à renseigner.**
**Règle :** ce document est LA source de vérité sur ce qu'on attend du client. Une réponse reçue = statut mis à jour ici **puis** décision reportée dans `../product/05-questions-ouvertes.md` (table « Décisions tranchées ») **puis** documents/maquettes impactés mis à jour. Ne jamais mettre à jour les autres documents sans passer par ici.

**Relance suggérée :** J+7 sur les 6 questions bloquantes si aucune réponse.

## Vue d'ensemble

| | Total | ⏳ En attente | ✅ Répondu | ➡️ Appliqué |
|---|---|---|---|---|
| Bloquantes ⛔ | 6 | 6 | 0 | 0 |
| Avant lancement | 11 | 11 | 0 | 0 |
| Ajustables | 9 | 9 | 0 | 0 |
| **Total** | **26** | **26** | **0** | **0** |

## Détail des 26 questions

Statuts : ⏳ en attente · ✅ répondu (réponse notée) · ➡️ appliqué (docs + maquettes à jour). « Défaut » = valeur qui s'applique sans réponse.

### ⛔ Bloquantes (conditionnent le démarrage)

| N° | Question (résumé) | Défaut / recommandation | Statut | Réponse client | Appliqué le |
|---|---|---|---|---|---|
| 5 | Valeurs par défaut (commission 15 %, frais annulation max(300 F, 20 %), part chauffeur 70 %, délai 12 s, no-show 5 min, urgence 4 h) | Valeurs maquettées | ⏳ | — | — |
| 7 | Grille tarifaire de départ | Séance de travail dédiée | ⏳ | — | — |
| 11 | Compte marchand Airtel — qui porte, quand | Démarrer immédiatement | ⏳ | — | — |
| 16 | Conseil juridique données personnelles — qui | Mandater un cabinet local | ⏳ | — | — |
| 21 | Fournisseur SMS OTP Gabon | Devis parallèles intl + régional | ⏳ | — | — |
| 22 | Hébergeur cartographie | Scaleway ou OVH (Paris) | ⏳ | — | — |

### Avant lancement

| N° | Question (résumé) | Défaut / recommandation | Statut | Réponse client | Appliqué le |
|---|---|---|---|---|---|
| 2 | Clôture 04 h : report ou remise à zéro | Report du résiduel | ⏳ | — | — |
| 3 | Payout : fréquence + seuil | Quotidien, sans seuil | ⏳ | — | — |
| 6 | Prix ferme garanti ou ajustable | Prix ferme + marge | ⏳ | — | — |
| 9 | Destination cachée avant acceptation | Cachée, réévaluée en bêta | ⏳ | — | — |
| 10 | Règlements manuels : qui valide, délai | Rôle Finance, avant clôture | ⏳ | — | — |
| 13 | Seuil de couverture carto par zone | — | ⏳ | — | — |
| 14 | Conservation des traces GPS | Anonymisation immédiate, 12 mois | ⏳ | — | — |
| 17 | Procédure SOS : qui est alerté | Équipe ops + engagement de rappel | ⏳ | — | — |
| 18 | Vérification physique des chauffeurs | Oui, première vague | ⏳ | — | — |
| 25 | Libreville en premier | Confirmer | ⏳ | — | — |
| 26 | Android d'abord, iOS ensuite | Confirmer | ⏳ | — | — |

### Ajustables (défaut appliqué, modifiable en console)

| N° | Question (résumé) | Défaut / recommandation | Statut | Réponse client | Appliqué le |
|---|---|---|---|---|---|
| 1 | Commission aussi sur Airtel Money | Oui, tous modes | ⏳ | — | — |
| 4 | Plafond de dette intra-journée | Non au lancement | ⏳ | — | — |
| 8 | Effet des refus répétés chauffeur | Aucun en bêta, priorité douce ensuite | ⏳ | — | — |
| 12 | Seuil de détection route proposée | 10 passages / 5 chauffeurs / 3 sem. | ⏳ | — | — |
| 15 | Distance doublon de repères | 50 m | ⏳ | — | — |
| 19 | Budget widget data | 100 Mo, alertes 50/80 % | ⏳ | — | — |
| 20 | Réglages mode économie | Table maquettée C-25 | ⏳ | — | — |
| 23 | Tuiles de repli | MapTiler ou Stadia | ⏳ | — | — |
| 24 | Cadence rebuild itinéraires | Nocturne + bouton manuel | ⏳ | — | — |

## Autres attentes vis-à-vis du client

| Attente | Statut |
|---|---|
| Accusé de réception du paquet (docx + 3 vidéos + PDF coûts) | ⏳ |
| Retour général sur les vidéos / maquettes (ton, identité visuelle) | ⏳ |
| Prix de référence terrain pour la séance tarifaire (question 7) | ⏳ |
| Contact désigné côté client pour les démarches Airtel (question 11) | ⏳ |

## Procédure au retour d'une réponse

1. Noter la réponse + date dans la table ci-dessus (statut ✅).
2. Reporter la décision dans `../product/05-questions-ouvertes.md` (« Décisions tranchées », datée).
3. Mettre à jour les artefacts impactés : maquette A-07 (défauts), `03-estimation-couts-ti.md` (21/22), `01-registre-risques.md` (R2/R7/R8…), PRD/règles métier si périmètre.
4. Passer le statut à ➡️ appliqué avec la date. Quand les 6 bloquantes sont ➡️ : lancer la Phase 0 du plan (`00-plan-execution.md` §4).
