# Teko — Suivi des réponses client

**Paquet envoyé :** préparé le 18 août 2026 (`envoi-client/`). **Réponses reçues le 25 août 2026** (`Teko-Decisions-repondu-detaille.docx`) — **26/26 questions répondues**, dont les 6 bloquantes. Seule la n° 7 (grille tarifaire) renvoie à une séance de travail dédiée.
**Règle :** ce document est LA source de vérité sur ce qu'on attend du client. Une réponse reçue = statut mis à jour ici **puis** décision reportée dans `../product/05-questions-ouvertes.md` (table « Décisions tranchées ») **puis** documents/maquettes impactés mis à jour. Ne jamais mettre à jour les autres documents sans passer par ici.

**Relance suggérée :** J+7 sur les 6 questions bloquantes si aucune réponse.

## Vue d'ensemble

| | Total | ⏳ En attente | ✅ Répondu | ➡️ Appliqué |
|---|---|---|---|---|
| Bloquantes ⛔ | 6 | 0 | 5 | 1 |
| Avant lancement | 11 | 0 | 1 | 10 |
| Ajustables | 9 | 0 | 0 | 9 |
| **Total** | **26** | **0** | **6** | **20** |

> ✅ = répondu, action hors dépôt en cours (séance tarifaire, démarches Airtel/juridique/SMS/hébergeur, seuil de couverture à chiffrer). ➡️ = réponse intégrée aux documents et à la configuration le 25 août 2026.

## Détail des 26 questions

Statuts : ⏳ en attente · ✅ répondu (réponse notée) · ➡️ appliqué (docs + maquettes à jour). « Défaut » = valeur qui s'applique sans réponse.

### ⛔ Bloquantes (conditionnent le démarrage)

| N° | Question (résumé) | Défaut / recommandation | Statut | Réponse client | Appliqué le |
|---|---|---|---|---|---|
| 5 | Valeurs par défaut (commission 15 %, frais annulation max(300 F, 20 %), part chauffeur 70 %, délai 12 s, no-show 5 min, urgence 4 h) | Valeurs maquettées | ➡️ | Les six valeurs validées telles quelles | 25 août |
| 7 | Grille tarifaire de départ | Séance de travail dédiée | ✅ | Séance de travail dédiée (simulateur + relevés terrain) | — |
| 11 | Compte marchand Airtel — qui porte, quand | Démarrer immédiatement | ✅ | Démarche lancée immédiatement côté client | — |
| 16 | Conseil juridique données personnelles — qui | Mandater un cabinet local | ✅ | Cabinet juridique gabonais mandaté dès maintenant | — |
| 21 | Fournisseur SMS OTP Gabon | Devis parallèles intl + régional | ✅ | Devis Twilio/Vonage + régional, test de délivrabilité Airtel/Moov | — |
| 22 | Hébergeur cartographie | Scaleway ou OVH (Paris) | ✅ | Scaleway ou OVH Paris, sous réserve de latence mesurée | — |

### Avant lancement

| N° | Question (résumé) | Défaut / recommandation | Statut | Réponse client | Appliqué le |
|---|---|---|---|---|---|
| 2 | Clôture 04 h : report ou remise à zéro | Report du résiduel | ➡️ | Report du résiduel + suspension automatique | 25 août |
| 3 | Payout : fréquence + seuil | Quotidien, sans seuil | ➡️ | Quotidien automatique à la clôture, sans seuil | 25 août |
| 6 | Prix ferme garanti ou ajustable | Prix ferme + marge | ➡️ | Prix ferme garanti, marge de prudence dans le calcul | 25 août |
| 9 | Destination cachée avant acceptation | Cachée, réévaluée en bêta | ➡️ | Cachée jusqu'à acceptation, réévaluée en bêta | 25 août |
| 10 | Règlements manuels : qui valide, délai | Rôle Finance, avant clôture | ➡️ | Rôle Finance, traitement avant la clôture de la nuit | 25 août |
| 13 | Seuil de couverture carto par zone | — | ✅ | Axes principaux + repères clés ; seuil chiffré à formaliser | — |
| 14 | Conservation des traces GPS | Anonymisation immédiate, 12 mois | ➡️ | Anonymisation immédiate, 12 mois (réserve juridique n° 16) | 25 août |
| 17 | Procédure SOS : qui est alerté | Équipe ops + engagement de rappel | ➡️ | Équipe opérations + engagement de rappel | 25 août |
| 18 | Vérification physique des chauffeurs | Oui, première vague | ➡️ | Oui, première vague à Libreville | 25 août |
| 25 | Libreville en premier | Confirmer | ➡️ | Libreville confirmé | 25 août |
| 26 | Android d'abord, iOS ensuite | Confirmer | ➡️ | Android uniquement confirmé, iPhone ensuite | 25 août |

### Ajustables (défaut appliqué, modifiable en console)

| N° | Question (résumé) | Défaut / recommandation | Statut | Réponse client | Appliqué le |
|---|---|---|---|---|---|
| 1 | Commission aussi sur Airtel Money | Oui, tous modes | ➡️ | Commission identique sur tous les modes | 25 août |
| 4 | Plafond de dette intra-journée | Non au lancement | ➡️ | Pas de plafond intrajournalier au lancement | 25 août |
| 8 | Effet des refus répétés chauffeur | Aucun en bêta, priorité douce ensuite | ➡️ | Aucun effet en bêta, puis priorité douce | 25 août |
| 12 | Seuil de détection route proposée | 10 passages / 5 chauffeurs / 3 sem. | ➡️ | ≥ 10 passages, ≥ 5 chauffeurs, 3 semaines | 25 août |
| 15 | Distance doublon de repères | 50 m | ➡️ | 50 mètres | 25 août |
| 19 | Budget widget data | 100 Mo, alertes 50/80 % | ➡️ | 100 Mo / alerte 50 % / critique 80 % validés | 25 août |
| 20 | Réglages mode économie | Table maquettée C-25 | ➡️ | Réglages maquettés validés (5 s, carte simplifiée, initiales) | 25 août |
| 23 | Tuiles de repli | MapTiler ou Stadia | ➡️ | MapTiler | 25 août |
| 24 | Cadence rebuild itinéraires | Nocturne + bouton manuel | ➡️ | Chaque nuit + bouton manuel dans la console | 25 août |

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
