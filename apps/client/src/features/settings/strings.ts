// Textes français — espace de noms « settings » : C-25 Données & mode éco,
// C-30 Langue. Copie fidèle des maquettes.

export const settingsFr = {
  donnees: {
    titre: "Données & mode éco",
    consoLabel: "Consommation Teko — {{mois}}",
    budgetSuffixe: "/ budget 100 Mo",
    seuils: "Le widget passe en alerte à 50 Mo, en critique à 80 Mo.",
    modeTitre: "Mode éco",
    modeSous: "Réduit la consommation d'environ 70 %",
    eco: "Éco",
    auto: "Auto",
    complet: "Complet",
    resolu: "{{pref}} → {{mode}}",
    quoi1: "En mode éco : carte simplifiée sans tuiles, ",
    quoiFort: "photos remplacées par des initiales",
    quoi2:
      ", animations coupées, position rafraîchie toutes les 5 s au lieu de 1 s. Votre course fonctionne exactement pareil.",
  },
  langue: {
    titre: "Langue",
    francais: "Français",
    actuelle: "Langue actuelle",
    english: "English",
    englishSous: "À l'étude",
    locales: "Langues locales",
    localesSous: "Selon les retours de la communauté",
    bientot: "Bientôt",
    note: "Teko est conçue pour accueillir d'autres langues sans mise à jour majeure. Dites-nous laquelle vous aiderait le plus via « Contacter Teko ».",
  },
} as const;
