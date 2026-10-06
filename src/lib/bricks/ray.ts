// Rayo de la cámara contra la grilla (algoritmo de Amanatides y Woo): recorre celda por celda
// hasta tocar una pieza o la base. Cuesta microsegundos y no depende de cuántas piezas haya,
// porque nunca mira mallas (investigación, sección 7.4).
//
// Entra en unidades de mundo (1 = un stud de ancho; en y, una placa mide PLATE_H) y sale en
// celdas enteras.

import { PLATE_H } from "./units.ts";
import type { BrickWorld } from "./world.ts";

export type Vec3 = [number, number, number];

export interface Hit {
  /** Celda tocada. Si es la base, y = -1. */
  cell: Vec3;
  /** Cara por la que entró el rayo, como vector unitario de la grilla. */
  normal: Vec3;
  /** Pieza tocada; ausente si es la base. */
  brickId?: string;
  /** Distancia en unidades de mundo. */
  t: number;
}

const SIZE: Vec3 = [1, PLATE_H, 1];

export function castRay(world: BrickWorld, origin: Vec3, dir: Vec3, maxDist = 400): Hit | null {
  const len = Math.hypot(dir[0], dir[1], dir[2]);
  if (len === 0) return null;
  const d: Vec3 = [dir[0] / len, dir[1] / len, dir[2] / len];

  // La base: el plano y = 0, solo dentro de sus límites.
  let groundT = Infinity;
  if (d[1] < 0 && origin[1] > 0) {
    const t = -origin[1] / d[1];
    const gx = Math.floor(origin[0] + d[0] * t);
    const gz = Math.floor(origin[2] + d[2] * t);
    if (world.onBase(gx, gz)) groundT = t;
  }

  const cell: Vec3 = [0, 0, 0];
  const step: Vec3 = [0, 0, 0];
  const tMax: Vec3 = [0, 0, 0];
  const tDelta: Vec3 = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const p = origin[a] / SIZE[a];
    cell[a] = Math.floor(p);
    if (d[a] > 0) {
      step[a] = 1;
      tMax[a] = ((cell[a] + 1 - p) * SIZE[a]) / d[a];
      tDelta[a] = SIZE[a] / d[a];
    } else if (d[a] < 0) {
      step[a] = -1;
      tMax[a] = ((p - cell[a]) * SIZE[a]) / -d[a];
      tDelta[a] = SIZE[a] / -d[a];
    } else {
      tMax[a] = Infinity;
      tDelta[a] = Infinity;
    }
  }

  const normal: Vec3 = [0, 0, 0];
  let t = 0;
  const limit = Math.min(maxDist, groundT);
  while (t <= limit) {
    if (cell[1] >= 0) {
      const b = world.at(cell[0], cell[1], cell[2]);
      if (b) return { cell: [cell[0], cell[1], cell[2]], normal: [normal[0], normal[1], normal[2]], brickId: b.id, t };
    }
    const a = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : tMax[1] < tMax[2] ? 1 : 2;
    t = tMax[a];
    tMax[a] += tDelta[a];
    cell[a] += step[a];
    normal[0] = normal[1] = normal[2] = 0;
    normal[a] = -step[a];
  }

  if (groundT <= maxDist) {
    const gx = Math.floor(origin[0] + d[0] * groundT);
    const gz = Math.floor(origin[2] + d[2] * groundT);
    return { cell: [gx, -1, gz], normal: [0, 1, 0], t: groundT };
  }
  return null;
}
