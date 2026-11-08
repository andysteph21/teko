# Banc privé pour l’essai distant

Ce banc contient quatre comptes fictifs, une invitation par rôle mobile et des pièces KYC de fixture. Les courses sont simulées par les participants ; ni SMS facturé ni paiement mobile n’est activé. Les APK distants utilisent le GPS réel et affichent « ESSAI PRIVÉ · AUCUNE COURSE RÉELLE ». Ne pas utiliser de vrais justificatifs ni de numéros personnels pendant cet essai.

## Préparer et vérifier sur le poste

Depuis la racine, une fois les dépendances des tests Supabase installées :

```sh
node tools/alpha-remote/prepare.mjs
docker network create \
  --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 \
  teko-alpha-remote-private
supabase start --workdir .local/alpha-remote --network-id teko-alpha-remote-private \
  --exclude studio,postgres-meta,logflare,vector,supavisor,edge-runtime \
  >.local/alpha-remote/start.log 2>&1
node tools/alpha-remote/seed.mjs
```

`prepare.mjs` refuse de remplacer une configuration existante. Le dossier `.local/alpha-remote` est privé et hors Git ; il contient notamment les codes, les clés et les journaux. Les ports API (58421) et SQL (58422) doivent apparaître sur `127.0.0.1` avec `docker port` avant de poursuivre.

Martin et Valhalla locaux doivent répondre sur 3333 et 8002. Dans un autre terminal, démarrer les fonctions :

```sh
supabase functions serve --workdir .local/alpha-remote --network-id teko-alpha-remote-private \
  --env-file .local/alpha-remote/functions.env >.local/alpha-remote/functions.log 2>&1
```

Lancer le contrôle des invitations sur le réseau interne, puis la passerelle en boucle locale :

```sh
mkdir -p -m 700 .local/alpha-remote/apks
docker run -d --name teko-alpha-remote-access --network teko-alpha-remote-private \
  --user "$(id -u):$(id -g)" --read-only --security-opt no-new-privileges --cap-drop ALL \
  --mount type=bind,source="$PWD/tools/alpha-remote/access.mjs",target=/app/access.mjs,readonly \
  --mount type=bind,source="$PWD/.local/alpha-remote/phones.json",target=/config/phones.json,readonly \
  --mount type=bind,source="$PWD/.local/alpha-remote/anon-key",target=/config/anon-key,readonly \
  --mount type=bind,source="$PWD/.local/alpha-remote/apks",target=/apks,readonly \
  node:24-bookworm-slim node /app/access.mjs
docker run -d --name teko-alpha-remote-preview --network teko-alpha-remote-private \
  --add-host=host.docker.internal:host-gateway -p 127.0.0.1:58480:8080 \
  --mount type=bind,source="$PWD/tools/alpha-remote/Caddyfile",target=/etc/caddy/Caddyfile,readonly \
  caddy:2.11.9-alpine
node tools/alpha-remote/smoke.mjs
```

## Répéter sur le VPS avant de publier

Préparer Ubuntu 24.04 x86-64 avec Docker Compose, Node 24 et Supabase CLI 2.120.0. Utiliser un compte de déploiement avec accès Docker et activer la persistance de ses services utilisateur (`loginctl enable-linger`). Transférer les sources, les tuiles et le graphe existants. Transférer séparément, par SSH, les seuls fichiers privés nécessaires : le `config.toml` du banc distant, `accounts.json` et `functions.env`. Conserver la même clé publique que celle des APK ; la base est créée à neuf sur le VPS. Ne transférer ni la base du poste, ni les clés de signature, ni la clé SSH privée.

Lancer `bash tools/alpha-remote/stage-vps.sh` sur le serveur. Contrôler avec `TEKO_REMOTE_ALPHA_ORIGIN=http://127.0.0.1:58481 node tools/alpha-remote/smoke.mjs`, vérifier la route, les tuiles et le maintien des services après redémarrage. Tester aussi une connexion au téléchargement avec chaque rôle. Aucune interface SQL ou d’administration Supabase ne doit être joignable de l’extérieur.

Après ces contrôles et la disponibilité du DNS, ajouter `alpha.tekomove.com` comme enregistrement A du VPS. Dans `vps-compose.env`, passer `ALPHA_SITE` à `alpha.tekomove.com` et publier seulement HTTP/HTTPS (`ALPHA_HTTP_BIND=0.0.0.0:80`, `ALPHA_HTTPS_BIND=0.0.0.0:443`). Relancer Compose avec ce fichier ; Caddy gère le certificat. Contrôler depuis un autre réseau le certificat et les refus d’accès avant d’envoyer le lien `/install` aux invités. Ne pas ouvrir les ports de la base, de Martin ni de Valhalla.

## Préparer les APK pour l’adresse retenue

Le domaine ne configure pas l’accès à lui seul. Préparer une passerelle HTTPS avec accès réservé aux invités, puis vérifier Auth, devis, tuiles, téléchargements et Realtime depuis un autre réseau avant de distribuer les APK. La passerelle de prévisualisation ci-dessus reste en boucle locale.

Lorsque l’origine HTTPS est prête, sauvegarder d’abord les APK USB existants hors des dossiers d’assemblage. Avec `TEKO_REMOTE_ALPHA_ORIGIN` fixé à l’adresse HTTPS retenue, lancer séquentiellement :

```sh
node tools/audit/build-alpha.mjs client --remote
node tools/audit/build-alpha.mjs driver --remote
```

Vérifier chaque signature, identité et configuration avant la distribution privée :

```sh
node tools/audit/verify-alpha-apk.mjs client --remote
node tools/audit/verify-alpha-apk.mjs driver --remote
```

## Premier passage à Libreville

1. Une paire de testeurs ouvre `/install` sur deux Android, idéalement dont un bas de gamme, et installe l’APK correspondant à son rôle. Remettre les codes d’essai individuellement et expliquer l’usage du GPS réel pendant le créneau.
2. Sur réseau mobile, charger la carte et commander un trajet fictif proche. Vérifier le devis, la réception de l’offre, l’acceptation, le PIN et le reçu cash simulé. Aucun encaissement.
3. Sur un appareil à l’arrêt, verrouiller l’écran chauffeur, couper brièvement le réseau puis le rétablir. Mesurer la reprise GPS sans rouvrir l’app. Refaire le parcours sur l’autre opérateur si les deux SIM Airtel et Moov sont disponibles.
4. Pour chaque écart, relever l’heure, le modèle Android, l’opérateur, le rôle et la version du build. Ne joindre ni code, ni pièce personnelle, ni capture affichant une position privée.

Pour fermer l’essai, retirer l’accès distant et arrêter la passerelle d’essai. `supabase stop --project-id teko-alpha-remote` ne cible que ce projet et conserve ses volumes.
