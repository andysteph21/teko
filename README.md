# Teko

Plateforme de transport à la demande conçue pour le Gabon (MVP ride-hailing, ambition super-app). Ce README est la carte du projet — chaque dossier a sa documentation propre.

**Cap alpha confirmé le 18 octobre 2026 :** alpha fermée à Libreville, environ
20 chauffeurs, courses immédiates et cash uniquement. Le
[plan alpha](docs/plan/08-plan-alpha.md) précise les travaux de documentation,
audit de sécurité, tests mordants et validation avant les premières courses
réelles. L’implémentation et la validation sont en cours ; ce dépôt ne constitue
pas encore un feu vert pour les courses réelles.

**Architecture constatée le 18 octobre 2026 :** trois applications implémentées,
passager et chauffeur sous Expo/React Native, console sous Next.js. Les fonctions
PostgreSQL portent les transitions de course, le tarif et le grand livre ; les
Edge Functions gèrent les intégrations réseau. Martin fournit les tuiles et
Valhalla les itinéraires. `packages/api-client` porte les contrats d’accès ; les
types de base sont générés. Les comptes rendus d’août et septembre restent dans
les documents de lots ; leurs anciens nombres de tests ne décrivent pas les
vérifications actuelles.

## Structure du projet

```
teko/
├─ docs/
│  ├─ product/          # PRD v0.2, règles métier, user stories, glossaire,
│  │                    # 05-questions-ouvertes.md (décisions tranchées + restantes)
│  ├─ architecture/     # Vue d'ensemble, backend/données, paiements, cartographie,
│  │                    # ADR-01→11, infra carto self-hosted
│  ├─ design/           # design-tokens.json (canonique), design-system.html,
│  │  │                 # app-icons, 06-maquettes.md (index), 07-admin-responsive.md
│  │  └─ maquettes/     # SOURCES des 79 maquettes HTML (foundations, components,
│  │                    # client, chauffeur, admin, admin-mobile)
│  ├─ plan/             # 00-plan-execution.md (lots, jalons) · 01-registre-risques.md
│  │                    # 02-backlog.md · 03-estimation-couts-ti.md · 04-suivi-client.md
│  │                    # 05-reference-taxido.md · 06-demarrage-apps.md (POINT D'ENTRÉE apps)
│  └─ integrations/     # Évaluations Airtel Money & Moov Money
├─ supabase/            # Migrations, RPC PostgreSQL, Edge Functions et tests réels
│                       # Seed Libreville pour développement, à ne pas déployer tel quel
├─ envoi-client/        # Paquet client du 18 août : docx remplissable, 3 vidéos MP4,
│                       # PDF coûts (client + INTERNE), README avec checklist d'envoi
├─ assets/icons/        # Icônes officielles (client anneau+T, chauffeur anneau+T+voiture)
├─ logos/               # Logo source (logos/svg = brouillons IA, ne pas utiliser)
├─ templates/           # Templates Taxido achetés — RÉFÉRENCE UNIQUEMENT (décision :
│                       # construction neuve, cf. 05-questions-ouvertes décision n°1)
├─ apps/                # client & driver (Expo SDK 57) · admin (Next.js 16) · labo-carte (TEMPORAIRE)
├─ packages/            # config (tsconfig) · types (générés) · core · api-client · i18n
│                       # telemetry · ui (tokens générés) · maps (@teko/maps)
├─ infra/               # Carto self-hosted : tuiles Martin, routage Valhalla, conflation OSM
├─ misc/                # (hors VCS) vidéos de démonstration, régénérables via LISEZMOI.md
└─ CLAUDE.md, biome.json, turbo.json, pnpm-workspace.yaml   # Règles & socle monorepo
```

## Documents de référence par question

| Vous cherchez… | Document |
|---|---|
| **Démarrer les applications (3 portails) — point d'entrée** | [docs/plan/06-demarrage-apps.md](docs/plan/06-demarrage-apps.md) |
| Ce que fait le produit et pourquoi | [docs/product/01-PRD.md](docs/product/01-PRD.md) |
| Ce qui est décidé / à trancher | [docs/product/05-questions-ouvertes.md](docs/product/05-questions-ouvertes.md) |
| **Ce qu'on attend du client** | [docs/plan/04-suivi-client.md](docs/plan/04-suivi-client.md) |
| L'état du plan et les jalons | [docs/plan/00-plan-execution.md](docs/plan/00-plan-execution.md) |
| Les risques suivis | [docs/plan/01-registre-risques.md](docs/plan/01-registre-risques.md) |
| Le travail restant (grain fin) | [docs/plan/02-backlog.md](docs/plan/02-backlog.md) |
| Lancer les templates Taxido (« avant ») | [docs/plan/05-reference-taxido.md](docs/plan/05-reference-taxido.md) |
| Les coûts d'infrastructure | [docs/plan/03-estimation-couts-ti.md](docs/plan/03-estimation-couts-ti.md) |
| Toutes les maquettes + conventions | [docs/design/06-maquettes.md](docs/design/06-maquettes.md) |
| La console admin sur téléphone | [docs/design/07-admin-responsive.md](docs/design/07-admin-responsive.md) |
| Le backend en détail | [supabase/README.md](supabase/README.md) + [supabase/tests/README.md](supabase/tests/README.md) |

## Livrables publiés (artifacts — liens de partage)

Spécifications de parcours (**copies locales : [docs/design/parcours/](docs/design/parcours/)**) : [client A–F](https://claude.ai/code/artifact/4d753dea-a21f-47f6-b2b9-a35b9eea858f) · [chauffeur G–J + synchronisation](https://claude.ai/code/artifact/20f6e347-c7de-4b1e-837f-10f92198d9e7) · [flux globaux K–O + audit](https://claude.ai/code/artifact/4c410203-9c41-4abd-bf66-afcb806ce813)
Galeries : [client](https://claude.ai/code/artifact/76d6647b-6379-4162-a4ef-2e5e00a564d3) · [chauffeur](https://claude.ai/code/artifact/0c31f836-509a-4860-b46b-192cda4b248c) · [admin desktop](https://claude.ai/code/artifact/61b8ae7e-6a3d-4d78-a1ea-56c1799fa9a5) · [admin mobile/PWA](https://claude.ai/code/artifact/b7f005bd-159f-43fa-998d-1d68288ca316)
Client : [questions (web)](https://claude.ai/code/artifact/8369716b-e607-420c-bb0f-f2c1a6111961) · [coûts TI (web)](https://claude.ai/code/artifact/44482fb3-3687-4c58-8203-e44cf74b575b)
Design system éditable : projet **« Teko Design System »** sur claude.ai/design (source de vérité des maquettes, doublée en local dans `docs/design/maquettes/`).

## Conventions de travail

- **Docs en français** ; toute décision est datée et tracée dans `05-questions-ouvertes.md` (jamais supprimée, toujours clôturée).
- **Le backend fait autorité** : les apps consomment les RPC, aucune logique métier sensible côté client.
- **Les tokens de `design-tokens.json` font autorité** sur toute UI ; tout écart maquette/code est un bug.
- Réponses client → toujours passer par `04-suivi-client.md` (procédure en bas de ce document).
