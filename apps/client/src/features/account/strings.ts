// Textes français — parcours A/B/E/F côté compte (C-01→C-06, C-23/24/28/30).
// Copie fidèle des maquettes ; espace de noms i18n « account ».

export const accountFr = {
  splash: {
    slogan: "Vos trajets, vos repères",
    version: "v1.0 · Libreville",
  },
  onboarding: {
    passer: "Passer",
    slide1Titre: "Des repères, pas d'adresses",
    slide1Texte:
      "Indiquez la pharmacie, l'école ou le marché le plus proche — le chauffeur vous trouve.",
    slide2Titre: "Un prix ferme, connu d'avance",
    slide2Texte:
      "Le montant annoncé avant la course est celui que vous payez. En espèces ou Airtel Money.",
    slide3Titre: "Légère sur vos données",
    slide3Texte:
      "Compteur de consommation intégré et mode éco — Teko roule aussi sur les petits forfaits.",
  },
  phone: {
    titre: "Votre numéro",
    texte: "Votre compte Teko suit votre numéro de téléphone — pas de mot de passe.",
    label: "Numéro de téléphone",
    placeholder: "06 12 34 56",
    helper: "Un code de vérification vous sera envoyé par SMS.",
    cta: "Recevoir le code",
    plusAcces: "Je n'ai plus accès à mon numéro",
    erreurFormat: "Numéro incomplet — 8 chiffres attendus.",
  },
  otp: {
    titre: "Code de vérification",
    envoyeAu: "Envoyé par SMS au {{phone}}.",
    modifier: "Modifier",
    renvoyerDans: "Renvoyer le code dans {{s}} s",
    renvoyer: "Renvoyer le code",
    ou: "ou",
    repliEmail: "Recevoir le code par e-mail",
    erreurCode: "Code incorrect. Vérifiez et réessayez.",
  },
  profil: {
    titre: "Votre profil",
    texte: "Le chauffeur verra votre prénom et votre photo.",
    prenom: "Prénom",
    prenomPlaceholder: "Votre prénom",
    nom: "Nom",
    nomOptionnel: "· optionnel",
    nomPlaceholder: "Votre nom",
    email: "E-mail",
    emailPlaceholder: "vous@exemple.com",
    emailHelper: "Recommandé : permet de récupérer votre compte si vous perdez votre numéro.",
    cta: "Continuer",
  },
  location: {
    titre: "Autour de vous",
    texte:
      "Teko utilise votre position pour trouver les repères proches et suggérer le meilleur point de rencontre avec votre chauffeur.",
    autoriser: "Autoriser la localisation",
    plusTard: "Plus tard",
    sans: "Sans localisation, choisissez simplement un repère. Modifiable à tout moment dans les réglages.",
  },
} as const;
