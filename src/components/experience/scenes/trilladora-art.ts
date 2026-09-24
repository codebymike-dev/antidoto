// Arte de la estación 3 de la Ruta del café: la bodega de una trilladora, dibujada como
// una sala de Habbo (piso de baldosas, dos paredes, flotando sobre fondo oscuro). Adentro:
// la trilladora con su tolva, la correa y las poleas, el tablero eléctrico, el arrume de
// sacos de café verde, la puerta de cargue y un montacargas. Todo por código.

import { CLEAR, PixelBuffer, hex, mix, seeded, type Color } from "../pixel/buffer.ts";
import * as finca from "./finca-art.ts";

export const W = finca.W;
export const H = finca.H;

// --- Proyección ----------------------------------------------------------------

/** Baldosas de 40x20, como la finca. i crece hacia abajo a la derecha, j hacia abajo a la izquierda. */
export const X0 = 190;
export const Y0 = 90;
export const ROOM_I = 8;
export const ROOM_J = 7;
export const WALL = 80;

export interface Pt {
  x: number;
  y: number;
}

export function P(i: number, j: number, z = 0): Pt {
  return { x: X0 + (i - j) * 20, y: Y0 + (i + j) * 10 - z };
}

export const C = {
  ...finca.C,
  void: hex("#0f181d"),
  voidLight: hex("#16303b"),
  wallLit: hex("#ece6d8"),
  wallShade: hex("#d2cab8"),
  wallTop: hex("#f7f3ea"),
  wallLine: hex("#9c917b"),
  zocalo: hex("#2f7d4a"),
  zocaloDark: hex("#23613a"),
  floor: hex("#b9bab4"),
  floorAlt: hex("#b0b1ab"),
  floorLine: hex("#9fa09a"),
  floorSide: hex("#6f716c"),
  floorSideDark: hex("#595b57"),
  stain: hex("#a5a097"),
  yellow: hex("#f2c230"),
  yellowDark: hex("#c89a17"),
  machine: hex("#5d8a6c"),
  machineLit: hex("#76a585"),
  machineDark: hex("#44684f"),
  steel: hex("#9aa3a8"),
  steelDark: hex("#6e777c"),
  steelLit: hex("#c7ced1"),
  belt: hex("#23201f"),
  beltMark: hex("#6b6560"),
  pergamino: hex("#d9c38e"),
  pergaminoDark: hex("#b8a06a"),
  green: hex("#9fb07a"),
  panel: hex("#b9c1c5"),
  panelDark: hex("#8c969b"),
  red: hex("#d23b33"),
  redDark: hex("#9c2019"),
  lamp: hex("#6ee07a"),
  lampOff: hex("#2e5a35"),
  glass: hex("#a9d8ee"),
  glassLit: hex("#d9f1fa"),
  frame: hex("#5a5f63"),
  lift: hex("#f2b632"),
  liftLit: hex("#f8cd5c"),
  liftDark: hex("#c98a14"),
  liftLine: hex("#6b4a08"),
  tire: hex("#26262a"),
  wood: hex("#a8763f"),
  woodDark: hex("#7d552a"),
  dust: hex("#7a6f55"),
};

type P3 = [number, number, number];

function quad(buf: PixelBuffer, pts: P3[], c: Color | ((x: number, y: number) => Color)) {
  buf.poly(
    pts.flatMap(([i, j, z]) => {
      const p = P(i, j, z);
      return [p.x, p.y];
    }),
    c,
  );
}

function edge(buf: PixelBuffer, a: P3, b: P3, c: Color) {
  const pa = P(...a);
  const pb = P(...b);
  buf.line(pa.x, pa.y, pb.x, pb.y, c);
}

export interface BoxColors {
  top: Color;
  /** Cara +j (mira abajo a la izquierda, de frente a la luz). */
  front: Color;
  /** Cara +i (mira abajo a la derecha, en sombra). */
  side: Color;
  line?: Color;
}

export function isoBox(buf: PixelBuffer, i: number, j: number, z: number, di: number, dj: number, dz: number, c: BoxColors) {
  const i1 = i + di;
  const j1 = j + dj;
  const z1 = z + dz;
  quad(
    buf,
    [
      [i1, j, z],
      [i1, j1, z],
      [i1, j1, z1],
      [i1, j, z1],
    ],
    c.side,
  );
  quad(
    buf,
    [
      [i, j1, z],
      [i1, j1, z],
      [i1, j1, z1],
      [i, j1, z1],
    ],
    c.front,
  );
  quad(
    buf,
    [
      [i, j, z1],
      [i1, j, z1],
      [i1, j1, z1],
      [i, j1, z1],
    ],
    c.top,
  );
  if (c.line) {
    const l = c.line;
    edge(buf, [i, j, z1], [i1, j, z1], l);
    edge(buf, [i, j, z1], [i, j1, z1], l);
    edge(buf, [i1, j, z1], [i1, j, z], l);
    edge(buf, [i, j1, z1], [i, j1, z], l);
    edge(buf, [i1, j, z], [i1, j1, z], l);
    edge(buf, [i, j1, z], [i1, j1, z], l);
    edge(buf, [i1, j1, z], [i1, j1, z1], mix(l, c.side, 0.5));
  }
}

/** Forma sobre el plano j = constante (cara que mira abajo a la izquierda), en coordenadas (i, z). */
export function onFront(buf: PixelBuffer, jp: number, bounds: [number, number, number, number], fn: (i: number, z: number) => Color, outline: Color = CLEAR) {
  const [i0, i1, z0, z1] = bounds;
  const pts = [P(i0, jp, z0), P(i1, jp, z0), P(i0, jp, z1), P(i1, jp, z1)];
  buf.implicit(
    Math.min(...pts.map((p) => p.x)),
    Math.min(...pts.map((p) => p.y)),
    Math.max(...pts.map((p) => p.x)),
    Math.max(...pts.map((p) => p.y)),
    (x, y) => {
      const i = jp + (x - X0) / 20;
      const z = Y0 + (i + jp) * 10 - y;
      return fn(i, z);
    },
    outline,
  );
}

/** Forma sobre el plano i = constante (cara que mira abajo a la derecha), en coordenadas (j, z). */
export function onSide(buf: PixelBuffer, ip: number, bounds: [number, number, number, number], fn: (j: number, z: number) => Color, outline: Color = CLEAR) {
  const [j0, j1, z0, z1] = bounds;
  const pts = [P(ip, j0, z0), P(ip, j1, z0), P(ip, j0, z1), P(ip, j1, z1)];
  buf.implicit(
    Math.min(...pts.map((p) => p.x)),
    Math.min(...pts.map((p) => p.y)),
    Math.max(...pts.map((p) => p.x)),
    Math.max(...pts.map((p) => p.y)),
    (x, y) => {
      const j = ip - (x - X0) / 20;
      const z = Y0 + (ip + j) * 10 - y;
      return fn(j, z);
    },
    outline,
  );
}

export function floorShadow(buf: PixelBuffer, i: number, j: number, di: number, dj: number, alpha = 0.28) {
  quad(
    buf,
    [
      [i, j, 0],
      [i + di, j, 0],
      [i + di, j + dj, 0],
      [i, j + dj, 0],
    ],
    (x, y) => {
      const under = buf.get(x, y);
      return under ? mix(under, C.shadow, alpha) : CLEAR;
    },
  );
}

// --- La sala -------------------------------------------------------------------------

/** Puerta de cargue en la pared izquierda (plano i = 0). */
export const DOOR = { j0: 3.9, j1: 6.3, h: 56 };

/**
 * Fondo oscuro, paredes con ventanas altas, zócalo, puerta de cargue abierta a la luz del
 * día, extintor y piso de baldosas de concreto con su espesor.
 */
export function drawRoom(buf: PixelBuffer) {
  const rnd = seeded(21);
  // Fondo: como en Habbo, la sala flota sobre un fondo oscuro (con el azul de la marca).
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = y / H;
      buf.px(x, y, (x + y) % 2 === 0 && t > 0.5 ? C.voidLight : mix(C.void, C.voidLight, t * 0.6));
    }
  }
  for (let k = 0; k < 40; k++) buf.px(rnd() * W, rnd() * H * 0.7, hex("#2a4a57"));

  // Espesor del piso: se ve por los dos lados de adelante.
  const T = 8;
  quad(
    buf,
    [
      [0, ROOM_J, 0],
      [ROOM_I, ROOM_J, 0],
      [ROOM_I, ROOM_J, -T],
      [0, ROOM_J, -T],
    ],
    C.floorSide,
  );
  quad(
    buf,
    [
      [ROOM_I, 0, 0],
      [ROOM_I, ROOM_J, 0],
      [ROOM_I, ROOM_J, -T],
      [ROOM_I, 0, -T],
    ],
    C.floorSideDark,
  );

  // Baldosas de concreto con juntas y alguna mancha.
  quad(
    buf,
    [
      [0, 0, 0],
      [ROOM_I, 0, 0],
      [ROOM_I, ROOM_J, 0],
      [0, ROOM_J, 0],
    ],
    (x, y) => {
      const j = ((x - X0) / 20 - (y - Y0) / 10) / -2;
      const i = (y - Y0) / 10 - j;
      const fi = i - Math.floor(i);
      const fj = j - Math.floor(j);
      if (fi < 0.04 || fj < 0.06) return C.floorLine;
      const alt = (Math.floor(i) + Math.floor(j)) % 2 === 0;
      const n = (Math.imul(Math.floor(x), 73856093) ^ Math.imul(Math.floor(y), 19349663)) >>> 0;
      if (n % 97 === 0) return C.stain;
      return alt ? C.floor : C.floorAlt;
    },
  );
  for (const [si, sj, r] of [
    [4.4, 3.6, 7],
    [1.6, 5.2, 5],
    [6.6, 5.6, 6],
  ]) {
    const c = P(si, sj);
    buf.shadow(c.x, c.y, r, r * 0.45, C.stain, 0.35);
  }

  // Pared derecha (plano j = 0), en sombra.
  onFront(buf, 0, [0, ROOM_I, 0, WALL], (i, z) => {
    if (i < 0 || i > ROOM_I || z < 0 || z > WALL) return CLEAR;
    if (z < 10) return z > 8.6 ? C.zocaloDark : C.zocalo;
    // Ventanas altas.
    for (const w0 of [0.8, 2.4]) {
      if (i > w0 && i < w0 + 1.1 && z > 50 && z < 70) {
        if (i < w0 + 0.08 || i > w0 + 1.02 || z < 51.5 || z > 68.5 || Math.abs(i - w0 - 0.55) < 0.05) return C.frame;
        return z > 64 || (i - w0) * 20 + (70 - z) < 8 ? C.glassLit : C.glass;
      }
    }
    return Math.floor(z) % 16 === 0 ? mix(C.wallShade, C.wallLine, 0.3) : C.wallShade;
  });
  // Pared izquierda (plano i = 0), iluminada, con la puerta de cargue.
  onSide(buf, 0, [0, ROOM_J, 0, WALL], (j, z) => {
    if (j < 0 || j > ROOM_J || z < 0 || z > WALL) return CLEAR;
    const inDoor = j > DOOR.j0 && j < DOOR.j1 && z < DOOR.h;
    if (inDoor) {
      // Afuera: patio iluminado y cielo, con la cortina metálica medio subida.
      if (z > DOOR.h - 12) return Math.floor(z) % 3 === 0 ? C.steelDark : C.steel;
      if (z < 14) return (Math.floor(j * 7) + Math.floor(z)) % 5 === 0 ? mix(C.grass, C.grassDark, 0.5) : C.grass;
      return z > 30 ? mix(C.glassLit, hex("#ffffff"), 0.3) : mix(hex("#bfe3f2"), C.glassLit, (z - 14) / 16);
    }
    if (j > DOOR.j0 - 0.12 && j < DOOR.j1 + 0.12 && z < DOOR.h + 2) return C.yellowDark;
    if (z < 10) return z > 8.6 ? C.zocaloDark : C.zocalo;
    if (j > 1.2 && j < 2.8 && z > 50 && z < 70) {
      if (j < 1.28 || j > 2.72 || z < 51.5 || z > 68.5 || Math.abs(j - 2) < 0.05) return C.frame;
      return z > 64 ? C.glassLit : C.glass;
    }
    return Math.floor(z) % 16 === 0 ? mix(C.wallLit, C.wallLine, 0.25) : C.wallLit;
  });
  // Filo de arriba de las paredes.
  const top = (a: P3, b: P3) => edge(buf, a, b, C.wallTop);
  top([0, 0, WALL], [ROOM_I, 0, WALL]);
  top([0, 0, WALL], [0, ROOM_J, WALL]);
  edge(buf, [0, ROOM_J, 0], [0, ROOM_J, WALL], C.wallLine);
  edge(buf, [ROOM_I, 0, 0], [ROOM_I, 0, WALL], C.wallLine);
  edge(buf, [0, 0, 0], [0, 0, WALL], mix(C.wallShade, C.wallLine, 0.5));

  // Extintor en la pared derecha, a la vista.
  const ext = P(2.1, 0.02, 14);
  buf.rect(ext.x - 2, ext.y - 18, 5, 18, C.red);
  buf.rect(ext.x + 1, ext.y - 18, 2, 18, C.redDark);
  buf.rect(ext.x - 1, ext.y - 21, 3, 3, C.belt);
  buf.line(ext.x + 2, ext.y - 20, ext.x + 5, ext.y - 16, C.belt);
  buf.rect(ext.x - 4, ext.y - 30, 9, 6, C.red);
  buf.px(ext.x, ext.y - 28, hex("#ffffff"));
}

/** Franjas amarillas: carril del montacargas y zona de almacenamiento (versión correcta). */
export function drawFloorLines(buf: PixelBuffer) {
  const lane = (j: number) =>
    quad(
      buf,
      [
        [0, j - 0.06, 0.2],
        [ROOM_I, j - 0.06, 0.2],
        [ROOM_I, j + 0.06, 0.2],
        [0, j + 0.06, 0.2],
      ],
      C.yellow,
    );
  lane(4.55);
  lane(6.45);
  // Paso peatonal: cebra amarilla que cruza el carril.
  for (let k = 0; k < 5; k++) {
    const i0 = 5.9 + k * 0.0;
    const j0 = 4.7 + k * 0.36;
    quad(
      buf,
      [
        [i0, j0, 0.2],
        [i0 + 0.9, j0, 0.2],
        [i0 + 0.9, j0 + 0.18, 0.2],
        [i0, j0 + 0.18, 0.2],
      ],
      C.yellow,
    );
  }
  // Recuadro del almacenamiento alrededor del arrume.
  const box: P3[] = [
    [0.15, 0.25, 0.2],
    [2.9, 0.25, 0.2],
    [2.9, 3.35, 0.2],
    [0.15, 3.35, 0.2],
  ];
  for (let k = 0; k < 4; k++) {
    const a = box[k];
    const b = box[(k + 1) % 4];
    edge(buf, a, b, C.yellow);
    edge(buf, [a[0], a[1], 0.8], [b[0], b[1], 0.8], C.yellowDark);
  }
}

// --- Arrume de sacos ---------------------------------------------------------------

/** Saco de café verde de 70 kg, acostado, centrado en (i, j) a la altura z. */
export function drawBag(buf: PixelBuffer, i: number, j: number, z: number, scale = 1.15) {
  const c = P(i, j, z);
  finca.drawSack(buf, c.x, c.y + 3, 0.95 * scale, true);
}

/**
 * El arrume del rincón. Mal: nueve camadas, cada una corrida y sin esquineros (se ladea).
 * Bien: cinco camadas derechas sobre una estiba, con esquineros amarrados.
 */
export function drawArrume(buf: PixelBuffer, good: boolean, wobble = 0) {
  const layers = good ? 4 : 7;
  const base = good ? 5 : 0;
  floorShadow(buf, 0.3, 0.5, 2.5, 2.8, 0.3);
  if (good) {
    // Estiba de madera.
    isoBox(buf, 0.35, 0.55, 0, 2.3, 2.6, 5, { top: C.wood, front: C.woodDark, side: C.woodDark, line: C.outline });
    for (const jj of [1.2, 2.0, 2.8])
      edge(buf, [0.35, jj, 5.1], [2.65, jj, 5.1], C.woodDark);
  }
  const spots: [number, number][] = [
    [1.05, 1.05],
    [1.95, 1.05],
    [1.05, 1.9],
    [1.95, 1.9],
    [1.05, 2.75],
    [1.95, 2.75],
  ];
  for (let l = 0; l < layers; l++) {
    // Sin estiba ni esquineros cada camada queda corrida hacia la vía: la pila se ladea.
    const lean = good ? 0 : l * l * 0.02 + Math.sin(wobble) * l * 0.012;
    // Camadas trabadas: cada una corrida medio saco respecto a la de abajo.
    const shift = l % 2 === 0 ? 0 : 0.12;
    for (const [si, sj] of spots) drawBag(buf, si + lean * 0.6 + shift, sj + lean, base + l * 10, 1.5);
  }
  if (!good) {
    // Uno suelto arriba, a punto de caer.
    drawBag(buf, 1.9 + 0.6, 2.3 + 1.0, base + layers * 10 - 1, 1.5);
  } else {
    // Esquineros de madera amarrados con manila.
    for (const [ci, cj] of [
      [0.45, 3.0],
      [2.6, 3.0],
      [2.6, 0.65],
    ] as [number, number][]) {
      const a = P(ci, cj, 0);
      const b = P(ci, cj, base + layers * 10 + 4);
      buf.rect(a.x - 1, b.y, 3, a.y - b.y, C.woodDark);
      buf.rect(a.x - 1, b.y, 1, a.y - b.y, C.wood);
    }
    for (const h of [14, 34]) {
      edge(buf, [0.45, 3.0, h], [2.6, 3.0, h], C.rope);
      edge(buf, [2.6, 3.0, h], [2.6, 0.65, h], C.rope);
    }
  }
}

/** Altura del arrume (para las zonas). */
export function arrumeTop(good: boolean) {
  return good ? 5 + 4 * 10 : 7 * 10;
}

// --- La trilladora -----------------------------------------------------------------

export const MACHINE = { i0: 3.1, i1: 5.9, j0: 0.12, j1: 1.5, h: 54 };
export const MOTOR = { i0: 6.15, i1: 7.0, j0: 0.35, j1: 1.5, h: 18 };
export const PULLEY_BIG = { i: 5.35, z: 38, r: 8.5 };
export const PULLEY_SMALL = { i: 6.6, z: 10, r: 4 };
export const SPOUT = { i: 3.9, z: 20 };
export const PANEL = { i0: 7.15, i1: 7.75, z0: 26, z1: 52 };

const MACH: BoxColors = { top: C.machineLit, front: C.machine, side: C.machineDark, line: C.outline };
const STEEL: BoxColors = { top: C.steelLit, front: C.steel, side: C.steelDark, line: C.outline };

export interface MachineState {
  running: boolean;
  t: number;
  guard: boolean;
  jammed: boolean;
}

/** Punto de la correa (para las zonas). */
export function beltCenter(): Pt {
  const a = P(PULLEY_BIG.i, MACHINE.j1 + 0.05, PULLEY_BIG.z);
  const b = P(PULLEY_SMALL.i, MACHINE.j1 + 0.05, PULLEY_SMALL.z);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function drawMachine(buf: PixelBuffer, s: MachineState) {
  const M = MACHINE;
  const shake = s.running && Math.floor(s.t * 20) % 2 === 0 ? 1 : 0;
  floorShadow(buf, M.i0 - 0.1, M.j0, M.i1 - M.i0 + 1.9, M.j1 - M.j0 + 0.3, 0.3);

  // Motor eléctrico al lado, con aletas.
  isoBox(buf, MOTOR.i0, MOTOR.j0, 0, MOTOR.i1 - MOTOR.i0, MOTOR.j1 - MOTOR.j0, MOTOR.h, STEEL);
  for (let k = 1; k < 5; k++) edge(buf, [MOTOR.i0 + k * 0.17, MOTOR.j1, 3], [MOTOR.i0 + k * 0.17, MOTOR.j1, MOTOR.h - 3], C.steelDark);

  // Cuerpo de la trilladora, sobre patas.
  isoBox(buf, M.i0, M.j0, 0, M.i1 - M.i0, M.j1 - M.j0, 6, { top: C.belt, front: C.belt, side: C.belt });
  isoBox(buf, M.i0, M.j0, 6 + shake * 0.5, M.i1 - M.i0, M.j1 - M.j0, M.h - 6, MACH);
  // Placa y remaches en el frente.
  onFront(buf, M.j1, [M.i0, M.i1, 6, M.h], (i, z) => {
    const u = i - M.i0;
    if (u > 0.4 && u < 1.5 && z > 36 && z < 46) return z > 44.6 || z < 37.4 ? C.machineDark : C.steelLit;
    if ((Math.abs(u - 0.15) < 0.04 || Math.abs(u - (M.i1 - M.i0 - 0.15)) < 0.04) && Math.floor(z) % 8 === 0) return C.steelLit;
    return CLEAR;
  });

  // Tolva: tronco de pirámide abierto arriba, con el pergamino adentro.
  const t0 = M.h;
  const t1 = M.h + 24;
  const inner = { i0: 3.75, i1: 5.25, j0: 0.35, j1: 1.25 };
  const outer = { i0: 3.45, i1: 5.55, j0: 0.05, j1: 1.55 };
  quad(
    buf,
    [
      [inner.i1, inner.j0, t0],
      [inner.i1, inner.j1, t0],
      [outer.i1, outer.j1, t1],
      [outer.i1, outer.j0, t1],
    ],
    C.steelDark,
  );
  quad(
    buf,
    [
      [inner.i0, inner.j1, t0],
      [inner.i1, inner.j1, t0],
      [outer.i1, outer.j1, t1],
      [outer.i0, outer.j1, t1],
    ],
    C.steel,
  );
  quad(
    buf,
    [
      [outer.i0, outer.j0, t1],
      [outer.i1, outer.j0, t1],
      [outer.i1, outer.j1, t1],
      [outer.i0, outer.j1, t1],
    ],
    (x, y) => ((x + y) % 3 === 0 ? C.pergaminoDark : C.pergamino),
  );
  edge(buf, [outer.i0, outer.j0, t1], [outer.i1, outer.j0, t1], C.outline);
  edge(buf, [outer.i0, outer.j0, t1], [outer.i0, outer.j1, t1], C.outline);
  edge(buf, [outer.i0, outer.j1, t1], [outer.i1, outer.j1, t1], C.outline);
  edge(buf, [outer.i1, outer.j0, t1], [outer.i1, outer.j1, t1], C.outline);
  edge(buf, [outer.i0, outer.j1, t1], [inner.i0, inner.j1, t0], C.outline);
  edge(buf, [outer.i1, outer.j1, t1], [inner.i1, inner.j1, t0], C.outline);
  edge(buf, [outer.i1, outer.j0, t1], [inner.i1, inner.j0, t0], C.outline);

  // Salida del café verde (el tubo que se atasca) y el saco que se llena abajo.
  isoBox(buf, SPOUT.i - 0.3, M.j1, SPOUT.z - 4, 0.6, 0.5, 8, STEEL);
  const mouth = P(SPOUT.i, M.j1 + 0.5, SPOUT.z - 4);
  if (s.running && !s.jammed) {
    for (let k = 0; k < 6; k++) {
      const yy = mouth.y + ((k * 3 + Math.floor(s.t * 30)) % 10);
      buf.px(mouth.x - 1 + (k % 3), yy, k % 2 ? C.green : mix(C.green, C.outline, 0.3));
    }
  }
  if (s.jammed && !s.guard) {
    // Atascado: granos pegados en la boca.
    buf.rect(mouth.x - 3, mouth.y - 2, 7, 3, C.green);
  }
  const sack = P(SPOUT.i, M.j1 + 1.0, 0);
  finca.drawSack(buf, sack.x, sack.y, 0.8, false);

  // Poleas y correa, en el frente. Con guarda: una malla amarilla las encierra.
  const jp = M.j1 + 0.06;
  const spin = s.running ? s.t * 9 : 0;
  const pulley = (pi: number, pz: number, r: number) =>
    onFront(
      buf,
      jp,
      [pi - r / 20 - 0.1, pi + r / 20 + 0.1, pz - r - 2, pz + r + 2],
      (i, z) => {
        const dx = (i - pi) * 20;
        const dz = z - pz;
        const d = Math.hypot(dx, dz);
        if (d > r) return CLEAR;
        if (d > r - 1.6) return C.belt;
        if (d < 1.6) return C.steelDark;
        const a = Math.atan2(dz, dx) + spin;
        return Math.abs(Math.sin(a * 2)) < 0.28 ? C.steelDark : C.steelLit;
      },
      C.outline,
    );
  pulley(PULLEY_BIG.i, PULLEY_BIG.z, PULLEY_BIG.r);
  pulley(PULLEY_SMALL.i, PULLEY_SMALL.z, PULLEY_SMALL.r);
  const a = P(PULLEY_BIG.i, jp, PULLEY_BIG.z);
  const b = P(PULLEY_SMALL.i, jp, PULLEY_SMALL.z);
  for (const side of [-1, 1]) {
    const ax = a.x + side * PULLEY_BIG.r * 0.72;
    const ay = a.y + side * PULLEY_BIG.r * 0.7;
    const bx = b.x + side * PULLEY_SMALL.r * 0.72;
    const by = b.y + side * PULLEY_SMALL.r * 0.7;
    buf.line(ax, ay, bx, by, C.belt);
    buf.line(ax + 1, ay, bx + 1, by, C.belt);
    if (s.running) {
      // Marcas que corren por la correa: se nota que gira.
      const n = 5;
      for (let k = 0; k < n; k++) {
        const tt = ((k / n + s.t * 1.6 * side) % 1 + 1) % 1;
        buf.px(ax + (bx - ax) * tt, ay + (by - ay) * tt, C.beltMark);
      }
    }
  }
  if (s.guard) {
    onFront(
      buf,
      jp + 0.08,
      [PULLEY_BIG.i - 0.62, PULLEY_SMALL.i + 0.36, 0, PULLEY_BIG.z + 11],
      (i, z) => {
        if (z < 1 || z > PULLEY_BIG.z + 10) return CLEAR;
        const u = (i - (PULLEY_BIG.i - 0.6)) * 20;
        if (u < 0 || u > (PULLEY_SMALL.i - PULLEY_BIG.i + 0.94) * 20) return CLEAR;
        const border = u < 1.5 || u > (PULLEY_SMALL.i - PULLEY_BIG.i + 0.94) * 20 - 1.5 || z < 2.4 || z > PULLEY_BIG.z + 8.6;
        if (border) return C.yellowDark;
        if ((Math.floor(u) + Math.floor(z)) % 4 === 0 || (Math.floor(u) - Math.floor(z) + 400) % 4 === 0) return C.yellow;
        return CLEAR;
      },
      C.outline,
    );
  }
}

/** Tablero eléctrico en la pared derecha: palanca, luz y, si está bloqueado, candado y tarjeta. */
export function drawPanel(buf: PixelBuffer, on: boolean, locked: boolean) {
  const p = PANEL;
  onFront(
    buf,
    0.05,
    [p.i0, p.i1, p.z0, p.z1],
    (i, z) => {
      if (i < p.i0 || i > p.i1 || z < p.z0 || z > p.z1) return CLEAR;
      const u = (i - p.i0) * 20;
      if (u < 1.2 || u > (p.i1 - p.i0) * 20 - 1.2 || z < p.z0 + 1.2 || z > p.z1 - 1.2) return C.panelDark;
      // Señal amarilla de riesgo eléctrico.
      if (z > p.z1 - 9 && z < p.z1 - 3 && Math.abs(u - 6) < 3 - (p.z1 - 3 - z) * 0.45) return C.yellow;
      return C.panel;
    },
    C.outline,
  );
  const lamp = P(p.i0 + 0.12, 0.08, p.z0 + 14);
  buf.rect(lamp.x - 1, lamp.y - 1, 3, 3, on ? C.lamp : C.lampOff);
  const pivot = P(p.i0 + 0.38, 0.08, p.z0 + 10);
  buf.rect(pivot.x - 2, pivot.y - 1, 4, 3, C.belt);
  const lever = on ? { x: pivot.x + 1, y: pivot.y - 7 } : { x: pivot.x + 1, y: pivot.y + 6 };
  buf.line(pivot.x, pivot.y, lever.x, lever.y, C.red);
  buf.line(pivot.x + 1, pivot.y, lever.x + 1, lever.y, C.red);
  buf.rect(lever.x - 1, lever.y - 1, 3, 2, C.redDark);
  if (locked) {
    // Candado amarillo en la palanca y tarjeta roja de "no operar".
    const l = { x: pivot.x + 3, y: pivot.y + 7 };
    buf.rect(l.x - 2, l.y - 4, 4, 2, C.steelDark);
    buf.rect(l.x - 3, l.y - 2, 6, 5, C.yellow);
    buf.px(l.x, l.y, C.outline);
    buf.line(l.x, l.y + 3, l.x - 2, l.y + 7, C.belt);
    buf.rect(l.x - 5, l.y + 7, 6, 8, C.red);
    buf.rect(l.x - 4, l.y + 9, 4, 1, hex("#ffffff"));
    buf.rect(l.x - 4, l.y + 11, 3, 1, hex("#ffffff"));
  }
}

/** Centro del tablero (para las zonas). */
export function panelCenter(): Pt {
  return P((PANEL.i0 + PANEL.i1) / 2, 0.05, (PANEL.z0 + PANEL.z1) / 2);
}

// --- Montacargas --------------------------------------------------------------------

export interface LiftState {
  /** Esquina trasera (contrapeso) en el piso. */
  i: number;
  j: number;
  /** Altura de las uñas con la carga (0 = abajo). */
  forks: number;
  t: number;
  moving: boolean;
}

export const LIFT = { length: 2.0, width: 1.1 };

/**
 * Montacargas amarillo que avanza hacia la puerta (hacia -i): el mástil y las uñas van
 * adelante, a la izquierda. `driver` dibuja al conductor sentado en la cabina.
 */
export function drawLift(buf: PixelBuffer, s: LiftState, driver?: (seat: Pt) => void) {
  const { i, j } = s;
  const L = LIFT.length;
  const Wd = LIFT.width;
  const bump = s.moving && Math.floor(s.t * 12) % 2 === 0 ? 1 : 0;
  const body: BoxColors = { top: C.liftLit, front: C.lift, side: C.liftDark, line: C.liftLine };
  floorShadow(buf, i - 0.7, j - 0.05, L + 0.8, Wd + 0.1, 0.32);

  // Uñas y carga (una estiba con sacos) adelante, del lado de la puerta.
  const fz = s.forks;
  isoBox(buf, i - 0.75, j + 0.2, fz, 0.7, 0.12, 2, { top: C.steelDark, front: C.belt, side: C.belt });
  isoBox(buf, i - 0.75, j + Wd - 0.32, fz, 0.7, 0.12, 2, { top: C.steelDark, front: C.belt, side: C.belt });
  isoBox(buf, i - 0.75, j + 0.1, fz + 2, 0.7, Wd - 0.2, 3, { top: C.wood, front: C.woodDark, side: C.woodDark, line: C.outline });
  for (const [bi, bj, bl] of [
    [i - 0.4, j + 0.35, 0],
    [i - 0.4, j + 0.8, 0],
    [i - 0.4, j + 0.57, 1],
  ] as [number, number, number][]) {
    drawBag(buf, bi, bj, fz + 5 + bl * 8, 0.9);
  }

  // Ruedas del lado lejano, carrocería, contrapeso.
  isoBox(buf, i - 0.05, j, 0, L, Wd, 6 + bump, { top: C.tire, front: C.tire, side: C.tire });
  isoBox(buf, i, j + 0.02, 5 + bump, L, Wd - 0.04, 14, body);
  isoBox(buf, i + L - 0.5, j + 0.05, 19 + bump, 0.5, Wd - 0.1, 8, { top: C.liftDark, front: C.liftDark, side: hex("#9c6a0c"), line: C.liftLine });
  // Mástil (dos rieles) adelante.
  for (const mj of [j + 0.15, j + Wd - 0.25]) isoBox(buf, i - 0.12, mj, 4, 0.12, 0.1, 50, { top: C.belt, front: hex("#3a3a3e"), side: C.belt });
  edge(buf, [i - 0.06, j + 0.2, 52], [i - 0.06, j + Wd - 0.2, 52], C.belt);

  // Conductor sentado.
  const seat = P(i + 1.0, j + Wd * 0.55, 19 + bump);
  driver?.(seat);

  // Techo protector sobre cuatro postes.
  for (const [pi, pj] of [
    [i + 0.25, j + 0.1],
    [i + 1.35, j + 0.1],
    [i + 0.25, j + Wd - 0.1],
    [i + 1.35, j + Wd - 0.1],
  ] as [number, number][]) {
    edge(buf, [pi, pj, 19 + bump], [pi, pj, 58 + bump], C.belt);
  }
  isoBox(buf, i + 0.2, j + 0.05, 58 + bump, 1.2, Wd - 0.1, 2, { top: C.belt, front: hex("#3a3a3e"), side: C.belt });

  // Ruedas del lado cercano.
  for (const wi of [i + 0.35, i + L - 0.35]) {
    const c = P(wi, j + Wd, 5);
    buf.implicit(c.x - 6, c.y - 6, c.x + 6, c.y + 6, (x, y) => {
      const d = Math.hypot((x - c.x) / 1.0, (y - c.y) / 1.05);
      if (d > 5.2) return CLEAR;
      return d < 2 ? C.steelLit : C.tire;
    }, C.outline);
  }
  // Luz de advertencia en el techo (titila cuando anda).
  if (s.moving && Math.floor(s.t * 4) % 2 === 0) {
    const bl = P(i + 0.8, j + Wd / 2, 62 + bump);
    buf.rect(bl.x - 1, bl.y - 2, 3, 2, hex("#ff8a2a"));
  }
}

// --- Carretilla -------------------------------------------------------------------

/** Carretilla de dos ruedas con un saco parado, empujada desde (x, y) hacia `facing`. */
export function drawHandTruck(buf: PixelBuffer, x: number, y: number, facing: 1 | -1) {
  const nose = { x: x + facing * 14, y };
  const handle = { x: x + facing * 4, y: y - 30 };
  finca.drawSack(buf, nose.x - facing * 3, y - 1, 0.9, false);
  buf.line(nose.x + facing * 3, y, handle.x, handle.y, C.belt);
  buf.line(nose.x + facing * 4, y, handle.x + facing, handle.y, C.steelDark);
  buf.line(nose.x - facing * 4, y, nose.x + facing * 4, y, C.belt);
  buf.implicit(nose.x + facing * 2 - 4, y - 7, nose.x + facing * 2 + 4, y + 1, (px, py) => {
    const d = Math.hypot(px - (nose.x + facing * 2), py - (y - 3));
    return d <= 3.4 ? (d < 1.3 ? C.steelLit : C.tire) : CLEAR;
  }, C.outline);
}

/** Ondas de ruido que salen de la máquina. */
export function drawNoise(buf: PixelBuffer, t: number, strong: boolean) {
  const origin = P(MACHINE.i1 + 0.1, MACHINE.j1, 44);
  const origin2 = P(MACHINE.i0 + 0.2, MACHINE.j1 + 0.2, 60);
  for (const [o, dir] of [
    [origin, 1],
    [origin2, -1],
  ] as [Pt, number][]) {
    for (let k = 0; k < (strong ? 3 : 1); k++) {
      const r = 5 + ((t * 18 + k * 6) % 18);
      const alpha = 1 - r / 23;
      if (alpha <= 0.1) continue;
      for (let a = -50; a <= 50; a += 6) {
        const rad = (a * Math.PI) / 180;
        const x = o.x + dir * Math.cos(rad) * r;
        const y = o.y + Math.sin(rad) * r * 0.9 - 6;
        buf.blend(x, y, hex("#ffffff"), Math.min(1, alpha * 1.4));
        buf.blend(x + dir, y, hex("#ffffff"), alpha * 0.7);
      }
    }
  }
}
