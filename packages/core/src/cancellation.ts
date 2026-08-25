// Frais d'annulation — MIROIR D'AFFICHAGE de la règle backend (cancel_ride) :
// max(montant fixe, pourcentage de l'estimation). L'UI n'affiche JAMAIS la
// formule, seulement le montant calculé en XAF avant confirmation (C-21).
// Valeurs par défaut actées le 25 août : fixe 300 F, 20 % — configurables
// dans app_config, à lire côté serveur, jamais codées en dur dans les apps.

export interface CancellationFeeConfig {
  /** Montant fixe en XAF (défaut backend : 300). */
  fixed: number;
  /** Pourcentage de l'estimation (défaut backend : 20). */
  percent: number;
}

/** Montant affiché avant confirmation d'annulation (après attribution). */
export function cancellationFee(estimateXaf: number, config: CancellationFeeConfig): number {
  return Math.round(Math.max(config.fixed, (config.percent / 100) * estimateXaf));
}
