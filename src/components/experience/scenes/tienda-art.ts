// Arte de la estación 5 de la Ruta del café: la tienda, donde el café llega a la taza.
// La misma sala de Habbo de la trilladora, con la puerta abierta a la calle, paredes claras
// y zócalo de madera. Adentro: el mesón del fondo con el lavaplatos y la regleta, el
// estante alto con los vasos, el tablero del menú, la barra con la vitrina, la caja, la
// máquina de espresso y el molino. Todo por código.

import { CLEAR, PixelBuffer, hex, mix } from "../pixel/buffer.ts";
import * as finca from "./finca-art.ts";
import { C as T, P, drawRoom as drawShell, floorShadow, isoBox, onFront, type BoxColors, type Pt } from "./trilladora-art.ts";

export { P };
export const W = finca.W;
export const H = finca.H;

export const C = {
  ...T,
  wallStore: hex("#f4efe6"),
  wallStoreShade: hex("#ddd2c1"),
  woodStore: hex("#6b4329"),
  woodStoreDark: hex("#4e2f1c"),
  woodStoreLit: hex("#8a5a38"),
  stone: hex("#e3ddd2"),
  stoneShade: hex("#c9c1b3"),
  board: hex("#2f4a3c"),
  chalk: hex("#e8efe9"),
  chrome: hex("#d9dde0"),
  chromeDark: hex("#9aa1a6"),
  machineRed: hex("#b8412f"),
  machineRedDark: hex("#8e2f21"),
  water: hex("#8fc4dc"),
  waterLit: hex("#cfe9f4"),
  foam: hex("#f4f8fa"),
  cup: hex("#fbfaf6"),
  cupShade: hex("#d9d4ca"),
  cake: hex("#c98b5a"),
  cakeCream: hex("#f3e3c8"),
  berry: hex("#b8324a"),
  wet: hex("#b7d3de"),
  sign: hex("#f2c230"),
  plastic: hex("#f2f2ee"),
  plasticShade: hex("#cfd1cc"),
  steam: hex("#ffffff"),
};

// --- Sala ----------------------------------------------------------------------------

export function drawRoom(buf: PixelBuffer) {
  drawShell(buf, {
    door: true,
    wallLit: C.wallStore,
    wallShade: C.wallStoreShade,
    zocalo: C.woodStore,
    zocaloDark: C.woodStoreDark,
    extinguisherI: 7.6,
  });
  // Tablero del menú en la pared del fondo.
  onFront(buf, 0.03, [5.0, 7.2, 50, 72], (i, z) => {
    if (i < 5.0 || i > 7.2 || z < 50 || z > 72) return CLEAR;
    const u = (i - 5.0) * 20;
    if (u < 1.5 || u > 42.5 || z < 51.5 || z > 70.5) return C.woodStore;
    // Renglones de tiza y una taza dibujada.
    if (Math.abs(z - 66) < 0.6 && u > 6 && u < 30) return C.chalk;
    for (const row of [60, 56]) if (Math.abs(z - row) < 0.5 && u > 6 && u < 22 + (row % 7)) return mix(C.chalk, C.board, 0.3);
    if (Math.hypot((u - 35) / 3.2, (z - 58) / 3.2) < 1 && z < 60) return C.chalk;
    return C.board;
  }, C.outline);
}

// --- Mesón del fondo, lavaplatos y regleta ------------------------------------------

export const BACK = { i0: 1.0, i1: 7.4, j0: 0.08, j1: 0.8, h: 24 };
export const SINK = { i0: 1.35, i1: 2.35 };
export const STRIP = { i: 2.75, j: 0.5 };
export const SHELF = { i0: 2.6, i1: 4.7, z: 58 };

const WOOD: BoxColors = { top: C.stone, front: C.woodStore, side: C.woodStoreDark, line: C.outline };

export interface BackState {
  /** La regleta en el mesón mojado (con error) o en la pared (bien). */
  stripWet: boolean;
  /** Cuchillo sumergido en el lavaplatos. */
  knife: boolean;
  t: number;
}

export function drawBackCounter(buf: PixelBuffer, s: BackState) {
  const B = BACK;
  isoBox(buf, B.i0, B.j0, 0, B.i1 - B.i0, B.j1 - B.j0, B.h, WOOD);
  // Puertas del mueble.
  for (let k = 0; k < 6; k++) {
    const i0 = B.i0 + 0.15 + k * 1.05;
    onFront(buf, B.j1 + 0.01, [i0, i0 + 0.9, 3, B.h - 4], (i, z) => {
      if (i < i0 || i > i0 + 0.9 || z < 3 || z > B.h - 4) return CLEAR;
      if (Math.abs(i - i0 - 0.75) < 0.05 && z > 9 && z < 15) return C.chrome;
      return i - i0 < 0.05 || i0 + 0.9 - i < 0.05 || z < 3.8 || z > B.h - 4.8 ? C.woodStoreDark : C.woodStoreLit;
    });
  }
  // Lavaplatos: poceta con agua espumosa y la llave.
  const top = B.h + 0.2;
  const corners: [number, number][] = [
    [SINK.i0, B.j0 + 0.12],
    [SINK.i1, B.j0 + 0.12],
    [SINK.i1, B.j1 - 0.12],
    [SINK.i0, B.j1 - 0.12],
  ];
  buf.poly(
    corners.flatMap(([i, j]) => {
      const p = P(i, j, top);
      return [p.x, p.y];
    }),
    (x, y) => {
      const n = (Math.floor(x) * 7 + Math.floor(y) * 3 + Math.floor(s.t * 2)) % 9;
      if (n < 3) return C.foam;
      return n < 5 ? C.waterLit : C.water;
    },
  );
  for (let k = 0; k < 4; k++) {
    const a = P(corners[k][0], corners[k][1], top);
    const b = P(corners[(k + 1) % 4][0], corners[(k + 1) % 4][1], top);
    buf.line(a.x, a.y, b.x, b.y, C.chromeDark);
  }
  if (s.knife) {
    // Solo asoma el mango: la hoja está bajo la espuma.
    const k1 = P(SINK.i0 + 0.55, B.j0 + 0.45, top + 1);
    buf.rect(k1.x - 1, k1.y - 2, 5, 2, C.outline);
    buf.rect(k1.x, k1.y - 2, 3, 1, hex("#2b2320"));
    buf.px(k1.x - 2, k1.y - 1, C.chrome);
  }
  const tap = P(SINK.i0 + 0.5, B.j0 + 0.05, top);
  buf.rect(tap.x - 1, tap.y - 10, 2, 10, C.chromeDark);
  buf.rect(tap.x - 1, tap.y - 11, 6, 2, C.chrome);
  buf.px(tap.x + 4, tap.y - 9, C.water);

  // Regleta: en el mesón mojado, pegada al lavaplatos (mal) o en la pared, en alto (bien).
  const strip = s.stripWet ? P(STRIP.i, STRIP.j, top) : P(STRIP.i + 1.2, 0.02, 40);
  if (s.stripWet) {
    const pud = P(STRIP.i - 0.1, STRIP.j, top);
    buf.shadow(pud.x, pud.y, 10, 3.5, C.water, 0.7);
    for (let k = 0; k < 3; k++) buf.px(pud.x - 6 + k * 5, pud.y - 1 + (k % 2), C.waterLit);
  }
  buf.rect(strip.x - 6, strip.y - 3, 13, 5, C.outline);
  buf.rect(strip.x - 5, strip.y - 2, 11, 3, C.plastic);
  for (const dx of [-3, 0, 3]) buf.px(strip.x + dx, strip.y - 1, C.outline);
  buf.px(strip.x + 5, strip.y - 1, hex("#e3452f"));
  // Cable a la toma de la pared.
  const outlet = P(STRIP.i + 0.7, 0.02, 32);
  buf.rect(outlet.x - 2, outlet.y - 3, 5, 6, C.plastic);
  buf.line(strip.x + 6, strip.y - 1, outlet.x, outlet.y, C.outline);
  if (s.stripWet) {
    // Chispitas: el agua y la corriente no se juntan.
    if (Math.floor(s.t * 6) % 3 === 0) {
      buf.px(strip.x - 7, strip.y - 5, C.sign);
      buf.px(strip.x - 8, strip.y - 6, hex("#ffffff"));
    }
  }
}

/** Estante alto con vasos y tazas apiladas. */
export function drawShelf(buf: PixelBuffer, cupsLeft: number) {
  onFront(buf, 0.04, [SHELF.i0, SHELF.i1, SHELF.z - 3, SHELF.z], (i, z) =>
    i >= SHELF.i0 && i <= SHELF.i1 && z >= SHELF.z - 3 && z <= SHELF.z ? C.woodStore : CLEAR,
  );
  for (let k = 0; k < cupsLeft; k++) {
    const p = P(SHELF.i0 + 0.3 + k * 0.42, 0.12, SHELF.z);
    for (let n = 0; n < 3; n++) {
      buf.rect(p.x - 3, p.y - 6 - n * 5, 7, 5, C.outline);
      buf.rect(p.x - 2, p.y - 5 - n * 5, 5, 3, n % 2 ? C.cupShade : C.cup);
    }
  }
}

export function sinkCenter(): Pt {
  return P((SINK.i0 + SINK.i1) / 2, (BACK.j0 + BACK.j1) / 2, BACK.h);
}

export function stripPoint(wet: boolean): Pt {
  return wet ? P(STRIP.i, STRIP.j, BACK.h + 1) : P(STRIP.i + 1.2, 0.02, 40);
}

// --- Barra ---------------------------------------------------------------------------

export const BAR = { i0: 0.9, i1: 6.7, j0: 2.15, j1: 2.9, h: 30 };
export const ESPRESSO = { i0: 4.2, i1: 5.4, j0: 2.25, j1: 2.85, h: 22 };
export const WAND = { i: 5.47, j: 2.62, z0: 46, z1: 36 };

export interface BarState {
  t: number;
  /** Chorro de vapor de la lanceta. */
  steam: boolean;
}

/** La barra con la vitrina, la caja, la máquina y el molino encima. */
export function drawBar(buf: PixelBuffer, s: BarState) {
  const B = BAR;
  floorShadow(buf, B.i0, B.j1, B.i1 - B.i0, 0.3, 0.25);
  isoBox(buf, B.i0, B.j0, 0, B.i1 - B.i0, B.j1 - B.j0, B.h, { top: C.stone, front: C.woodStore, side: C.woodStoreDark, line: C.outline });
  // Listones de madera en el frente.
  onFront(buf, B.j1 + 0.01, [B.i0, B.i1, 2, B.h - 3], (i, z) => {
    if (i < B.i0 || i > B.i1 || z < 2 || z > B.h - 3) return CLEAR;
    return Math.floor((i - B.i0) * 5) % 2 === 0 ? C.woodStoreLit : CLEAR;
  });

  // Caja registradora.
  isoBox(buf, 1.25, 2.3, B.h, 0.55, 0.45, 8, { top: C.chromeDark, front: hex("#3b4046"), side: hex("#2b2f33"), line: C.outline });
  isoBox(buf, 1.3, 2.35, B.h + 8, 0.45, 0.1, 9, { top: C.outline, front: hex("#6fd0ea"), side: hex("#2b2f33"), line: C.outline });

  // Vitrina de postres.
  const V = { i0: 2.2, i1: 3.7 };
  isoBox(buf, V.i0, B.j0 + 0.05, B.h, V.i1 - V.i0, B.j1 - B.j0 - 0.1, 3, { top: C.stoneShade, front: C.chromeDark, side: C.chromeDark });
  for (let k = 0; k < 3; k++) {
    const c = P(V.i0 + 0.3 + k * 0.45, B.j0 + 0.4, B.h + 3);
    buf.rect(c.x - 5, c.y - 6, 10, 6, C.outline);
    buf.rect(c.x - 4, c.y - 5, 8, 2, C.cakeCream);
    buf.rect(c.x - 4, c.y - 3, 8, 2, C.cake);
    buf.px(c.x, c.y - 6, C.berry);
  }
  onFront(buf, B.j1 - 0.05, [V.i0, V.i1, B.h + 3, B.h + 16], (i, z) => {
    if (i < V.i0 || i > V.i1 || z < B.h + 3 || z > B.h + 16) return CLEAR;
    const u = (i - V.i0) * 20;
    if (u < 1 || u > 29 || z > B.h + 15) return C.chromeDark;
    return (Math.floor(u) + Math.floor(z)) % 11 === 0 ? C.glassLit : CLEAR;
  });
  const vt = [P(V.i0, B.j1 - 0.05, B.h + 16), P(V.i1, B.j1 - 0.05, B.h + 16), P(V.i1, B.j0 + 0.05, B.h + 16), P(V.i0, B.j0 + 0.05, B.h + 16)];
  for (let k = 0; k < 4; k++) buf.line(vt[k].x, vt[k].y, vt[(k + 1) % 4].x, vt[(k + 1) % 4].y, C.chromeDark);

  // Máquina de espresso: cuerpo rojo, frente de cromo, grupos y bandeja.
  const E = ESPRESSO;
  isoBox(buf, E.i0, E.j0, B.h, E.i1 - E.i0, E.j1 - E.j0, E.h, { top: C.chrome, front: C.machineRed, side: C.machineRedDark, line: C.outline });
  isoBox(buf, E.i0 + 0.1, E.j0 + 0.05, B.h + E.h, E.i1 - E.i0 - 0.2, E.j1 - E.j0 - 0.1, 3, { top: C.cup, front: C.chromeDark, side: C.chromeDark });
  for (const gi of [E.i0 + 0.3, E.i0 + 0.8]) {
    isoBox(buf, gi, E.j1, B.h + 8, 0.2, 0.15, 5, { top: C.chrome, front: C.chromeDark, side: C.chromeDark, line: C.outline });
    const cup = P(gi + 0.1, E.j1 + 0.1, B.h + 1);
    buf.rect(cup.x - 2, cup.y - 4, 5, 4, C.outline);
    buf.rect(cup.x - 1, cup.y - 3, 3, 2, C.cup);
  }
  // Lanceta de vapor al costado.
  const w0 = P(WAND.i, WAND.j, WAND.z0);
  const w1 = P(WAND.i + 0.08, WAND.j + 0.1, WAND.z1);
  buf.line(w0.x, w0.y, w1.x, w1.y, C.chromeDark);
  buf.line(w0.x + 1, w0.y, w1.x + 1, w1.y, C.chrome);
  buf.rect(w0.x - 1, w0.y - 2, 4, 3, C.outline);

  // Molino de café.
  isoBox(buf, 5.75, 2.35, B.h, 0.4, 0.4, 12, { top: C.outline, front: hex("#3b4046"), side: hex("#2b2f33"), line: C.outline });
  isoBox(buf, 5.8, 2.4, B.h + 12, 0.3, 0.3, 8, { top: hex("#3b2014"), front: mix(C.glass, hex("#5a3421"), 0.5), side: mix(C.glass, hex("#3b2014"), 0.5), line: C.outline });

  if (s.steam) drawSteam(buf, s.t);
}

/** Punta de la lanceta (de donde sale el vapor). */
export function wandTip(): Pt {
  return P(WAND.i + 0.08, WAND.j + 0.1, WAND.z1);
}

function drawSteam(buf: PixelBuffer, t: number) {
  const tip = wandTip();
  for (let k = 0; k < 10; k++) {
    const u = ((k / 10 + t * 1.8) % 1 + 1) % 1;
    const x = tip.x + Math.sin(k * 2.3 + t * 6) * (1 + u * 4);
    const y = tip.y + 2 + u * 12;
    const r = 1 + u * 2.2;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) buf.blend(x + dx, y + dy, C.steam, 0.75 * (1 - u * 0.6));
  }
}

// --- Piso, trapero, aviso, silla y escalera ------------------------------------------

export const WET = [
  [4.2, 4.6, 0.9],
  [5.4, 5.3, 0.8],
  [3.2, 5.6, 0.7],
] as const;

/** Charcos brillantes del piso recién trapeado. */
export function drawWetFloor(buf: PixelBuffer, t: number) {
  for (const [i, j, r] of WET) {
    const c = P(i, j, 0);
    buf.shadow(c.x, c.y, r * 26, r * 12, C.wet, 0.55);
    const glint = Math.floor(t * 2 + i) % 3;
    buf.span(c.y - 2 + glint, c.x - r * 10, c.x - r * 4, hex("#ffffff"));
  }
}

export function wetCenter(): Pt {
  return P(4.4, 5.1, 0);
}

/** Aviso amarillo de "piso mojado" (versión correcta). */
export function drawWetSign(buf: PixelBuffer, i: number, j: number) {
  const p = P(i, j, 0);
  buf.shadow(p.x, p.y, 7, 2, C.shadow, 0.3);
  buf.poly([p.x - 6, p.y, p.x - 1, p.y - 20, p.x + 1, p.y - 20, p.x + 6, p.y], C.sign);
  buf.line(p.x - 6, p.y, p.x - 1, p.y - 20, C.outline);
  buf.line(p.x + 6, p.y, p.x + 1, p.y - 20, C.outline);
  buf.line(p.x - 1, p.y - 20, p.x + 1, p.y - 20, C.outline);
  // Muñequito que se resbala.
  buf.px(p.x, p.y - 15, C.outline);
  buf.line(p.x, p.y - 14, p.x - 2, p.y - 9, C.outline);
  buf.line(p.x - 2, p.y - 9, p.x + 2, p.y - 6, C.outline);
  buf.line(p.x - 1, p.y - 12, p.x + 2, p.y - 12, C.outline);
}

export function drawBucket(buf: PixelBuffer, i: number, j: number) {
  const p = P(i, j, 0);
  buf.shadow(p.x, p.y, 7, 2.5, C.shadow, 0.3);
  buf.implicit(p.x - 7, p.y - 12, p.x + 7, p.y + 3, (x, y) => {
    const u = (x - p.x) / (6 - (p.y - y) * -0.05);
    if (Math.abs(u) > 1) return CLEAR;
    const top = p.y - 10;
    const e = ((x - p.x) / 6.5) ** 2 + ((y - top) / 2.4) ** 2;
    if (e <= 1) return e < 0.6 ? C.water : C.sign;
    if (y < top || y > p.y + Math.sqrt(Math.max(0, 1 - u * u)) * 2) return CLEAR;
    return u > 0.4 ? C.yellowDark : C.sign;
  }, C.outline);
}

/** Trapero en las manos: palo desde la mano hasta el piso, con la mecha. */
export function drawMop(buf: PixelBuffer, hand: Pt, floor: Pt) {
  buf.line(hand.x, hand.y - 6, floor.x, floor.y - 3, C.woodStore);
  buf.line(hand.x + 1, hand.y - 6, floor.x + 1, floor.y - 3, C.woodStoreLit);
  for (let k = -4; k <= 4; k++) buf.line(floor.x, floor.y - 4, floor.x + k * 1.2, floor.y + 1, k % 2 ? C.plastic : C.plasticShade);
}

/** Silla plástica (para pararse encima: el error). */
export function drawChair(buf: PixelBuffer, i: number, j: number): number {
  const seat = 16;
  const c: BoxColors = { top: C.plastic, front: C.plasticShade, side: C.plasticShade, line: C.outline };
  for (const [li, lj] of [
    [i, j],
    [i + 0.5, j],
    [i, j + 0.5],
    [i + 0.5, j + 0.5],
  ] as [number, number][]) {
    const a = P(li, lj, 0);
    const b = P(li, lj, seat);
    buf.rect(a.x - 1, b.y, 2, a.y - b.y, C.plasticShade);
  }
  isoBox(buf, i - 0.05, j - 0.05, seat, 0.6, 0.6, 2, c);
  isoBox(buf, i - 0.05, j - 0.05, seat + 2, 0.08, 0.6, 14, c);
  return seat + 2;
}

/** Escalera de tijera (versión correcta). */
export function drawLadder(buf: PixelBuffer, i: number, j: number): number {
  const top = 22;
  const rail = (ai: number, aj: number, bi: number, bj: number) => {
    const a = P(ai, aj, 0);
    const b = P(bi, bj, top);
    buf.line(a.x, a.y, b.x, b.y, C.chromeDark);
    buf.line(a.x + 1, a.y, b.x + 1, b.y, C.chrome);
  };
  rail(i, j + 0.35, i + 0.2, j + 0.1);
  rail(i + 0.5, j + 0.35, i + 0.3, j + 0.1);
  rail(i, j - 0.15, i + 0.2, j + 0.1);
  for (const h of [7, 14]) {
    const a = P(i + 0.06, j + 0.28, h);
    const b = P(i + 0.44, j + 0.28, h);
    buf.line(a.x, a.y, b.x, b.y, C.chrome);
  }
  isoBox(buf, i + 0.12, j - 0.02, top, 0.3, 0.28, 2, { top: C.chrome, front: C.chromeDark, side: C.chromeDark, line: C.outline });
  return top + 2;
}

/** Estallido rojo de enojo sobre el cliente que grita. */
export function drawAngry(buf: PixelBuffer, x: number, y: number, t: number) {
  if (Math.floor(t * 3) % 2 === 0) y -= 1;
  buf.rect(x - 6, y - 7, 13, 9, C.outline);
  buf.rect(x - 5, y - 6, 11, 7, hex("#ffffff"));
  buf.px(x - 1, y - 4, hex("#d23b33"));
  buf.px(x - 1, y - 3, hex("#d23b33"));
  buf.px(x - 1, y - 1, hex("#d23b33"));
  buf.px(x + 2, y - 4, hex("#d23b33"));
  buf.px(x + 2, y - 3, hex("#d23b33"));
  buf.px(x + 2, y - 1, hex("#d23b33"));
  buf.px(x - 3, y + 2, C.outline);
  buf.px(x - 4, y + 3, C.outline);
}

