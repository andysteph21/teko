/** Convertit le résumé Valhalla sans fabriquer de distance pour un trajet nul. */
export function quoteMetrics(
  summary: { length?: number; time?: number } | undefined,
) {
  const { length, time } = summary ?? {};
  if (
    typeof length !== "number" || !Number.isFinite(length) || length < 0 ||
    typeof time !== "number" || !Number.isFinite(time) || time < 0
  ) return { error: "ROUTING_UNAVAILABLE" } as const;
  const distanceM = Math.round(length * 1000);
  if (distanceM === 0) return { error: "POINTS_TOO_CLOSE" } as const;
  if (time === 0) return { error: "ROUTING_UNAVAILABLE" } as const;
  return { distanceM, durationS: Math.max(1, Math.round(time)) } as const;
}
