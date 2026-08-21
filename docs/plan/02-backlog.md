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

## 3. Pré-code (rappel des bloquants de la Phase 0 du plan)

Choix hébergeur carto (0.2) · fournisseur SMS OTP (0.3) · comptes Expo/EAS (0.4) · sandbox Airtel (0.5) · tuiles de repli (0.6). Détail et critères dans `00-plan-execution.md` §4.

## Éléments clos

| Date | ID | Élément | Résultat |
|---|---|---|---|
| 18 août 2026 | UX-01 | Bouton SOS sur C-13 / C-13b | Bouton flottant rouge en haut à droite de la carte, ouvre l'overlay C-27. |
| 18 août 2026 | UX-02 | D-08b — Pièce refusée | Variante livrée : motif admin affiché tel quel, remplacement ciblé d'une seule pièce, reste du dossier préservé. |
| 18 août 2026 | UX-03 | D-20 — Historique des courses chauffeur | Livré : onglet « Courses » actif, sections par jour avec total net, chaque ligne montre net + décomposition course/commission + mode de paiement (y compris compensation d'annulation). |
| 18 août 2026 | UX-04 | C-31 — Mes repères proposés | Livré : statuts accepté / en validation / refusé avec motif, compteur d'impact (« 214 personnes ont utilisé vos repères »). |
