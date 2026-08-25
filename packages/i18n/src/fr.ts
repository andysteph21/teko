// Ressources françaises — langue livrée au MVP (ADR-08). Les textes suivent
// le ton des maquettes : direct, rassurant, jamais de jargon technique.
// Structure par domaines ; les écrans ajouteront leurs clés au fil des lots.

export const fr = {
  commun: {
    appNameClient: "Teko",
    appNameDriver: "Teko Chauffeur",
    continuer: "Continuer",
    annuler: "Annuler",
    confirmer: "Confirmer",
    reessayer: "Réessayer",
    fermer: "Fermer",
    chargement: "Chargement…",
  },
  erreurs: {
    generique: "Une erreur est survenue. Réessayez.",
    reseau: "Connexion impossible. Vérifiez votre réseau.",
    horsLigne: "Vous êtes hors ligne",
  },
  auth: {
    numeroTelephone: "Numéro de téléphone",
    indicatifGabon: "+241",
    recevoirCode: "Recevoir le code",
    codeVerification: "Code de vérification",
    codeIncorrect: "Code incorrect. Vérifiez et réessayez.",
    renvoyerCode: "Renvoyer le code",
    compteSuitNumero: "Votre compte suit votre numéro de téléphone.",
  },
  course: {
    ouAllezVous: "Où allez-vous ?",
    rechercheChauffeur: "Recherche d'un chauffeur…",
    annulationGratuite: "Annulation gratuite avant attribution",
    aucunChauffeur: "Aucun chauffeur disponible pour le moment",
  },
} as const;

export type FrResources = typeof fr;
