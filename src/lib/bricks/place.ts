// Dónde caería la pieza en mano según lo que toca el dedo o el cursor. Devuelve siempre una
// posición para el fantasma, válida o no: la vista lo pinta con contorno sólido si cabe y
// discontinuo con el motivo si no (investigación, secciones 3.6 y 4.6).

import { part } from "./parts.ts";
import type { Hit } from "./ray.ts";
import { footprint, type BrickWorld, type Placement, type Rot } from "./world.ts";

export type PlaceProblem = "ocupado" | "sin apoyo";

export interface Proposal extends Placement {
  ok: boolean;
  problem?: PlaceProblem;
}

/** Cuántas placas sube el fantasma buscando hueco antes de rendirse (dos ladrillos). */
const MAX_LIFT = 6;

/**
 * @param anchor celda de la huella ya rotada que queda bajo el dedo. Se conserva al rotar, así
 *   la pieza gira alrededor del dedo y no salta.
 * @param ignore pieza que se está moviendo: no choca consigo misma.
 */
export function proposePlacement(world: BrickWorld, hit: Hit, partId: number, rot: Rot, anchor: [number, number], ignore?: string): Proposal {
  const p = part(partId);
  const { w, d } = footprint(p, rot);
  const ai = Math.min(anchor[0], w - 1);
  const ak = Math.min(anchor[1], d - 1);
  const cy = hit.cell[1];
  let [cx, , cz] = hit.cell;
  const [nx, ny, nz] = hit.normal;
  let y: number;
  let down = false;
  if (ny === 1) {
    y = cy + 1;
  } else if (ny === -1) {
    // Por debajo de una pieza: colgada, con su cara superior contra la de arriba.
    y = cy - p.h;
    down = true;
  } else {
    // Por un costado: al lado, con la base a la altura de la pieza tocada.
    cx += nx;
    cz += nz;
    const touched = hit.brickId ? world.bricks.get(hit.brickId) : undefined;
    y = touched ? touched.y : Math.max(0, cy);
  }
  const x = cx - ai;
  const z = cz - ak;

  for (let lift = 0; lift <= MAX_LIFT; lift++) {
    const yy = down ? y - lift : y + lift;
    if (yy < 0) break;
    const pl: Placement = { part: partId, rot, x, y: yy, z };
    if (!world.collides(pl, ignore)) {
      const supported = world.isSupported(pl, ignore);
      return { ...pl, ok: supported, problem: supported ? undefined : "sin apoyo" };
    }
  }
  return { part: partId, rot, x, y: Math.max(0, y), z, ok: false, problem: "ocupado" };
}
