# Ce qu’il reste à configurer — lots R1 à R5

Rédigé le 23 novembre 2026, après le développement des six suggestions de l’essai du 20 novembre ([plan](21-plan-retours-essai-20-novembre.md)). Tout le code est dans la branche d’essai ; **rien n’est déployé sur le VPS et aucun APK n’est publié**. Ce document liste ce que le porteur doit fournir ou décider, puis ce qui se règle ensuite sur le VPS et dans la console.

Aucun secret ne s’écrit dans le dépôt : les identifiants cités vont dans les fichiers privés indiqués.

## 1. À fournir par le porteur

| N° | Élément | Pour quoi | Où il sera rangé |
| --- | --- | --- | --- |
| 1 | **Relais SMTP** : hôte, port, identifiant, mot de passe, adresse d’expédition (par exemple `ne-pas-repondre@tekomove.com`) | Envoyer le code à 6 chiffres. Sans lui, aucun compte par e-mail ne peut s’ouvrir. | Configuration privée du VPS, bloc `[auth.email.smtp]` ; `.local/alpha-services/smtp.json` pour un banc neuf |
| 2 | **Enregistrements DNS d’expédition** (SPF, DKIM) demandés par le relais, sur `tekomove.com` | Éviter que le code arrive en indésirables | Chez le registraire du domaine |
| 3 | **Client OAuth Google de type « application Web »** : identifiant et secret, avec l’adresse de retour `https://alpha.tekomove.com/auth/v1/callback` autorisée | Bouton « Continuer avec Google » | `.local/alpha-services/google-oauth.json` (`clientId`, `secret`), puis bloc `[auth.external.google]` du VPS |
| 4 | **Adresse e-mail de chaque testeur déjà inscrit** (17 comptes), avec son rôle | Rattacher le compte actuel à l’adresse, sans perdre courses ni soldes | Transmise hors dépôt ; saisie par une requête d’exploitation |
| 5 | **Adresses à inviter** pour les nouveaux testeurs | Seule une adresse invitée peut ouvrir un compte | Console, Utilisateurs → Invitations alpha |
| 6 | **Avis du cabinet juridique** sur la livraison : responsabilité, valeur maximale, objets interdits | Condition d’ouverture de la livraison (arbitrage A18) | Consigné dans le registre produit |
| 7 | **Texte de la charte chauffeur** pour le covoiturage, dont la règle « aucune prise en charge hors application » (A14) | Affichée au chauffeur avant activation | À intégrer aux textes de l’app |
| 8 | **Accord explicite** pour chaque déploiement sur le VPS et chaque publication d’APK | Règle du projet | — |

## 2. À décider par le porteur

| N° | Décision | Valeur posée par défaut | Où la changer |
| --- | --- | --- | --- |
| 1 | **Grille de livraison** | Voiture : 500 FCFA + 200 FCFA/km, minimum 1 000. Moto : 300 FCFA + 150 FCFA/km, minimum 700. **Valeurs provisoires, choisies sans consigne.** | Table `pricing_rules` : la console n’a pas d’écran de tarifs, la modification se fait par une requête d’exploitation sur demande |
| 2 | **Date d’ouverture du covoiturage** | Fermé | Console, Paramètres → `shared_ride`, `"enabled": true` |
| 3 | **Date d’ouverture de la livraison** | Fermée, à ouvrir après l’avis juridique | Console, Paramètres → `delivery`, `"enabled": true` |
| 4 | **Blocage des frais d’annulation dus** : il est nouveau, un passager avec des frais dus ne peut plus commander | Actif | Console, Paramètres → `cancellation_fee`, `"block_orders": false` pour revenir en arrière |
| 5 | **Proximité en covoiturage** | 400 m de l’itinéraire, 5 minutes de détour, vitesse de calcul 25 km/h | Console, Paramètres → `shared_ride` |
| 6 | **Limites de modification de trajet** | 2 arrêts, 3 modifications, 30 secondes de réponse, 3 minutes d’attente gratuite | Console, Paramètres → `route_change` |
| 7 | **Durée de conservation des coordonnées du destinataire** d’un colis | 30 jours après la fin de la livraison | Console, Paramètres → `delivery` ; à reporter dans la notice données personnelles |
| 8 | **Prestataire SMS** pour l’option « code par SMS » gardée pour plus tard (A1) | Aucun | Hors périmètre de ces lots |
| 9 | **Durée de conservation des photos de remise** | Non fixée : conservées sans limite | Décision à consigner, puis tâche d’effacement à ajouter |
| 10 | **Page publique de suivi** (`teko.ga/t/…`) : le lien de partage d’un trajet ou d’une livraison pointe vers une page qui n’existe pas encore | Non créée | Domaine et hébergement à choisir |

## 3. Réglages du VPS, une fois les éléments reçus

Dans cet ordre, hors course active, après une sauvegarde de la base. Le détail des commandes est dans la [notice d’exploitation](12-exploitation-alpha-vps.md#compte-par-e-mail--déploiement-à-faire).

1. **Migrations** `20261123090000` à `20261128090000` (six fichiers) : compte par e-mail, frais dus bloquants, modification de trajet, covoiturage, livraison, lecture de l’ouverture des services.
2. **Fonction de devis** `price-quote` : cinq fichiers à copier ensemble (`index.ts`, `trip.ts`, `change.ts`, `route.ts`, `metrics.ts`), puis redémarrage du service des fonctions.
3. **Configuration Auth** : blocs `[auth.email]`, modèle de message `supabase/templates/code.html`, relais SMTP, garde `[auth.hook.before_user_created]`, puis `enable_signup = true`. La garde s’active **avant** l’ouverture de l’inscription, jamais après.
4. **Google** : bloc `[auth.external.google]` et adresses de retour `teko-client-alpha://auth`, `teko-driver-alpha://auth`. À vérifier sur place : la passerelle Caddy doit laisser passer `/auth/v1/callback`, et l’adresse publique déclarée à Auth doit être `https://alpha.tekomove.com`.
5. **Redémarrage** de la pile Supabase pour relire la configuration.
6. **Stockage** : le dossier privé `delivery-proofs` (photos de remise) est créé par la migration ; vérifier sa présence.
7. **Tâches planifiées** ajoutées par les migrations : expiration des modifications de trajet (toutes les 10 secondes), effacement des coordonnées de destinataires (03 h 20). Vérifier qu’elles apparaissent.
8. **Portail d’installation** : nouveau `access.mjs` et `"emailSignup": true` dans `alpha-admin.json`.
9. **Console** reconstruite.
10. **Rattachement des comptes existants** à leur adresse, puis invitations par adresse.
11. **APK** des deux rôles, avec les variables de construction de la section 4, puis publication sur le portail.

## 4. Variables de construction des APK

| Variable | Effet | Valeur pour l’alpha |
| --- | --- | --- |
| `EXPO_PUBLIC_PHONE_LOGIN` | Affiche aussi la connexion par SMS | `0` tant qu’aucun prestataire SMS n’est choisi |
| `EXPO_PUBLIC_GOOGLE_LOGIN` | Affiche « Continuer avec Google » | `1` seulement quand l’élément 3 de la section 1 est en place |

## 5. Contrôles à faire après déploiement

| Contrôle | Résultat attendu |
| --- | --- |
| Adresse non invitée | Refus, aucun compte créé |
| Adresse invitée | Code reçu en moins d’une minute, hors indésirables |
| Compte existant rattaché | Mêmes courses et même solde après connexion par e-mail |
| Devis Éco et Confort | Inchangés par rapport au 20 novembre |
| Modification de trajet sur une course d’essai | Nouveau prix affiché, réponse du chauffeur en 30 secondes, reçu au dernier prix |
| Covoiturage et livraison | Refusés tant que le réglage `enabled` est à `false` |
| Sauvegarde de 03 h 30 | Présente le lendemain |

## 6. Ce qui n’est pas vérifié

- Aucun des nouveaux écrans n’a été vu sur téléphone ; aucun parcours Maestro n’a été écrit pour ces lots.
- La connexion Google n’a jamais été exécutée de bout en bout, faute de client OAuth.
- Le code par e-mail a été vérifié sur une instance jetable avec une boîte de test, pas avec un vrai relais.
- La connexion par e-mail du portail d’installation est écrite mais n’a jamais tourné.
- Le covoiturage n’a pas été essayé à trois passagers réels ; la règle de proximité est une estimation à vol d’oiseau sur l’itinéraire devisé, pas un recalcul d’itinéraire.
- Les arrêts ne peuvent pas être saisis dès la commande : ils s’ajoutent par une modification une fois la course acceptée.
- Covoiturage côté chauffeur : version minimale, un passager affiché à la fois ; la carte ne montre pas tous les arrêts.
- La permission caméra de l’app chauffeur (photo de remise) est déclarée mais aucun APK n’a été construit pour le confirmer.
- Sur l’OPPO A15, le panneau de course passager avec le bloc livraison ou plusieurs arrêts peut dépasser la hauteur de l’écran : à contrôler en premier.
- Historique, reçu et notation n’ont rien de propre au covoiturage ni à la livraison.
- La console n’a pas d’écran dédié aux livraisons et à leurs litiges : les colis se lisent en base, les photos dans le stockage.
