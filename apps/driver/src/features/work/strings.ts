// Textes français — espace de noms « work » : la journée de travail du
// chauffeur (parcours H, écrans D-09 → D-14b). Ton des maquettes : direct,
// rassurant, jamais de jargon technique.

export const workFr = {
  accueil: {
    soldeDuJour: "Solde du jour",
    enLigne: "En ligne",
    horsLigne: "Hors ligne",
    tekoVousDoit: "Teko vous doit",
    vousDevez: "Vous devez à Teko",
    reglementAuto: "Règlement automatique cette nuit avant 04 h 00",
    details: "Détails",
    suspenduTitre: "Compte suspendu",
    suspenduTexte:
      "Votre solde n'a pas été réglé avant la clôture. Réglez-le pour repasser en ligne immédiatement.",
    suspenduLien: "Régler mon solde",
    localisation: {
      refus: {
        titre: "Localisation requise",
        texte:
          "Teko a besoin de votre position pour vous envoyer les demandes proches. Repassez en ligne pour l'autoriser.",
      },
      bloquee: {
        titre: "Localisation désactivée",
        texte:
          "Autorisez la localisation de Teko dans les réglages du téléphone, puis repassez en ligne.",
      },
      introuvable: {
        titre: "Position introuvable",
        texte:
          "Activez la localisation (GPS) du téléphone. Sans position, vous ne recevez plus de demandes.",
      },
      reglages: "Ouvrir les réglages",
    },
    onglets: {
      accueil: "Accueil",
      courses: "Courses",
      solde: "Solde",
      profil: "Profil",
    },
  },
  offre: {
    titre: "Nouvelle demande · {{categorie}}",
    secondes: "{{s}} s",
    pointRencontre: "Point de rencontre",
    priseEnCharge: "Prise en charge · à {{min}} min",
    indication: "Indication du passager : « {{hint}} »",
    course: "Course",
    commission: "Commission",
    net: "Net",
    distanceDuree: "{{km}} km · {{min}} min de course",
    accepter: "Accepter la course",
    refuser: "Refuser",
    attribueeAutre: "Demande attribuée à un autre chauffeur",
  },
  categories: {
    eco: "Éco",
    moto: "Moto",
    confort: "Confort",
    covoiturage: "Covoiturage",
  },
  paiement: {
    cash: "Espèces",
    airtel: "Airtel Money",
  },
  course: {
    versPassager: "Vers le point de rencontre",
    votrePassager: "Votre passager",
    vousAttend: "Vous attend au point de rencontre",
    jeSuisArrive: "Je suis arrivé",
    arriveTitre: "Vous êtes au point de rencontre",
    arriveTexte: "Le passager a été prévenu — il voit votre voiture sur sa carte",
    attentePassager: "Attente du passager",
    attenteAide: "Après 5 minutes, vous pourrez annuler sans pénalité — motif « passager absent ».",
    demanderCode: "Demander le code au passager",
    passagerAbsent: "Passager absent",
    passagerAbsentDans: "Passager absent · disponible dans {{duree}}",
    versDestination: "Vers la destination",
    courseEnCours: "Course en cours",
    terminer: "Terminer la course",
    chargementErreur: "Course introuvable. Vérifiez votre connexion.",
    annuleeClient: "Course annulée par le passager",
    annuleeAbsent: "Course annulée — passager absent",
  },
  pin: {
    titre: "Code du passager",
    sousTitre: "Demandez-lui son code à 4 chiffres. La course démarre dès qu'il est confirmé.",
    aide: "Le passager voit ce code en grand sur son écran.",
    incorrect: "PIN incorrect. Redemandez le code au passager.",
    aideEchecs: "Toujours incorrect ? Vérifiez le code affiché sur l'écran du passager.",
    retour: "Retour à l'attente",
  },
  fin: {
    titre: "Course terminée",
    sousTitre: "{{categorie}} · {{duree}} min",
    aEncaisser: "À encaisser en espèces",
    remiseMontant: "Le passager vous remet le montant maintenant.",
    ligneCourse: "Course",
    nouveauSolde: "Nouveau solde du jour",
    encaisse: "J'ai encaissé {{montant}}",
    soldeMisAJour: "Solde du jour mis à jour",
    noterPassager: "Noter le passager",
    airtelTitre: "Paiement Airtel Money en cours",
    airtelTexte:
      "Le passager confirme sur son téléphone avec son code secret Airtel. Rien à faire de votre côté — l'écran se mettra à jour tout seul.",
    airtelMontant: "Montant de la course",
    airtelConfirme: "Paiement Airtel confirmé",
    airtelEchec: "Paiement Airtel échoué — voyez le règlement en espèces avec le passager.",
    retourAccueil: "Retour à l'accueil",
  },
} as const;
