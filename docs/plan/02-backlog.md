# Teko — Backlog produit

**Créé :** 18 août 2026 · **Règle :** liste unique et ordonnée du travail décidé mais non réalisé. Chaque élément porte son contexte et son critère d'acceptation. On nettoie à chaque revue : un élément qui ne sera jamais fait est supprimé, pas conservé.

Les lots de développement (monorepo, infra carto, apps, durcissement Airtel) restent décrits dans `00-plan-execution.md` — ce backlog couvre le grain plus fin.

## 1. UX v1.1 — issus de l'audit de cohérence du 18 août 2026

*(Tous réalisés le 18 août 2026 — voir « Éléments clos ».)*

## 2. Documentation & spécification

| Prio | ID | Élément | Critère d'acceptation |
|---|---|---|---|
| 5 | DOC-01 | **Procédure opérationnelle du repli manuel de règlement** (qui valide la preuve, sous quel délai) | Document court validé par Finance ; référencé depuis D-16 et A-05. |
| 6 | DOC-02 | **Procédure opérationnelle SOS** (qui reçoit, qui rappelle, escalade) | Document validé ; cohérent avec C-27 et le fil d'activité A-02. |

## 2b. Post-MVP (décision reportée le 20 août 2026)

| Prio | ID | Élément | Critère d'acceptation |
|---|---|---|---|
| — | OSM-01 | **Stratégie de contribution OSM** (reportée après déploiement MVP) : ADR-15 à rédiger — publication ODbL de la couche `teko_roads`, journée OSM mensuelle (upload manuel JOSM, compte dédié, jamais d'import massif), `osm_way_id` sur `road_segments` pour dédupliquer la conflation ; salience/usage des repères restent internes | ADR acté + process documenté |
| ✅ | OSM-02 | ~~Attribution « © les contributeurs OpenStreetMap »~~ **réglé le 20 août** : contrôle compact dans `@teko/maps`, attribution portée par la source ; `teko_roads` publiée ODbL (`infra/tiles/martin/LICENCE-DONNEES.md`) ; colonne `provenance` sur road_segments/landmarks (migration 0020) | Attribution visible sur toute carte en prod |

## 2c. Actions issues des réponses client (25 août 2026)

| Prio | ID | Élément | Critère d'acceptation |
|---|---|---|---|
| 1 | CL-01 | **Séance tarifaire** (question n° 7, dernier point ouvert) : préparer le simulateur + relevés terrain (centre, aéroport, Akébé) | Grille validée, injectée dans `pricing_rules` |
| 1 | CL-02 | **Mesure de latence Libreville → Scaleway/OVH Paris** (n° 22) puis contractualisation | Hébergeur signé, chiffres archivés |
| 1 | CL-03 | **Devis + test de délivrabilité SMS** Twilio/Vonage vs acteur régional, sur numéros Airtel et Moov (n° 21) | Fournisseur choisi sur mesures |
| 2 | CL-04 | **Compte MapTiler** (repli cartes, n° 23) + URL de style de secours dans la config | Bascule testée |
| 2 | CL-05 | **A-04 : bouton « Reconstruire les itinéraires »** (n° 24) — maquette + Claude Design + implémentation console | Bouton visible, pipeline déclenché |
| 2 | CL-06 | **Job de purge des traces GPS > 12 mois** (n° 14, après avis juridique n° 16) | pg_cron + test |
| 2 | CL-07 | **Alerte doublon repères < 50 m** dans la console carto (n° 15, config déjà en base) | Alerte visible à la validation |
| 3 | CL-08 | **Priorité douce post-bêta** selon taux d'acceptation (n° 8) — à activer après la bêta | Dispatch pondéré, réversible |
| 3 | CL-09 | **Procédure de vérification physique** première vague chauffeurs (n° 18) — check-list ops | Document validé |
| — | — | Suivi externe client : démarche Airtel (n° 11), cabinet juridique (n° 16), seuil de couverture zone (n° 13) | — |

## 3. Pré-code (rappel des bloquants de la Phase 0 du plan)

~~Choix hébergeur carto (0.2)~~ → CL-02 · ~~fournisseur SMS OTP (0.3)~~ → CL-03 · comptes Expo/EAS (0.4) · sandbox Airtel (0.5) · ~~tuiles de repli (0.6)~~ → CL-04 (MapTiler). Détail et critères dans `00-plan-execution.md` §4.

## Éléments clos

| Date | ID | Élément | Résultat |
|---|---|---|---|
| 18 août 2026 | UX-01 | Bouton SOS sur C-13 / C-13b | Bouton flottant rouge en haut à droite de la carte, ouvre l'overlay C-27. |
| 18 août 2026 | UX-02 | D-08b — Pièce refusée | Variante livrée : motif admin affiché tel quel, remplacement ciblé d'une seule pièce, reste du dossier préservé. |
| 18 août 2026 | UX-03 | D-20 — Historique des courses chauffeur | Livré : onglet « Courses » actif, sections par jour avec total net, chaque ligne montre net + décomposition course/commission + mode de paiement (y compris compensation d'annulation). |
| 18 août 2026 | UX-04 | C-31 — Mes repères proposés | Livré : statuts accepté / en validation / refusé avec motif, compteur d'impact (« 214 personnes ont utilisé vos repères »). |
