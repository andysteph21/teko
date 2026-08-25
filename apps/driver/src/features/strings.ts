// Barrel des espaces de noms i18n de l'app chauffeur — un rédacteur par
// module strings.ts ; ce barrel est figé.

import { accountFr } from "./account/strings";
import { kycFr } from "./kyc/strings";
import { moneyFr } from "./money/strings";
import { workFr } from "./work/strings";

export const appFr = {
  account: accountFr,
  kyc: kycFr,
  money: moneyFr,
  work: workFr,
};
