// Consommation du mois pour C-25 : total mesuré (dataMeter), texte formaté,
// état de budget et ratio de la barre de progression (budget 100 Mo, n° 19).

import { budgetState, type DataBudgetState, DEFAULT_BUDGET_BYTES, formatMo } from "@teko/telemetry";
import { useEffect, useState } from "react";
import { dataMeter } from "../data/data-state";

export interface DataProgress {
  usedText: string;
  state: DataBudgetState;
  /** Part du budget consommée, bornée à 1. */
  ratio: number;
}

export function useDataProgress(): DataProgress {
  const [total, setTotal] = useState(dataMeter.totalBytes);
  useEffect(() => dataMeter.subscribe(setTotal), []);
  return {
    usedText: formatMo(total),
    state: budgetState(total),
    ratio: Math.min(1, total / DEFAULT_BUDGET_BYTES),
  };
}
