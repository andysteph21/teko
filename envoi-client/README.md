# Envoi client — paquet du 18 août 2026

Tout ce qui part chez le client pour recueillir ses 26 réponses avant le développement.

## ✉️ À envoyer (5 fichiers)

| Fichier | Rôle | Taille |
|---|---|---|
| `Teko-Decisions-avant-developpement.docx` | **Le document principal** : 26 questions expliquées, cadres de réponse à remplir directement dans Word. 6 questions marquées [BLOQUANT]. | 18 Ko |
| `Teko-video-client.mp4` | Parcours client en 1 min 20 (vertical — lisible sur téléphone) | 0,9 Mo |
| `Teko-video-chauffeur.mp4` | Parcours chauffeur en 1 min 20 (vertical) | 1,0 Mo |
| `Teko-video-admin.mp4` | Console d'administration en 48 s (horizontal) | 0,7 Mo |
| `Teko-Estimation-couts-TI_client.pdf` | Esquisse des coûts TI, version client (3 pages) | 115 Ko |

Total ≈ 2,8 Mo — passe par e-mail ou WhatsApp sans compression.

## ⚠️ À NE PAS envoyer

- `Teko-Estimation-couts-TI_INTERNE.pdf` — version interne de l'estimation (références aux fichiers du repo, mention « document interne »). Conservée ici pour comparaison uniquement.

## Message d'accompagnement suggéré

> Bonjour,
> Voici où en est Teko : la conception des trois applications est terminée — les trois vidéos jointes vous montrent le service tel qu'il fonctionnera, et le PDF donne une première vision des coûts d'infrastructure.
> Pour lancer le développement, il nous faut vos décisions sur 26 points : tout est dans le document Word, avec nos recommandations et des cadres pour répondre directement dedans. Les 6 questions marquées « BLOQUANT » (n° 5, 7, 11, 16, 21, 22) sont celles qui conditionnent le démarrage — commencez par elles.
> Sans réponse de votre part sur un point, la valeur recommandée s'appliquera par défaut ; tout restera modifiable ensuite depuis votre console d'administration.

## Liens complémentaires (si le client veut aller plus loin)

- Version web du document de décisions : https://claude.ai/code/artifact/8369716b-e607-420c-bb0f-f2c1a6111961
- Galerie des maquettes client (32 écrans) : https://claude.ai/code/artifact/76d6647b-6379-4162-a4ef-2e5e00a564d3
- Galerie chauffeur (23 écrans) : https://claude.ai/code/artifact/0c31f836-509a-4860-b46b-192cda4b248c
- Galerie admin (10 écrans) : https://claude.ai/code/artifact/61b8ae7e-6a3d-4d78-a1ea-56c1799fa9a5

*(Les artifacts sont privés par défaut : les partager depuis leur menu de partage avant d'envoyer les liens.)*

## Au retour des réponses

1. Reporter chaque décision dans `docs/product/05-questions-ouvertes.md` (table « Décisions tranchées », avec la date).
2. Mettre à jour les valeurs par défaut concernées (maquette A-07, `docs/plan/03-estimation-couts-ti.md`).
3. Clore les risques levés dans `docs/plan/01-registre-risques.md` (R2 si SMS choisi, R7 si Airtel engagé…).
4. Lancer la Phase 0 du plan d'exécution (`docs/plan/00-plan-execution.md` §4).
