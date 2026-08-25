// Compteur de consommation data — alimente le widget flottant (composant
// widget-data, visible sur tout écran où la carte est l'élément principal).
// Budget et seuils actés le 25 août (n° 19) : 100 Mo/mois, alerte 50 %,
// critique 80 % — configurables. La MESURE (instrumentation réseau) est
// branchée par l'app ; ici : l'accumulation, les états, le formatage.

const NBSP = " ";

export const DEFAULT_BUDGET_BYTES = 100_000_000;

export type DataBudgetState = "normal" | "alerte" | "critique";

export interface DataBudgetConfig {
  budgetBytes: number;
  /** Fraction du budget déclenchant l'état « alerte » (défaut 0,5). */
  alertRatio: number;
  /** Fraction du budget déclenchant l'état « critique » (défaut 0,8). */
  criticalRatio: number;
}

export const DEFAULT_BUDGET: DataBudgetConfig = {
  budgetBytes: DEFAULT_BUDGET_BYTES,
  alertRatio: 0.5,
  criticalRatio: 0.8,
};

/** État du widget selon la consommation du mois. */
export function budgetState(
  usedBytes: number,
  config: DataBudgetConfig = DEFAULT_BUDGET,
): DataBudgetState {
  if (usedBytes >= config.budgetBytes * config.criticalRatio) return "critique";
  if (usedBytes >= config.budgetBytes * config.alertRatio) return "alerte";
  return "normal";
}

/** `formatMo(12_400_000)` → `"12,4 Mo"` · sous 1 Mo, affiche des ko. */
export function formatMo(bytes: number): string {
  if (bytes < 1_000_000) {
    return `${Math.round(bytes / 1_000)}${NBSP}ko`;
  }
  const mo = bytes / 1_000_000;
  const rounded = Math.round(mo * 10) / 10;
  return `${rounded.toFixed(1).replace(".", ",")}${NBSP}Mo`;
}

export type DataUsageListener = (totalBytes: number) => void;

/** Accumulateur en mémoire ; l'app le recharge/persiste (kv-store) et le
 *  remet à zéro au changement de mois. */
export class DataUsageMeter {
  private total: number;
  private listeners = new Set<DataUsageListener>();

  constructor(initialBytes = 0) {
    this.total = initialBytes;
  }

  get totalBytes(): number {
    return this.total;
  }

  record(bytes: number): void {
    if (!Number.isFinite(bytes) || bytes <= 0) return;
    this.total += bytes;
    for (const listener of this.listeners) {
      listener(this.total);
    }
  }

  reset(): void {
    this.total = 0;
    for (const listener of this.listeners) {
      listener(0);
    }
  }

  subscribe(listener: DataUsageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
