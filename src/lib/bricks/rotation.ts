// Giro de una pieza para dibujarla, idéntico al que usa el motor para leer sus máscaras
// (`localCell` en world.ts). Con piezas que no son simétricas, como las inclinadas, si el dibujo
// y el motor giraran distinto los studs quedarían de un lado y la rampa del otro. El test de
// engine.test.mts lo vigila.
//
// La pieza gira dentro de su caja con la esquina mínima fija: un punto (x, z) de la pieza sin
// rotar pasa a `angle` radianes alrededor del eje vertical más un corrimiento.

import type { PartDef } from "./parts.ts";
import type { Rot } from "./world.ts";

export interface PartTransform {
  /** Ángulo alrededor de y, en radianes (convención de three: x' = x·cos + z·sin). */
  angle: number;
  dx: number;
  dz: number;
}

export function partTransform(p: PartDef, rot: Rot): PartTransform {
  switch (rot) {
    case 0:
      return { angle: 0, dx: 0, dz: 0 };
    case 1:
      return { angle: -Math.PI / 2, dx: p.d, dz: 0 };
    case 2:
      return { angle: Math.PI, dx: p.w, dz: p.d };
    default:
      return { angle: Math.PI / 2, dx: 0, dz: p.w };
  }
}

/** Aplica el giro a un punto de la pieza sin rotar (para los tests y para quien no use three). */
export function rotatePoint(t: PartTransform, x: number, z: number): [number, number] {
  const c = Math.round(Math.cos(t.angle));
  const s = Math.round(Math.sin(t.angle));
  return [x * c + z * s + t.dx, -x * s + z * c + t.dz];
}
