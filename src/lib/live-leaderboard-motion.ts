// Filas del ranking animado del proyector (docs/investigacion-ux-kahoot.md 4.5): el top
// de antes de la pregunta se transforma en el de ahora. Todo sale de la entrada actual,
// sin datos extra del servidor: puntaje anterior = score - lastPoints y puesto anterior
// = rank + movement. Puro para probarlo sin navegador.

import type { LeaderboardEntry } from "./live-engine";

export interface MotionRow extends LeaderboardEntry {
  prevScore: number;
  prevRank: number;
  /** Fila que ocupaba en el top de antes; null si entra desde abajo. */
  from: number | null;
  /** Fila que ocupa en el top de ahora; null si sale del top. */
  to: number | null;
}

/**
 * Une el top `size` de antes y el de ahora. Las filas vienen en el orden de ahora,
 * seguidas de las que salen del top (para que la lista de claves sea estable).
 */
export function leaderboardMotion(entries: LeaderboardEntry[], size = 5): MotionRow[] {
  const rows = entries.map((e, i) => ({ e, i, prevScore: e.score - e.lastPoints, prevRank: e.rank + e.movement }));

  // Orden de antes: por puesto anterior; en empate, el orden de ahora (estable).
  const before = [...rows].sort((a, b) => a.prevRank - b.prevRank || a.i - b.i);
  const fromOf = new Map(before.slice(0, size).map((r, idx) => [r.e.nickname, idx]));

  const now = rows.slice(0, size).map((r, idx) => ({ ...r, to: idx as number | null }));
  const leaving = before
    .slice(0, size)
    .filter((r) => r.i >= size)
    .map((r) => ({ ...r, to: null }));

  return [...now, ...leaving].map(({ e, prevScore, prevRank, to }) => ({
    ...e,
    prevScore,
    prevRank,
    from: fromOf.get(e.nickname) ?? null,
    to,
  }));
}
