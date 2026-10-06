// Operaciones sobre el mundo con deshacer y rehacer (patrón command). Las mismas operaciones
// sirven después para la red y para guardar un registro de la obra (investigación, sección 7.4).

import type { Brick, BrickWorld } from "./world.ts";

export type Op =
  | { t: "add"; brick: Brick }
  | { t: "remove"; brick: Brick }
  | { t: "paint"; id: string; from: number; to: number }
  /** Varias operaciones como una sola (mover = quitar + poner). */
  | { t: "batch"; ops: Op[] };

export function invert(op: Op): Op {
  switch (op.t) {
    case "add":
      return { t: "remove", brick: op.brick };
    case "remove":
      return { t: "add", brick: op.brick };
    case "paint":
      return { t: "paint", id: op.id, from: op.to, to: op.from };
    case "batch":
      return { t: "batch", ops: op.ops.map(invert).reverse() };
  }
}

/**
 * Aplica una operación si es válida en el estado actual. Una pieza nueva no puede chocar ni
 * quedar flotando; quitar no se bloquea aunque deje piezas sueltas (la vista las marca).
 * Un lote es todo o nada.
 */
export function apply(world: BrickWorld, op: Op): boolean {
  switch (op.t) {
    case "add":
      if (world.bricks.has(op.brick.id) || world.collides(op.brick) || !world.isSupported(op.brick)) return false;
      world.add(op.brick);
      return true;
    case "remove":
      return world.remove(op.brick.id) !== undefined;
    case "paint": {
      const b = world.bricks.get(op.id);
      if (!b || b.color !== op.from) return false;
      world.paint(op.id, op.to);
      return true;
    }
    case "batch": {
      const done: Op[] = [];
      for (const o of op.ops) {
        if (!apply(world, o)) {
          for (const d of done.reverse()) apply(world, invert(d));
          return false;
        }
        done.push(o);
      }
      return true;
    }
  }
}

/** Historial ilimitado dentro de la sesión: deshacer es la red de seguridad, no un lujo. */
export class History {
  private done: Op[] = [];
  private undone: Op[] = [];
  private world: BrickWorld;

  constructor(world: BrickWorld) {
    this.world = world;
  }

  get canUndo() {
    return this.done.length > 0;
  }

  get canRedo() {
    return this.undone.length > 0;
  }

  do(op: Op): boolean {
    if (!apply(this.world, op)) return false;
    this.done.push(op);
    this.undone = [];
    return true;
  }

  /**
   * Deshace la última operación. Si ya no se puede (en equipo, alguien apoyó algo encima de lo
   * que se quiere quitar), se descarta y devuelve false para que la vista avise.
   */
  undo(): Op | null {
    const op = this.done.pop();
    if (!op) return null;
    const inv = invert(op);
    if (!apply(this.world, inv)) return null;
    this.undone.push(op);
    return inv;
  }

  redo(): Op | null {
    const op = this.undone.pop();
    if (!op) return null;
    if (!apply(this.world, op)) return null;
    this.done.push(op);
    return op;
  }
}
