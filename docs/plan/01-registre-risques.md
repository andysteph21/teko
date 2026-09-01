# Teko — Registre des risques

**Créé :** 18 août 2026 · **Revue :** à chaque jalon (M1–M5) et avant toute mise en production.
Complète la table « Risques & mitigations » du plan d'exécution (risques *projet*) : ce registre suit les risques **produit, sécurité et opérations** dans la durée, avec un propriétaire et un statut.

Échelles : probabilité et impact **F**aible / **M**oyen / **É**levé.

| ID | Risque | Prob. | Impact | Mitigation | Propriétaire | Statut |
|---|---|---|---|---|---|---|
| R1 | **Callback Airtel non authentifié** : l'endpoint `airtel-callback` mène à `confirm_payment` (écritures irréversibles au grand livre). État au 2 sept. 2026 : fermé par défaut (jeton « Callback With Authentication » obligatoire, HMAC du corps optionnel), mais **nom d'en-tête et format de signature non confirmés en sandbox**, et le **rejeu d'un même `transaction.id`** (idempotence) n'a été éprouvé qu'avec le fournisseur simulé. | É | É | Valider en sandbox Airtel : schéma de signature (Message Signing), rejeu, puis tests de rejet en CI ; **bloquant go-live**. En attendant, Airtel Money est **masqué dans l'app client** (arbitrage C du 2 sept., `05-questions-ouvertes.md`). | Tech | **Ouvert — bloquant M4 (sandbox Airtel)** |
| R2 | **Fournisseur SMS OTP non choisi** : sans lui, aucune inscription possible ; coût/SMS élevé au Gabon peut renchérir chaque inscription. | É | É | Trancher 0.3 du plan tôt ; repli e-mail OTP (MVP) déjà décidé ; surveiller le taux de délivrabilité dès la bêta. | Produit/Tech | Ouvert |
| R3 | **KYC à distance insuffisant** : documents falsifiés ou illisibles, pas de vérification en personne prévue. | M | É | Motifs de refus visibles (A-03/D-08) ; envisager un point de vérification physique au lancement (question ouverte §5) ; casier judiciaire obligatoire déjà acté. | Ops | Ouvert |
| R4 | **Numéros prépayés recyclés** → accès au compte d'un ancien titulaire. | M | M | Décision du 18 août : vérification douce après 1 mois d'inactivité (C-04) ; e-mail de récupération optionnel. | Produit | **Mitigé** (à implémenter) |
| R5 | **Chauffeurs ne règlent pas le solde** (dette cash). | M | É | Échéance 04 h + suspension auto + réactivation immédiate (`daily_close`, `maybe_reactivate_driver`) — livré côté backend, maquetté (D-15/D-16, A-05). Suivre le « taux de règlement avant 4h » (KPI PRD). | Finance | Mitigé |
| R6 | **Latence Paris ↔ Gabon** (Supabase eu-west-3, ADR-11). | M | M | Mesures en staging ; CDN tuiles ; Realtime frugal ; mode éco. | Tech | Ouvert |
| R7 | **Accord marchand Airtel** (activation production, frais, limites non confirmés). | M | É | Démarrer la démarche commerciale tôt (0.5) ; sandbox d'abord ; cash disponible au MVP en repli. | Business | Ouvert |
| R8 | **Conformité données personnelles Gabon** (KYC, GPS, rétention 30 j, purge post-suppression). | M | É | Validation juridique des durées de conservation ; consentement GPS explicite déjà spécifié ; anonymisation à la suppression (C-28/F). | Juridique | Ouvert |
| R9 | **Cadre réglementaire VTC/transport au Gabon** flou pour le ride-hailing. | M | É | Conseil juridique local avant lancement ; dialogue avec les autorités de transport. | Business | Ouvert |
| R10 | **Liquidité au démarrage** : trop peu de chauffeurs → temps d'attribution longs, et la destination cachée (décision 11) peut aggraver les refus. | M | M | Suivre le délai d'appariement (KPI) ; réévaluer la destination cachée et le délai d'acceptation (12 s) selon les données bêta. | Produit | Ouvert |

## Procédure

- Tout nouveau risque identifié (audit, incident, retour terrain) entre ici avec un ID, jamais dans un fil de discussion uniquement.
- Un risque ne se **supprime** pas : il passe à « Mitigé » (avec la mesure) ou « Clos » (avec la raison et la date).
- Les risques **bloquants pour un jalon** sont signalés dans la colonne Statut et repris dans le plan d'exécution.
