// Modelos de prueba para el banco de render (fase 1 del plan). Genera una ciudad de
// edificios con muros trabados, ventanas de cristal y techos de placas hasta llegar a la
// cantidad de ladrillos pedida. Es determinista: la misma cantidad da siempre la misma ciudad,
// así las mediciones de distintos celulares son comparables.

import { seededRandom } from "../split-flap.ts";
import { colorIndex } from "./palette.ts";
import { PLATES_PER_BRICK } from "./units.ts";

export interface LabBrick {
  /** Huella en studs ya orientada (x, z) y alto en placas. */
  w: number;
  d: number;
  h: number;
  x: number;
  y: number;
  z: number;
  color: number;
}

export interface LabModel {
  bricks: LabBrick[];
  /** Lado de la base en studs (cuadrada, con la esquina en 0,0). */
  base: number;
}

const WALLS = ["Blanco Nube", "Arena Caribe", "Gris Neblina", "Celeste Antídoto", "Girasol", "Guayaba", "Musgo Andino", "Rojo Volcán", "Azul Antídoto", "Mandarina"].map(colorIndex);
const ROOFS = ["Noche", "Abismo Antídoto", "Café Tinto", "Gris Asfalto", "Verde Cafetal", "Oro Muisca"].map(colorIndex);
const GLASS = [colorIndex("Cristal"), colorIndex("Cristal Celeste")];

const SLOT_W = 10;
const SLOT_D = 9;

/** Parte una fila de `len` studs en piezas de 4, 2 y 1; `offset` empieza con un 2 para trabar. */
function segments(len: number, offset: boolean): number[] {
  const out: number[] = [];
  let left = len;
  if (offset && left >= 2) {
    out.push(2);
    left -= 2;
  }
  while (left >= 4) {
    out.push(4);
    left -= 4;
  }
  if (left >= 2) {
    out.push(2);
    left -= 2;
  }
  if (left === 1) out.push(1);
  return out;
}

function building(ox: number, oz: number, W: number, D: number, layers: number, rnd: () => number, out: LabBrick[], limit: number) {
  const wall = WALLS[Math.floor(rnd() * WALLS.length)];
  const roof = ROOFS[Math.floor(rnd() * ROOFS.length)];
  const glass = GLASS[Math.floor(rnd() * GLASS.length)];
  const push = (b: LabBrick) => {
    if (out.length < limit) out.push(b);
  };

  for (let layer = 0; layer < layers; layer++) {
    const y = layer * PLATES_PER_BRICK;
    const odd = layer % 2 === 1;
    // Ventanas en las capas 2 y 3 de cada tres pisos.
    const windowRow = layer % 4 === 1 || layer % 4 === 2;
    // Capa par: las filas en x cubren las esquinas. Capa impar: las columnas en z.
    const rowStart = odd ? ox + 1 : ox;
    const rowLen = odd ? W - 2 : W;
    const colStart = odd ? oz : oz + 1;
    const colLen = odd ? D : D - 2;

    for (const z of [oz, oz + D - 1]) {
      let x = rowStart;
      segments(rowLen, odd).forEach((len, i, all) => {
        const isGlass = windowRow && len === 2 && i > 0 && i < all.length - 1;
        push({ w: len, d: 1, h: PLATES_PER_BRICK, x, y, z, color: isGlass ? glass : wall });
        x += len;
      });
    }
    for (const x of [ox, ox + W - 1]) {
      let z = colStart;
      segments(colLen, !odd).forEach((len, i, all) => {
        const isGlass = windowRow && len === 2 && i > 0 && i < all.length - 1;
        push({ w: 1, d: len, h: PLATES_PER_BRICK, x, y, z, color: isGlass ? glass : wall });
        z += len;
      });
    }
  }

  // Techo de placas 2xW que van de muro a muro, así ninguna queda colgando del aire.
  const y = layers * PLATES_PER_BRICK;
  for (let z = oz; z < oz + D; z += 2) {
    push({ w: W, d: Math.min(2, oz + D - z), h: 1, x: ox, y, z, color: roof });
  }
}

export function labModel(count: number): LabModel {
  const rnd = seededRandom(count);
  const bricks: LabBrick[] = [];
  // Unos 110 ladrillos por edificio en promedio: se reserva una rejilla con margen.
  const side = Math.max(2, Math.ceil(Math.sqrt(count / 60)));
  const order: [number, number][] = [];
  for (let i = 0; i < side; i++) for (let k = 0; k < side; k++) order.push([i, k]);
  // Del centro hacia afuera, para que con pocos ladrillos la ciudad quede centrada.
  const mid = (side - 1) / 2;
  order.sort((a, b) => Math.hypot(a[0] - mid, a[1] - mid) - Math.hypot(b[0] - mid, b[1] - mid));

  for (const [i, k] of order) {
    if (bricks.length >= count) break;
    // Ancho par (6 u 8): el techo usa placas 2x6 y 2x8, que existen.
    const W = rnd() < 0.5 ? 6 : 8;
    const D = 5 + Math.floor(rnd() * 3);
    const layers = 4 + Math.floor(rnd() * 9);
    building(1 + i * SLOT_W, 1 + k * SLOT_D, W, D, layers, rnd, bricks, count);
  }
  return { bricks, base: Math.max(side * SLOT_W, side * SLOT_D) + 2 };
}
