# Procédures d’exploitation de l’alpha fermée

État du 18 octobre 2026 : procédures préparées pour revue. Les responsables,
leurs remplaçants, horaires, contacts et délais d’intervention ne sont pas
encore désignés. **Ce document n’autorise pas l’ouverture aux vraies courses.**
Les règles confirmées figurent dans le [plan](08-plan-alpha.md) et les
constats dans l’[audit](09-audit-alpha.md).

## Avant chaque créneau de courses

Le responsable Ops vérifie la disponibilité de Finance et du dispositif SOS,
la zone de service approuvée, la liste d’invités et les chauffeurs activés.
Chaque chauffeur doit avoir ses sept pièces validées, la vérification physique
effectuée, un véhicule conforme et une invitation active. Un changement de
plaque, de véhicule ou de catégorie impose une nouvelle vérification Ops.

Identifier le build signé par son SHA-256, son certificat et son identifiant
alpha. Le build terrain doit utiliser le GPS réel, des services HTTPS et des
comptes réels invités ; le build USB à GPS fictif ne doit jamais le remplacer.
Vérifier sur les deux rôles une inscription OTP réelle, la réception des
notifications et un trajet de contrôle, sans envoyer de SMS payant non autorisé.

Contrôler l’état des services, les tâches de dispatch/clôture/purge et la
fraîcheur de la sauvegarde. Un secret absent, un fournisseur mock ou une
configuration de test ne constitue jamais un fonctionnement terrain valide.
Si la prise en charge SOS n’est pas disponible, ne pas ouvrir le créneau.

## Dossiers de règlement manuel

Ops prépare un dossier avec le chauffeur, le montant exact, le circuit choisi
(cash ou versement externe), une référence unique et un justificatif joint.
L’écran chauffeur informe sur le circuit manuel ; il ne crédite aucun solde.
Le justificatif est privé et se consulte par un lien signé à durée limitée.

Finance ou le superadmin rapproche le montant et la référence avec la preuve
réelle d’encaissement ou de versement. Vérifier le sens du mouvement : encaissement
d’une dette chauffeur, frais passager encaissés, ou versement dû au chauffeur.
Valider seulement après ce rapprochement. Deux clics ou deux approbations
concurrentes ne doivent produire qu’une écriture financière.

Si la preuve ne convient pas, Finance refuse avec un motif précis. Ops prépare
une nouvelle version sous la même référence, avec sa preuve corrigée ; les
versions précédentes restent consultables. Ne pas créer une autre référence
pour contourner un refus ou un doublon. Une correction d’un mouvement déjà
validé exige une procédure Finance distincte à faire approuver avant usage.

Les frais d’annulation et de non-présentation restent des créances tant que
le montant complet n’a pas été encaissé et validé. La part chauffeur de 70 %
ne devient un crédit qu’après cette validation. Aucun encaissement partiel ne
suffit dans l’alpha.

## Clôture quotidienne à 04 h, heure de Libreville

Finance examine les relevés et les dossiers en attente après l’exécution du
job serveur. Une dette non réglée suit la suspension prévue. Un solde positif
crée une demande de versement manuel : il ne signifie pas « payé ». Finance
vérifie la preuve du versement avant approbation.

Comparer totaux des courses cash, commissions, frais effectivement encaissés,
règlements et versements. Une divergence reste ouverte avec sa référence et
son responsable ; ne pas modifier directement le grand livre ni les statuts
pour rendre un tableau cohérent. Conserver l’heure, le rôle de validation et
les liens vers le dossier, sans recopier ses pièces dans un journal public.

## SOS et incident pendant une course

Un SOS est une demande d’assistance, pas la preuve qu’un secours a été alerté.
Le responsable doit surveiller la console et disposer d’un moyen de contact
opérationnel de repli, défini avant ouverture. Un push seul ne constitue pas
une chaîne d’alerte suffisante. Les numéros d’urgence locaux, destinataires,
créneaux et délais d’escalade restent à valider sur place.

Prendre en charge l’incident dans la console, contacter les participants avec
les moyens autorisés, évaluer la situation et suivre le protocole local validé.
Tracer l’heure du signalement, de la prise en charge, des actions et de la
clôture. En cas de risque pour une personne, appliquer le circuit d’urgence
validé ; le support technique ne remplace pas les secours.

Limiter l’accès aux données de localisation et aux pièces aux personnes
habilitées. Ne pas demander un PIN dans un journal, une capture ou un canal de
support ; le chauffeur reçoit le code oralement du passager pour démarrer.

## Panne réseau, notifications ou cartographie

Un geste de commande ou d’annulation non confirmé par le serveur ne doit pas
être annoncé comme réussi. Rouvrir la course et relire son état avant de
réessayer. Le devis déjà consommé retrouve la même course ; ne pas en créer
une seconde pour compenser une réponse perdue.

Les mesures GPS non envoyées sont limitées à 24 heures sur le téléphone.
Le serveur garde les positions précises sept jours. Une reprise ne doit ni
changer leur heure de mesure ni créer des doublons. Les traces anonymisées de
cartographie suivent une règle distincte.

En cas d’indisponibilité durable, Ops arrête les nouvelles prises en charge et
contacte les courses actives selon le protocole validé. La révocation d’une
invitation bloque les nouvelles opérations ; elle ne remplace pas la gestion
d’une course déjà en cours. Le dispositif complet d’arrêt général et de reprise
doit être exercé avec le futur hébergeur avant ouverture.

## Sauvegarde et restauration

Le script local `tools/audit/check-restore.mjs` éprouve SQL, ACL et fichiers
privés dans une copie distincte du banc. Il ne prouve pas la reprise complète
sur un nouvel hôte avec Auth, Storage, Realtime, Edge Functions et HTTP.

Avant ouverture, désigner le responsable, l’emplacement chiffré hors machine,
la fréquence et les objectifs de perte de données et de délai de reprise.
Sauvegarder séparément la clé de signature alpha et ses accès de récupération.
Aucun secret ne doit être joint au dossier de revue ou aux logs partagés.

Exercer une restauration sur un environnement isolé : restaurer données et
fichiers, vérifier leurs empreintes et les droits, rétablir les services et
secrets par un canal sécurisé, puis dérouler une connexion et une course de
contrôle. Garder cron, paiements et notifications externes désactivés dans la
copie jusqu’à vérification pour éviter les doubles traitements.

Consigner source, date, version, durée, contrôles d’intégrité et écarts. La
restauration n’est validée qu’après les contrôles applicatifs et la décision du
responsable. Une archive créée sans essai de reprise ne ferme pas le critère.

## Données personnelles et fin de campagne

La désactivation du compte après le délai de rétractation ne fixe pas la durée
de conservation des pièces KYC. Le porteur demande d’attendre le conseil
juridique pour ce délai ; aucune purge automatique KYC supplémentaire n’est
activée ici. La conservation des justificatifs financiers doit aussi être
fixée séparément. Ces décisions et l’information aux participants restent à
clore avant traitement terrain.

À la fin d’un créneau ou de la campagne, rapprocher les courses et dossiers,
traiter les incidents ouverts, retirer les accès devenus inutiles selon la
procédure approuvée et conserver les preuves expurgées nécessaires à l’audit.
