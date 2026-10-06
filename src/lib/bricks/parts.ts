// Catálogo de piezas del motor (fase 2 de docs/plan-construccion-3d.md). Cada pieza ocupa una
// caja de w x d studs y h placas, y declara por celda de su huella si tiene stud arriba y si
// recibe stud abajo. Con esas dos máscaras, las inclinadas (stud solo en la fila alta), las
// tejas (sin studs) y las redondas encajan con la misma regla de grilla que los ladrillos, sin
// un sistema general de conectores (investigación, sección 7.3).
//
// El `id` es lo que se serializa: nunca se reutiliza ni se cambia el de una pieza publicada.

import { PLATES_PER_BRICK } from "./units.ts";

export type PartKind = "ladrillo" | "placa" | "teja" | "inclinada" | "redonda" | "ventana";

export interface PartDef {
  id: number;
  key: string;
  kind: PartKind;
  name: string;
  /** Huella sin rotar: w en x, d en z (studs). */
  w: number;
  d: number;
  /** Alto en placas (3 = un ladrillo). */
  h: number;
  /** Stud arriba por celda, fila por fila en z y luego x: `top[k * w + i]`. */
  top: boolean[];
  /** Recibe stud abajo por celda, con el mismo orden. */
  bottom: boolean[];
}

const all = (w: number, d: number, v: boolean) => Array.from({ length: w * d }, () => v);

/** "Ladrillo redondo 2x2" → "ladrillo-redondo-2x2". */
const slug = (name: string) => name.toLowerCase().replace(/\s+/g, "-");

function box(id: number, kind: PartKind, name: string, w: number, d: number, h: number, studs = true): PartDef {
  return { id, key: slug(name), kind, name, w, d, h, top: all(w, d, studs), bottom: all(w, d, true) };
}

/**
 * Inclinada de 45°: sube hacia el fondo (z = 0). Solo la fila alta tiene studs; las demás son
 * la rampa. `d` es la profundidad de la rampa más la fila alta.
 */
function slope(id: number, w: number, d: number): PartDef {
  const top = all(w, d, false);
  for (let i = 0; i < w; i++) top[i] = true;
  const name = `Inclinada ${w}x${d}`;
  return { id, key: slug(name), kind: "inclinada", name, w, d, h: PLATES_PER_BRICK, top, bottom: all(w, d, true) };
}

export const PARTS: readonly PartDef[] = [
  box(1, "ladrillo", "Ladrillo 1x1", 1, 1, 3),
  box(2, "ladrillo", "Ladrillo 1x2", 2, 1, 3),
  box(3, "ladrillo", "Ladrillo 1x3", 3, 1, 3),
  box(4, "ladrillo", "Ladrillo 1x4", 4, 1, 3),
  box(5, "ladrillo", "Ladrillo 1x6", 6, 1, 3),
  box(6, "ladrillo", "Ladrillo 1x8", 8, 1, 3),
  box(7, "ladrillo", "Ladrillo 2x2", 2, 2, 3),
  box(8, "ladrillo", "Ladrillo 2x3", 3, 2, 3),
  box(9, "ladrillo", "Ladrillo 2x4", 4, 2, 3),
  box(10, "ladrillo", "Ladrillo 2x6", 6, 2, 3),
  box(11, "ladrillo", "Ladrillo 2x8", 8, 2, 3),
  box(20, "placa", "Placa 1x1", 1, 1, 1),
  box(21, "placa", "Placa 1x2", 2, 1, 1),
  box(22, "placa", "Placa 1x4", 4, 1, 1),
  box(23, "placa", "Placa 1x6", 6, 1, 1),
  box(24, "placa", "Placa 2x2", 2, 2, 1),
  box(25, "placa", "Placa 2x4", 4, 2, 1),
  box(26, "placa", "Placa 2x6", 6, 2, 1),
  box(27, "placa", "Placa 2x8", 8, 2, 1),
  box(28, "placa", "Placa 4x4", 4, 4, 1),
  box(29, "placa", "Placa 6x6", 6, 6, 1),
  box(30, "placa", "Placa 8x8", 8, 8, 1),
  box(40, "teja", "Teja 1x1", 1, 1, 1, false),
  box(41, "teja", "Teja 1x2", 2, 1, 1, false),
  box(42, "teja", "Teja 2x2", 2, 2, 1, false),
  box(43, "teja", "Teja 1x4", 4, 1, 1, false),
  slope(60, 1, 2),
  slope(61, 2, 2),
  slope(62, 4, 2),
  slope(63, 2, 3),
  box(80, "redonda", "Ladrillo redondo 1x1", 1, 1, 3),
  box(81, "redonda", "Placa redonda 1x1", 1, 1, 1),
  box(82, "redonda", "Ladrillo redondo 2x2", 2, 2, 3),
  box(83, "redonda", "Cilindro 2x2", 2, 2, 9),
  box(100, "ventana", "Ventana 1x2x3", 2, 1, 9),
  box(101, "ventana", "Ventana 1x4x3", 4, 1, 9),
  box(102, "ventana", "Puerta 1x4x6", 4, 1, 18),
];

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));

export function part(id: number): PartDef {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Pieza desconocida: ${id}`);
  return p;
}

export function partByKey(key: string): PartDef {
  const p = PARTS.find((x) => x.key === key);
  if (!p) throw new Error(`Pieza desconocida: ${key}`);
  return p;
}
