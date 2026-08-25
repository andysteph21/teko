# Spécifications de parcours — copies locales

Copies conformes des trois spécifications UX publiées comme artifacts claude.ai (v1, 18 août 2026), rapatriées dans le dépôt le 25 août 2026 pour que le projet soit auto-suffisant. Pages HTML autonomes : les diagrammes Mermaid embarquent leur moteur de rendu, aucune ressource externe — ouvrir directement dans un navigateur.

| Fichier | Contenu | Artifact d'origine (reste éditable en ligne) |
|---|---|---|
| [parcours-client-A-F.html](parcours-client-A-F.html) | Parcours client A–F : inscription, connexion, commande, quotidien, récupération, suppression + inventaire C-01→C-30 | https://claude.ai/code/artifact/4d753dea-a21f-47f6-b2b9-a35b9eea858f |
| [parcours-chauffeur-G-J.html](parcours-chauffeur-G-J.html) | Parcours chauffeur G–J + **table de synchronisation client↔chauffeur** (un écran par état de course de chaque côté, alignée sur les RPC) | https://claude.ai/code/artifact/20f6e347-c7de-4b1e-837f-10f92198d9e7 |
| [parcours-globaux-K-O.html](parcours-globaux-K-O.html) | Les 4 boucles de l'écosystème, parcours admin K–O, audit de cohérence flux↔écrans (48 transitions, backlog v1.1 soldé) | https://claude.ai/code/artifact/4c410203-9c41-4abd-bf66-afcb806ce813 |

Seule transformation appliquée : suppression de l'enveloppe technique claude.ai (`frame-runtime`) ; le contenu est intact. En cas de divergence, l'artifact en ligne fait foi ; toute modification part dans **les deux** (même règle que pour les maquettes).

## ⚠️ Points datés — lus avec les décisions du 25 août

Ces spécifications sont du 18 août. Les « questions ouvertes » qu'elles listent ont depuis été tranchées par le client (26/26, voir [../../plan/04-suivi-client.md](../../plan/04-suivi-client.md) et [../../product/05-questions-ouvertes.md](../../product/05-questions-ouvertes.md)) :

- Délai d'acceptation chauffeur : **12 s confirmé** (n° 5).
- Destination cachée avant acceptation : **confirmée** (n° 9), à ré-évaluer sur données bêta seulement.
- Part chauffeur des frais d'annulation : **70 % confirmé** (n° 5).
- Refus répétés : **aucun effet en bêta**, puis priorité douce (n° 8, backlog CL-08).
- Attente passager absent : **5 min confirmé** (n° 5).
- Les variantes « à maquetter » signalées (C-13b, D-11b, D-14b) **existent** désormais dans `../maquettes/`.
