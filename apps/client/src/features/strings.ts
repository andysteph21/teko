// Barrel des espaces de noms i18n de l'app — chaque feature possède SON
// module strings.ts (un seul rédacteur par fichier) ; ce barrel est figé.

import { accountFr } from "./account/strings";
import { bookingFr } from "./booking/strings";
import { placesFr } from "./places/strings";
import { rideFr } from "./ride/strings";
import { settingsFr } from "./settings/strings";

export const appFr = {
  account: accountFr,
  booking: bookingFr,
  ride: rideFr,
  places: placesFr,
  settings: settingsFr,
};
