# Scénarios JWT du banc alpha

Voir le [guide des tests backend](../README.md) pour les préconditions, les
commandes et les invariants couverts. Exécuter depuis la racine :

```sh
node tools/audit/run-bench.mjs
```

Le harnais charge uniquement la stack `teko-alpha-audit` (API 58321, DB 58322)
et les secrets de son bac à sable. Les helpers refusent une autre cible. Les
utilisateurs de test sont créés avec des numéros vérifiés et des invitations
propres aux scénarios ; modifier un téléphone de profil ne crée pas une
invitation. Aucun SMS facturé n’est nécessaire.

Les fixtures de service servent à établir les préconditions. Chaque attaque
et chaque opération évaluée est jouée avec le JWT du rôle concerné. Les tests
KYC déposent de vrais fichiers dans le Storage privé et distinguent la revue
Ops de la validation Finance des justificatifs d’encaissement.
