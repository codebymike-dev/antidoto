// Formato binario de una obra (investigación, sección 7.7): 9 bytes por pieza. Con 2.000 piezas
// son unos 18 KB, que con deflate quedan en pocos KB para guardar en Turso.
//
// Cabecera: versión (u8), lado de la base (u8), cantidad de piezas (u32).
// Por pieza: pieza (u16), x (i16), y (i16), z (i16), rotación en 2 bits + color en 6 (u8).
// Todo en little endian. Los ids de las piezas no se guardan: se regeneran al leer.

import { BRICK_COLORS } from "./palette.ts";
import type { Brick, Rot } from "./world.ts";

export const CODEC_VERSION = 1;
const HEADER = 6;
const PER_BRICK = 9;

export interface DecodedBuild {
  base: number;
  bricks: Brick[];
}

export function encodeBuild(base: number, bricks: Iterable<Brick>): Uint8Array {
  const list = [...bricks];
  if (base < 1 || base > 255) throw new Error(`Base fuera de rango: ${base}`);
  const out = new Uint8Array(HEADER + list.length * PER_BRICK);
  const v = new DataView(out.buffer);
  v.setUint8(0, CODEC_VERSION);
  v.setUint8(1, base);
  v.setUint32(2, list.length, true);
  list.forEach((b, n) => {
    if (b.color < 0 || b.color > 63) throw new Error(`Color fuera de rango: ${b.color}`);
    const o = HEADER + n * PER_BRICK;
    v.setUint16(o, b.part, true);
    v.setInt16(o + 2, b.x, true);
    v.setInt16(o + 4, b.y, true);
    v.setInt16(o + 6, b.z, true);
    v.setUint8(o + 8, (b.rot << 6) | b.color);
  });
  return out;
}

export function decodeBuild(data: Uint8Array, idPrefix = "b"): DecodedBuild {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.byteLength < HEADER) throw new Error("Obra vacía o cortada");
  const version = v.getUint8(0);
  if (version !== CODEC_VERSION) throw new Error(`Versión de obra desconocida: ${version}`);
  const base = v.getUint8(1);
  const count = v.getUint32(2, true);
  if (data.byteLength !== HEADER + count * PER_BRICK) throw new Error("Obra cortada o con bytes de más");
  const bricks: Brick[] = [];
  for (let n = 0; n < count; n++) {
    const o = HEADER + n * PER_BRICK;
    const packed = v.getUint8(o + 8);
    const color = packed & 63;
    if (color >= BRICK_COLORS.length) throw new Error(`Color desconocido: ${color}`);
    bricks.push({
      id: `${idPrefix}${n + 1}`,
      part: v.getUint16(o, true),
      x: v.getInt16(o + 2, true),
      y: v.getInt16(o + 4, true),
      z: v.getInt16(o + 6, true),
      rot: (packed >> 6) as Rot,
      color,
    });
  }
  return { base, bricks };
}
