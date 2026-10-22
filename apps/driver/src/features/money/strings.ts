// Textes français — espace de noms « money » : parcours I (l'argent).
// D-15 solde quotidien, D-16 règlement Airtel, D-17 gains. Copie fidèle
// aux maquettes docs/design/maquettes/chauffeur/d15-…-d17.

export const moneyFr = {
  calendrier: {
    // Données de locale (dates françaises) — consommées par les helpers
    // purs (display.ts), pas via t().
    jours: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    joursCourts: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
    mois: [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre",
    ],
  },
  entete: {
    retour: "Retour",
  },
  solde: {
    titre: "Solde du jour",
    sousTitre: "Journée du {{jour}} · clôture à 04 h 00",
    crediteur: "Teko vous doit",
    crediteurTexte:
      "À 04 h 00, un versement manuel est préparé. Finance confirme le versement après vérification du justificatif.",
    debiteur: "Vous devez à Teko",
    suspendu: "Compte suspendu",
    suspenduTexte:
      "Réglez votre solde auprès de Teko. Finance vérifie le justificatif avant la réactivation.",
    urgenceCloture: "Urgence — clôture dans",
    cloture: "Clôture dans",
    regler: "Régler par Airtel Money",
    pourquoi:
      "Un solde non réglé à 04 h 00 suspend la réception de nouvelles courses jusqu'au règlement.",
    aujourdhui: "Aujourd'hui",
    mouvements: "Mouvements du jour",
    aucunMouvement: "Aucun mouvement aujourd'hui.",
    kindCommission: "Commission course",
    kindMobileCredit: "Course Airtel",
    kindSettlement: "Règlement",
    kindPayout: "Versement",
    kindCancellation: "Compensation annulation",
    kindAdjustment: "Ajustement",
  },
  reglement: {
    titre: "Régler mon solde",
    sousTitre: "Règlement du solde dû · journée du {{jour}}",
    montantLabel: "Montant à régler",
    montantAide: "Pré-rempli avec votre solde dû — modifiable.",
    montantInvalide: "Saisissez un montant en FCFA supérieur à zéro.",
    cta: "Régler par Airtel Money",
    airtel: "Airtel Money",
    envoyeeAu: "Demande envoyée au {{numero}}.",
    envoyeeGenerique: "Demande envoyée — validez sur votre téléphone Airtel.",
    composez: "Composez votre code secret Airtel pour confirmer le paiement à Teko.",
    renvoyer: "Renvoyer la demande",
    echec: "Le règlement n'a pas abouti",
    echecTexte: "Renvoyez la demande, ou passez par le règlement manuel ci-dessous.",
    pasDeSolde: "Pas de solde Airtel Money ?",
    pasDeSoldeTexte:
      "Rechargez votre compte en point Airtel, puis relancez la demande. En cas de blocage, contactez Teko avant 04 h 00 — un règlement manuel avec justificatif est possible.",
    manuelTitre: "Règlement manuel",
    manuelTexte:
      "Déposez le montant en point Airtel ou auprès de Teko, puis présentez le justificatif de dépôt (procédure DOC-01). Le dépôt du justificatif depuis l'app arrive bientôt.",
    succesTitre: "Réglé — vous êtes de nouveau en règle",
    succesTexte: "Merci. La réactivation de votre compte est automatique.",
    retourSolde: "Retour au solde",
  },
  gains: {
    titre: "Mes gains",
    statSemaine: "Semaine",
    statJournees: "Journées",
    statCommission: "Commission",
    statutOpen: "En cours",
    statutSettled: "Réglée",
    statutOverdue: "En retard",
    statutPaidOut: "Versée",
    ouverture: "Ouverture",
    cloture: "Clôture",
    commission: "Commission",
    creditsAirtel: "Crédits Airtel",
    versement: "Versement",
    videTitre: "Aucun relevé pour l'instant",
    videTexte: "Vos journées apparaîtront ici après la première clôture de 04 h 00.",
  },
} as const;
