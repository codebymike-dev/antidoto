// El mundo de construcción: qué pieza ocupa cada celda, qué encaja con qué y qué queda suelto.
// Vive fuera de React y de three (investigación, sección 7.1): la vista solo lo lee. Así se
// reconstruye la GPU tras perder el contexto WebGL y el mismo código valida en el servidor.
//
// Unidades enteras: x y z en studs, y en placas. La base ocupa x y z de 0 a `base - 1` y tiene
// studs en toda su cara superior (y = 0).

import { part, type PartDef } from "./parts.ts";

/** Cuartos de vuelta en el eje vertical, en sentido horario visto desde arriba. */
export type Rot = 0 | 1 | 2 | 3;

export interface Brick {
  id: string;
  part: number;
  color: number;
  /** Esquina mínima de la huella ya rotada. */
  x: number;
  y: number;
  z: number;
  rot: Rot;
}

/** Celda de la grilla como un entero: x y z de -512 a 511, y de 0 a 1023. */
export const cellKey = (x: number, y: number, z: number) => (((x + 512) << 20) | ((z + 512) << 10) | y) >>> 0;

/** Fuera de este rango la clave de celda se pisaría con otra. */
export const inGrid = (x: number, y: number, z: number) => x >= -512 && x < 512 && z >= -512 && z < 512 && y >= 0 && y < 1024;

export function footprint(p: PartDef, rot: Rot): { w: number; d: number } {
  return rot % 2 === 0 ? { w: p.w, d: p.d } : { w: p.d, d: p.w };
}

/**
 * Pasa una celda de la huella ya rotada (i, k) a la celda de la pieza sin rotar, para leer sus
 * máscaras. La rotación gira la pieza dentro de su caja, con la esquina mínima fija.
 */
export function localCell(p: PartDef, rot: Rot, i: number, k: number): number {
  let li: number;
  let lk: number;
  switch (rot) {
    case 0:
      li = i;
      lk = k;
      break;
    case 1:
      li = k;
      lk = p.d - 1 - i;
      break;
    case 2:
      li = p.w - 1 - i;
      lk = p.d - 1 - k;
      break;
    default:
      li = p.w - 1 - k;
      lk = i;
  }
  return lk * p.w + li;
}

export type Placement = Omit<Brick, "id" | "color">;

export class BrickWorld {
  readonly bricks = new Map<string, Brick>();
  private cells = new Map<number, string>();
  readonly base: number;

  constructor(base: number) {
    this.base = base;
  }

  /** Qué pieza ocupa una celda, si alguna. */
  at(x: number, y: number, z: number): Brick | undefined {
    if (!inGrid(x, y, z)) return undefined;
    const id = this.cells.get(cellKey(x, y, z));
    return id === undefined ? undefined : this.bricks.get(id);
  }

  onBase(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.base && z < this.base;
  }

  /** Recorre las celdas que ocuparía una pieza. Corta si `fn` devuelve true. */
  private eachCell(pl: Placement, fn: (x: number, y: number, z: number) => boolean | void): boolean {
    const p = part(pl.part);
    const { w, d } = footprint(p, pl.rot);
    for (let i = 0; i < w; i++)
      for (let k = 0; k < d; k++) for (let j = 0; j < p.h; j++) if (fn(pl.x + i, pl.y + j, pl.z + k)) return true;
    return false;
  }

  collides(pl: Placement, ignore?: string): boolean {
    return this.eachCell(pl, (x, y, z) => {
      // Salirse de la grilla cuenta como choque: ahí no se puede guardar nada.
      if (!inGrid(x, y, z)) return true;
      const id = this.cells.get(cellKey(x, y, z));
      return id !== undefined && id !== ignore;
    });
  }

  /** Piezas que encajan con esta (arriba o abajo), y si toca la base. */
  connections(pl: Placement, ignore?: string): { ids: Set<string>; base: boolean } {
    const p = part(pl.part);
    const { w, d } = footprint(p, pl.rot);
    const ids = new Set<string>();
    let base = false;
    for (let i = 0; i < w; i++)
      for (let k = 0; k < d; k++) {
        const x = pl.x + i;
        const z = pl.z + k;
        const cell = localCell(p, pl.rot, i, k);
        if (p.bottom[cell]) {
          if (pl.y === 0) {
            if (this.onBase(x, z)) base = true;
          } else {
            const below = this.at(x, pl.y - 1, z);
            if (below && below.id !== ignore && this.studAt(below, x, z)) ids.add(below.id);
          }
        }
        if (p.top[cell]) {
          const above = this.at(x, pl.y + p.h, z);
          if (above && above.id !== ignore && this.socketAt(above, x, z)) ids.add(above.id);
        }
      }
    return { ids, base };
  }

  /** Una pieza nueva solo se coloca si encaja con algo: nada de piezas flotando. */
  isSupported(pl: Placement, ignore?: string): boolean {
    const c = this.connections(pl, ignore);
    return c.base || c.ids.size > 0;
  }

  /** La pieza `b` tiene stud arriba en la columna (x, z). */
  private studAt(b: Brick, x: number, z: number): boolean {
    const p = part(b.part);
    return p.top[localCell(p, b.rot, x - b.x, z - b.z)];
  }

  /** La pieza `b` recibe stud abajo en la columna (x, z). */
  private socketAt(b: Brick, x: number, z: number): boolean {
    const p = part(b.part);
    return p.bottom[localCell(p, b.rot, x - b.x, z - b.z)];
  }

  add(b: Brick): void {
    if (this.bricks.has(b.id)) throw new Error(`Pieza repetida: ${b.id}`);
    this.bricks.set(b.id, b);
    this.eachCell(b, (x, y, z) => {
      this.cells.set(cellKey(x, y, z), b.id);
    });
  }

  remove(id: string): Brick | undefined {
    const b = this.bricks.get(id);
    if (!b) return undefined;
    this.eachCell(b, (x, y, z) => {
      this.cells.delete(cellKey(x, y, z));
    });
    this.bricks.delete(id);
    return b;
  }

  paint(id: string, color: number): void {
    const b = this.bricks.get(id);
    if (b) this.bricks.set(id, { ...b, color });
  }

  /**
   * Piezas que no llegan a la base por ninguna cadena de encajes. No se borran solas: la vista
   * las marca, como el chequeo de conectividad de BrickLink Studio (informar, no impedir).
   */
  floating(): Set<string> {
    const reached = new Set<string>();
    const queue: string[] = [];
    for (const b of this.bricks.values())
      if (this.connections(b).base) {
        reached.add(b.id);
        queue.push(b.id);
      }
    while (queue.length) {
      const b = this.bricks.get(queue.pop()!)!;
      for (const id of this.connections(b).ids)
        if (!reached.has(id)) {
          reached.add(id);
          queue.push(id);
        }
    }
    const out = new Set<string>();
    for (const id of this.bricks.keys()) if (!reached.has(id)) out.add(id);
    return out;
  }
}
