// Mensaje de celebración del ranking en el proyector (docs/investigacion-ux-kahoot.md 6.3).
// Solo uno por ranking, y no siempre: si nada es notable, no se muestra nada.

import type { LeaderboardEntry } from "./live-engine";

export function celebration(entries: LeaderboardEntry[]): string | null {
  if (entries.length === 0) return null;

  const minStreak = Math.min(...entries.map((e) => e.streak));
  if (entries.length > 1 && minStreak >= 2) return `¡Increíble! Todos llevan racha de ${minStreak}`;

  const climber = [...entries].sort((a, b) => b.movement - a.movement)[0];
  if (climber.movement >= 3) return `¡${climber.nickname} subió ${climber.movement} puestos! Es quien más escaló`;

  const onFire = entries.filter((e) => e.streak >= 3);
  if (onFire.length >= 2) return `¡${onFire.length} jugadores llevan racha de 3 o más!`;

  const best = [...entries].sort((a, b) => b.streak - a.streak)[0];
  if (best.streak >= 3) return `¡${best.nickname} lleva una racha de ${best.streak}!`;

  return null;
}
