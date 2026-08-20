# Teko — Console admin responsive & PWA

**Créé :** 18 août 2026 · Complète les maquettes desktop (A-01 → A-10) avec la déclinaison mobile (AM-01 → AM-07, groupe « Admin — Mobile / PWA » du projet Claude Design).

## 1. Principe

La console admin est une **web app unique et responsive** (Next.js) : même code, même données, trois régimes d'affichage. Le mobile n'est pas une version réduite mais un **poste de garde** : il privilégie ce qu'un admin fait *en mobilité* (réagir à un SOS, débloquer un dossier KYC, surveiller la clôture) et renvoie vers l'ordinateur ce qui exige précision ou prudence.

## 2. Points de rupture (breakpoints)

| Largeur | Régime | Navigation | Layout |
|---|---|---|---|
| ≥ 1024 px | **Desktop** (A-01 → A-10) | Sidebar fixe brand-900, 216 px | Multi-colonnes (file + détail côte à côte) |
| 768 – 1023 px | **Tablette** | Sidebar repliée en rail d'icônes (56 px), libellés au survol | Colonnes conservées, tables scrollables |
| < 768 px | **Mobile / PWA** (AM-01 → AM-07) | **Bottom nav 5 items** : Accueil · KYC · Carto · Finance · Plus (badges à traiter) + app bar brand-900 | Une colonne ; les vues maître/détail deviennent des écrans empilés (liste → plein écran) |

Tokens inchangés (`design-tokens.json`) ; cibles tactiles ≥ 44 px ; tables larges remplacées par des **cartes-lignes** (jamais de scroll horizontal de page).

## 3. Adaptations par écran

| Desktop | Mobile | Transformation |
|---|---|---|
| A-02 Dashboard | AM-01 | KPIs en grille 2×2 ; la carte temps réel cède la place à un bloc **« À traiter »** (KYC/carto/litiges avec badges) ; fil d'activité conservé |
| A-03 KYC | AM-02 + AM-03 | La vue file+détail se scinde : liste triée par ancienneté avec **alerte SLA 48 h**, puis dossier plein écran validable **au pouce** (conforme / refuser par pièce, motif obligatoire) |
| A-04 Carto | AM-04 | Chaque proposition devient une carte avec **mini-carte d'aperçu** ; valider/refuser possible en mobilité ; ajustement de position et tracé manuel **renvoyés au desktop** |
| A-05 Finance | AM-05 | Compte à rebours de clôture dans l'app bar ; arriérés et réconciliation TA en cartes actionnables |
| A-06 Litiges | AM-06 | Le cas prioritaire est poussé : **push SOS → fiche action** (contexte course, appeler passagère/chauffeur, clore avec motif) |
| A-07 / A-08 / A-10 | AM-07 (menu Plus) | Paramètres et Équipe en **lecture seule sur mobile** ; journal consultable, export desktop |

## 4. Règle « desktop-only » (délibérée)

Trois actions restent réservées à l'ordinateur, même pour un superadmin connecté sur mobile :
1. **Modification des paramètres sensibles** (commission, frais, délais) — la double confirmation + le contexte de l'historique méritent un grand écran ; le mobile affiche les valeurs en lecture.
2. **Changements de rôle / désactivation d'un compte admin** — le mobile permet seulement de renvoyer une invitation.
3. **Édition géométrique** (tracé de routes, ajustement fin de repères, zones tarifaires).

Motif : réduire le risque d'action lourde au pouce, sans bloquer la supervision. La garde reste en base (RLS) — la restriction mobile est une couche UX, pas une sécurité.

## 5. PWA

- **Manifest** : `name` « Teko Admin », `display: standalone`, `theme_color #3D0F5C`, `background_color #F9F9FB`, icônes dérivées de `assets/icons/` (monogramme T). Invite d'installation dans AM-07.
- **Notifications push admin** (Web Push), par rôle : **SOS = toujours, prioritaire** (AM-06) ; KYC en attente > 24 h (ops) ; nouvel arriéré / suspension auto (finance) ; **résumé de clôture 04 h** ; badge d'app = total « à traiter ».
- **Hors connexion** : app shell + **dernières données consultées en lecture** (marquées « données de 15 h 42 ») ; **aucune écriture hors ligne** — toute action (valider, clore, appeler à l'audit) exige le réseau, pas de file d'attente de mutations admin.
- **Sécurité** : session OTP identique au desktop ; verrouillage de l'app après inactivité (re-auth biométrique du téléphone si disponible) ; le journal d'audit enregistre le canal (desktop / mobile).

## 6. Impact build

Aucun écran Next.js supplémentaire : ce sont les mêmes routes avec composants responsives (`packages/ui`). Le surcoût du lot 5 se limite au manifest PWA, au service worker (cache lecture) et à l'intégration Web Push.
