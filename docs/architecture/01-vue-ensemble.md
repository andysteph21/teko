# 01 — Vue d’ensemble et monorepo

**État constaté : 18 octobre 2026.** Le [plan alpha](../plan/08-plan-alpha.md)
et les [décisions datées](../product/05-questions-ouvertes.md) définissent le
périmètre de préparation. Les versions réellement installées sont celles de
`pnpm-lock.yaml`, et les modèles de données ceux des migrations.

## Applications et responsabilités

| Élément | Rôle constaté |
|---|---|
| `apps/client` | Application passager Expo SDK 57, React Native 0.86, Expo Router : inscription, devis, commande, suivi, historique, sécurité et profil |
| `apps/driver` | Application chauffeur avec KYC, disponibilité, offres, PIN, suivi et solde |
| `apps/admin` | Console Next.js 16 : opérations, KYC, incidents, cartographie, Finance et paramètres |
| `packages/api-client` | Accès Supabase typés, RPC, erreurs stables, canal de positions ; point d’entrée réseau des applications |
| `packages/types` | Contrat généré depuis PostgreSQL ; ne pas modifier `database.ts` à la main |
| `packages/core` | Fonctions pures pour l’affichage et les politiques clientes ; ne fait pas autorité sur le tarif ni le solde |
| `packages/maps` | Géométries, styles et adaptateurs carte ; moteur natif sur Android, MapLibre GL JS sur le web |
| `packages/ui`, `i18n`, `telemetry`, `config` | Composants et tokens, français/i18n, consommation de données, TypeScript partagé |
| `supabase/migrations` | Schéma, RLS, RPC métier, grand livre et jobs PostgreSQL |
| `supabase/functions` | Intégrations Deno : routage serveur, paiement, push et purge Auth |
| `infra` | Martin, Valhalla et traitement des données cartographiques |

Le monorepo utilise pnpm et Turborepo. Biome contrôle le format, les imports,
les limites de taille et la complexité ; ESLint/Prettier ne font pas partie du
contrat d’ingénierie.

## Autorité métier et flux alpha

1. Le passager invité définit un trajet. `price-quote` vérifie son identité,
   demande un itinéraire à Valhalla puis appelle `create_ride_quote` avec un
   compte de service. PostgreSQL calcule le prix et conserve un devis nominatif
   valable cinq minutes. L’app ne fournit ni le prix faisant foi ni la distance.
2. `request_quoted_ride` consomme le devis sous le JWT du passager. Verrous et
   répétition idempotente empêchent la création de deux courses. L’alpha impose
   une course immédiate en espèces et une seule course active par passager.
3. PostgreSQL attribue les offres aux chauffeurs éligibles et retente les
   nouveaux arrivants. La recherche prend fin à trois minutes configurables.
   L’écran attend cet état serveur et couvre les événements Realtime manqués.
4. Les transitions passent par des RPC. Le PIN est privé ; seul le passager
   peut le lire. Le chauffeur le saisit dans une opération qui conserve les
   échecs et bloque cinq minutes après cinq erreurs. Le prix final reste le
   prix convenu.
5. Une course cash crée la commission due au grand livre immuable. Les frais
   d’annulation deviennent une créance : aucun crédit chauffeur avant
   encaissement complet et validation Finance d’un justificatif.
6. À 4 h, heure de Libreville, la clôture conserve le résiduel, suspend les
   dettes et prépare les versements positifs. Un versement reste en attente
   jusqu’à validation Finance du justificatif ; la clôture ne le déclare pas payé.

Les fonctions SQL portent les transactions atomiques. Les Edge Functions
appellent ces fonctions et les services externes ; elles ne remplacent pas
l’autorité transactionnelle de PostgreSQL.

## État client et réseau

TanStack Query porte les données serveur ; Zustand porte les brouillons et
l’état d’interface ; SQLite porte les données locales explicitement autorisées.
Les mutations de commande et d’annulation ne sont jamais mises en attente pour
un rejeu tardif. Un échec d’annulation reste affiché comme non confirmé.

Le cache d’historique est séparé par compte et exclut le PIN et les coordonnées
précises. La file GPS conserve l’heure de collecte et un identifiant stable ;
les points de plus de 24 h ou d’un autre compte ne sont jamais transmis.
L’intégration du service Android et les essais écran éteint font partie des
travaux alpha à vérifier, pas d’une garantie acquise par cette description.

## Limites avant les premières courses réelles

Les tarifs et zones du seed sont des exemples, pas une validation terrain.
Le fournisseur SMS, Firebase/FCM, les responsables et horaires Finance/SOS,
l’hébergement et la revue indépendante restent à finaliser. Les preuves de
restauration et de parcours sur APK signés sont bloquantes. Le détail de
l’avancement et des constats doit être lu avec le plan alpha.
