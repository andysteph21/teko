# Teko — Maquettes UX (phase terminée le 18 août 2026)

Index de la phase maquettes : où tout se trouve, ce qui a été décidé en cours de route, et les conventions qui complètent `design-tokens.json` / `design-system.html`.

## Où sont les maquettes

- **Source de vérité : projet Claude Design « Teko Design System »** (claude.ai/design) — 69 cartes organisées par groupes (fondations, composants, parcours client, chauffeur, admin). Chaque carte est un fichier HTML autonome construit sur les tokens.
- **Galeries** (mêmes écrans, en une page consultable/partageable) :
  - Client (31 écrans C-01 → C-30 + C-13b) : https://claude.ai/code/artifact/76d6647b-6379-4162-a4ef-2e5e00a564d3
  - Chauffeur (21 écrans D-01 → D-19 + D-11b, D-14b) : https://claude.ai/code/artifact/0c31f836-509a-4860-b46b-192cda4b248c
  - Admin desktop (10 écrans A-01 → A-10, 1280 px) : https://claude.ai/code/artifact/61b8ae7e-6a3d-4d78-a1ea-56c1799fa9a5
  - Admin mobile / PWA (7 écrans AM-01 → AM-07, 360 px) : https://claude.ai/code/artifact/b7f005bd-159f-43fa-998d-1d68288ca316 — spec responsive : `07-admin-responsive.md`

## Spécifications de parcours

- **Parcours client (A–F)** — inscription, connexion, commande, quotidien, récupération, suppression : https://claude.ai/code/artifact/4d753dea-a21f-47f6-b2b9-a35b9eea858f
- **Parcours chauffeur (G–J) + synchronisation client↔chauffeur** (table état par état alignée sur les RPC `request/accept/mark_arrived/start/complete/cancel_ride`) : https://claude.ai/code/artifact/20f6e347-c7de-4b1e-837f-10f92198d9e7
- **Flux globaux des 3 acteurs (4 boucles), parcours admin (K–O) & audit de cohérence** (48 transitions : 41 conformes, 3 corrigées, 4 en backlog) : https://claude.ai/code/artifact/4c410203-9c41-4abd-bf66-afcb806ce813

## Conventions établies pendant la phase (complètent le design system)

- **Carte** : point client magenta `#8C238A`, repères ambre `#F5A623`, itinéraire violet `#5A1A80`, véhicules teal `#00BFA5` — le teal n'apparaît jamais ailleurs dans l'app client.
- **Widget data** : visible sur tout écran où la carte est l'élément principal ; omis quand une feuille couvre plus de la moitié de l'écran et qu'une action critique (PIN, paiement) concentre l'attention.
- **Montants** : toujours en chasse fixe, en XAF, jamais tronqués ; le chauffeur voit la décomposition commission/net, le client jamais.
- **PIN** : affiché côté client (34 px, puis 56 px à l'arrivée du chauffeur), transmis **de vive voix**, saisi côté chauffeur.
- **Icônes d'app** : client = anneau + T ; chauffeur = emblème complet anneau + T + voiture ; les deux sur gradient violet→magenta (`assets/icons/`, cf. `app-icons.html`). En interface, le rôle chauffeur se signale par l'accent teal (header, toggle, tab bar), pas par une icône.
- **Badge « MVP »** (ambre) sur tout élément transitoire, notamment le repli OTP e-mail.
- **Personas de démonstration cohérents** dans toutes les maquettes : Nadia O. (cliente), Boris Mba (chauffeur Éco, Toyota Corolla grise, GA-482-LBV), Steeve O. (moto, KYC en cours), équipe admin Aline K. (ops) / Marc E. (carto) / Diane M. (finance) / Serge O. (superadmin).

## Backlog UX v1.1 — réalisé le 18 août 2026

Les 4 éléments issus de l'audit sont livrés : SOS sur C-13/C-13b, D-08b pièce refusée, D-20 historique courses chauffeur, C-31 mes repères proposés. S'y ajoute la déclinaison **admin mobile / PWA** (AM-01 → AM-07). Le projet Claude Design compte désormais **79 cartes** (32 client, 23 chauffeur, 10 admin desktop, 7 admin mobile + fondations/composants). Détail dans `../plan/02-backlog.md` (éléments clos).

> **Note de sauvegarde :** les fichiers sources HTML des maquettes vivent dans le projet Claude Design (source de vérité durable, récupérables un par un via DesignSync `get_file`). Les copies locales de session sont éphémères.

## Sources locales — récupérées le 20 août 2026

Les 79 fichiers HTML sont désormais copiés à l'identique dans le dépôt : **`docs/design/maquettes/`** — `foundations/` (3), `components/` (4), `client/` (32, C-01 → C-31 + C-13b), `chauffeur/` (23, D-01 → D-20 + D-08b, D-11b, D-14b), `admin/` (10, A-01 → A-10), `admin-mobile/` (7, AM-01 → AM-07). Chaque fichier s'ouvre directement dans un navigateur. En cas de divergence, le projet Claude Design fait foi ; toute modification doit être poussée dans les deux (dépôt + DesignSync).

## Langage carte implémenté

Le design de la **carte** (fond, repères lettrés, épingles personne/drapeau, animations, régimes éco/auto/complet) est figé dans [`08-carte-langage.md`](08-carte-langage.md) avec captures et vidéos dans [`carte/`](carte/) — implémentation de référence : `packages/maps`.

## Passage au code

Les maquettes sont du HTML/CSS construit sur `design-tokens.json` : `packages/ui` (lot 1) doit en dériver directement — tout écart token/maquette/code est un bug de fidélité, pas une interprétation.
