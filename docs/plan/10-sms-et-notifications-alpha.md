# SMS et notifications pour l’alpha

Comparaison documentaire du 18 octobre 2026, complétée le 22 octobre : le
porteur retient eSMS Africa pour préparer le premier mois d’essai. Aucun
compte fournisseur créé, aucun devis demandé à un tiers et aucun SMS facturé
envoyé. Les conditions commerciales et les essais Airtel/Moov restent à
confirmer. La comparaison ci-dessous conserve l’historique du choix ; les
prix publics ne constituent pas un devis.

## Notifications Android et iOS : décision confirmée

Le porteur a retenu **Expo Push Service**, avec une intégration commune Android/iOS.
Android utilise FCM derrière Expo ; Apple utilisera APNs et demandera un compte
Apple Developer ainsi que des essais sur iPhone. Aucun iPhone n'a été testé ici.
L'adaptateur FCM direct reste historique ; il n'est pas l'architecture retenue.
Sources : [configuration Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/),
[transport et reçus Expo](https://docs.expo.dev/push-notifications/sending-notifications/).

Projets créés avec accord du porteur, le 18 octobre 2026 :

| Service | Propriétaire / projet | État vérifié |
|---|---|---|
| Firebase | Compte Google confirmé ; projet `teko-firebase` | Spark, sans Analytics ni adhésion Developer Programme demandée ; deux apps Android alpha enregistrées |
| Expo passager | Organisation Teko `teko241` ; `teko-client-alpha` | UUID `7fde6ae9-749a-41ae-9df2-699cd40d7ddb` |
| Expo chauffeur | Organisation Teko `teko241` ; `teko-driver-alpha` | UUID `8b5b38e9-2c0c-4916-89d7-daf2d8afb54e` |

Les deux `google-services.json` fournis par le porteur ont été vérifiés puis
copiés dans `.local/alpha-services/`, ignoré par Git. Le script de build USB les
transmet au plugin Expo ; ces fichiers de configuration ne remplacent pas une
clé de compte de service FCM v1. Aucun secret serveur ne doit entrer dans l'APK.
Le nom `teko-expo` proposé initialement est remplacé par l'organisation existante
`teko241`, avec confirmation explicite du porteur.

Le relais Android utilise un compte de service dédié dans
`teko-firebase`, avec le seul rôle **Firebase Cloud Messaging API Admin**
(`roles/firebasecloudmessaging.admin`), et confier sa clé aux deux projets Expo
alpha. L'attribution du rôle et le transfert de clé ont été approuvés explicitement.
Le compte `teko-alpha-push` est créé et sa clé FCM v1 associée aux deux identifiants
Android alpha par Expo CLI, sans transfert de la clé de signature APK. Ce rôle permet aussi la gestion des abonnements FCM ; il n'accorde
pas l'administration Supabase ou l'accès aux pièces KYC. Aucun compte général
Editor/Owner ne doit être utilisé pour ce relais.
Sources : [identifiants FCM v1 dans Expo](https://docs.expo.dev/push-notifications/fcm-credentials/),
[rôle IAM FCM](https://docs.cloud.google.com/iam/docs/roles-permissions/firebasecloudmessaging).

Le backend possède maintenant une file d'envoi durable, une prise concurrente
avec bail, cinq tentatives maximum, une échéance et des reçus Expo séparés des
tickets. Le rattrapage cron passe chaque minute ; les offres déjà expirées
ne sont jamais prolongées. Le reçu « accepté » signifie FCM/APNs accepté,
**pas reçu par le téléphone**. Les notifications ne contiennent ni GPS, ni PIN,
ni pièces KYC, ni montant de solde ; le détail se relit sous JWT dans l'app.
Les jetons changent de propriétaire atomiquement et sont retirés avant la
révocation de session à la déconnexion confirmée par le serveur.

Un premier push réel a été reçu sur l'OPPO : ticket Expo, reçu FCM « ok » et
notification Android constatée. L'écran éteint, la rotation du jeton, le
chauffeur et les restrictions batterie OPPO restent à éprouver.
Le succès d'un fournisseur mock ne ferme aucun de ces contrôles. Les secrets
push absents provoquent une erreur ; le mock demande un sandbox explicite.

## Comparaison SMS à qualifier

| Point | Twilio | eSMS Africa, candidat régional |
|---|---|---|
| Tarif public repéré | 0,3146 USD par segment sortant au Gabon ; frais et taxes à confirmer | 40/35/30 FCFA par SMS selon offre Basic/Business/Enterprise ; minima et conditions à confirmer |
| Couverture annoncée | Page tarifaire Gabon ; livraison réelle à mesurer par réseau | Le fournisseur annonce Airtel et Moov Africa au Gabon ; affirmation à vérifier pendant les essais |
| Intégration | Fournisseur pris en charge par Supabase Auth | API HTTPS ; intégration possible par Send SMS Hook Supabase, à développer et tester |
| Vérifications commerciales | Expéditeur, éventuel abonnement, frais d’échec, routes et support | Identité contractante, routes, paliers, TVA, expéditeur, support et traitement des données |
| Preuve disponible | Documentation et prix publics seulement | Documentation et déclarations commerciales seulement |

Sources : [Twilio Gabon](https://www.twilio.com/en-us/sms/pricing/ga),
[API Gabon eSMS Africa](https://esmsafrica.io/sms-api/gabon),
[Send SMS Hook Supabase](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook).
La mention « régional » décrit ici un fournisseur qui se présente comme
implanté en Afrique ; aucune implantation gabonaise ni relation opérateur
n’a été vérifiée indépendamment.

## Devis et petit protocole d’essai

Demander pour chaque candidat le coût total pour 100, 500 et 1 000 OTP,
l’unité facturée (message ou segment), l’encodage des accents, les messages
échoués, le minimum de recharge, la durée du crédit, l’enregistrement de
l’expéditeur, les délais d’activation, le support et les conditions de données.
Les contacts commerciaux et tout budget d’essai seront validés par le porteur
avant envoi ou dépense.

Préparer au moins une SIM Airtel et une SIM Moov, avec autorisation de leurs
utilisateurs. Comparer les mêmes horaires, contenus courts et conditions
réseau, sans exposer de code dans les journaux partagés. Consigner :

| Fournisseur / réseau | Nombre tenté | Reçu sur téléphone | Latence médiane / maximale | Doublons / retard après expiration | Coût facturé |
|---|---|---|---|---|---|
| Twilio / Airtel | À tester | — | — | — | — |
| Twilio / Moov | À tester | — | — | — | — |
| Régional / Airtel | À tester | — | — | — | — |
| Régional / Moov | À tester | — | — | — | — |

Le rapport de livraison fournisseur ne remplace pas la réception constatée sur
le téléphone. Tester aussi code faux, code expiré, renvoi, limitation des
abus et absence de fuite de numéro/code. Le serveur Auth vérifie le code ; le
fournisseur transporte seulement le message. L’OTP fixe du banc USB ne doit
jamais être déployé pour les comptes terrain.

Le fournisseur eSMS Africa est retenu le 22 octobre, sans engagement financier ici.
Restent à confirmer : accès Apple pour les futurs essais iOS, SIM de test et
budget SMS. La couverture SMS et la fiabilité push sur les deux appareils en
conditions dégradées demeurent bloquantes avant les courses terrain.

## Protection Expo activée

Le robot `teko-alpha-push`, rôle Viewer de l'organisation `teko241`, et le
jeton `backend-alpha-push` ont été autorisés explicitement puis créés. Le rôle
aussi donne lecture aux projets de cette organisation, sans publication ni
gestion des membres. La protection renforcée est active pour l'organisation,
qui contient les deux projets alpha. Un envoi sans jeton serveur est refusé
avec UNAUTHORIZED ; un envoi avec le jeton aboutit. Le jeton est persisté en
mode 0600 dans `.local/alpha-services/`, ignoré par Git, et contrôlé absent des
APK par le harnais de vérification. Aucun jeton personnel général n'a été créé.
Le Pixel a reçu un push pendant la veille (état Android Dozing constaté), et
son reçu FCM est ok. Les essais prolongés d'économie batterie restent ouverts.
