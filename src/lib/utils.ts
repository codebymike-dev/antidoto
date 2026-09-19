/** Convierte 6 valores de avance (0-100) en los puntos del polyline de tendencia. */
export function trendToPoints(trend: number[]): string {
  return trend
    .map((v, i) => `${(i * (140 / Math.max(1, trend.length - 1))).toFixed(1)},${(36 - (v / 100) * 32).toFixed(1)}`)
    .join(" ");
}
