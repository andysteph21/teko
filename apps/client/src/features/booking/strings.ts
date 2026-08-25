// Textes français — parcours C, commande (C-07→C-12). Espace « booking ».
// Les écrans C-08→C-12 complètent ce module (copie fidèle aux maquettes).

export const bookingFr = {
  home: {
    ouAllezVous: "Où allez-vous ?",
    chercherRepere: "Chercher un repère…",
    planifier: "Planifier une course",
    planifierSous: "Choisir la date et l'heure",
    recent: "Récent",
  },
  categories: {
    eco: "Éco",
    moto: "Moto-taxi",
    confort: "Confort",
  },
  categorie: {
    titre: "Choisissez votre course",
    metaEco: "4 places · {{min}} min",
    metaMoto: "1 place",
    metaConfort: "4 places · clim",
    especes: "Espèces",
    airtel: "Airtel Money",
    prixFixe: "Prix fixe, calculé à l'avance — aucun marchandage.",
    commander: "Commander {{categorie}} · {{prix}}",
    planifierPlusTard: "Planifier pour plus tard",
  },
  rencontre: {
    eyebrow: "Point de rencontre suggéré",
    reperValide: "Repère validé",
    pourquoi:
      "Votre chauffeur vous attendra ici — un point facile à trouver pour vous deux, sans explications au téléphone.",
    confirmer: "Confirmer le point de rencontre",
    garderPosition: "Garder ma position",
    recherche: "Recherche d'un point de rencontre…",
    aucunRepere: "Aucun repère à proximité",
    aucunRepereTexte: "Votre chauffeur viendra directement à votre position.",
    commander: "Commander ma course",
    planifieeTitre: "Course planifiée",
    planifieeTexte: "Votre course est enregistrée. Nous vous préviendrons juste avant le départ.",
    retourAccueil: "Retour à l'accueil",
  },
  recherche: {
    titre: "Recherche d'un chauffeur…",
    moyenne: "En général, moins de 2 minutes.",
    annulationGratuite: "Annulation gratuite tant qu'aucun chauffeur n'est attribué.",
    annuler: "Annuler la demande",
    aucunChauffeur: "Aucun chauffeur disponible pour le moment",
    aucunChauffeurTexte: "Réessayez dans un instant — ou revenez à l'accueil.",
    retourAccueil: "Retour à l'accueil",
  },
  horsLigne: {
    titre: "Pas de connexion",
    texte:
      "Vérifiez votre réseau mobile. Rien n'a été perdu — votre demande reprendra là où elle s'est arrêtée.",
    astuce: "Astuce : le mode éco fonctionne même avec un signal très faible.",
  },
} as const;
