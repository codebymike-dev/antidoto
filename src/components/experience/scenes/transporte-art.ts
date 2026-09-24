// Arte de la estación 2 de la Ruta del café: una carretera destapada de montaña en el
// lenguaje de Habbo. La vía baja en diagonal hacia la izquierda con el talud sembrado a
// un lado y el barranco al otro; el yipao va de frente hacia abajo, así se ve el lado del
// conductor. Todo pasa por una proyección isométrica con pendiente: lo que se dibuja con
// P() queda inclinado como la vía, y el suelo se pinta píxel a píxel con coordenadas del
// mundo para poder desplazarlo (la vía "corre" mientras el yipao avanza).

import { CLEAR, PixelBuffer, hex, mix, type Color } from "../pixel/buffer.ts";
import * as finca from "./finca-art.ts";

export const W = finca.W;
export const H = finca.H;

// --- Proyección ----------------------------------------------------------------

/** i: a lo ancho de la vía (+ hacia el barranco). j: a lo largo (+ hacia donde va el yipao). */
export const X0 = 314;
export const Y0 = 62;
/** La vía baja: cada unidad hacia adelante baja esto en pantalla. */
export const SLOPE = 0.12;
/** Pendiente del talud (lo que sube por cada unidad hacia atrás de la vía). */
export const TALUD = 0.85;
/** Borde de la vía y borde del barranco (en i). */
export const ROAD_EDGE = 64;
export const CLIFF_EDGE = 76;
/** La vía se repite cada tanto: así "corre" sin fin mientras se maneja. */
export const PERIOD = 520;

export interface Pt {
  x: number;
  y: number;
}

export function P(i: number, j: number, z = 0): Pt {
  return { x: X0 + i - j, y: Y0 + (i + j) / 2 + SLOPE * j - z };
}

/** Altura del terreno: la vía es plana (con su pendiente) y el talud sube hacia atrás. */
export function groundZ(i: number) {
  return i < 0 ? -i * TALUD : 0;
}

export const wrap = (jw: number) => ((jw % PERIOD) + PERIOD) % PERIOD;

/** j en pantalla de algo que está en jw del mundo, repetido a lo largo de la vía. */
export function displayJ(jw: number, scroll: number) {
  return wrap(jw - scroll + 140) - 140;
}

export const C = {
  ...finca.C,
  dirt: hex("#b89366"),
  dirtDark: hex("#a4804f"),
  dirtLight: hex("#c9a77b"),
  rut: hex("#8f6b45"),
  rutDark: hex("#7a5a39"),
  pebble: hex("#ddd0b4"),
  pebbleShade: hex("#8a6a47"),
  cut: hex("#9a6a44"),
  cutDark: hex("#7c5233"),
  root: hex("#5b3a24"),
  cliff: hex("#8b5d3b"),
  cliffDark: hex("#6d472c"),
  cliffDeep: hex("#553621"),
  body: hex("#d9503e"),
  bodyLit: hex("#e8725c"),
  bodyShade: hex("#a93a2c"),
  bodyLine: hex("#5e1b16"),
  bodyInside: hex("#7d2a21"),
  chassis: hex("#2c2a2b"),
  chassisLit: hex("#454244"),
  tire: hex("#2b2b2e"),
  tireLit: hex("#45454a"),
  tread: hex("#18181a"),
  rim: hex("#e8e2d2"),
  rimShade: hex("#b9b1a0"),
  hub: hex("#6d6a66"),
  glass: hex("#bfe6f5"),
  glassShine: hex("#ffffff"),
  frame: hex("#333a3d"),
  seat: hex("#4a3a32"),
  seatDark: hex("#33271f"),
  chrome: hex("#d9dde0"),
  lamp: hex("#fff4c2"),
  signYellow: hex("#ffc93c"),
  signPost: hex("#8c9296"),
  white: hex("#f6f4ee"),
  red: hex("#d23b33"),
  coopWall: hex("#f4efe2"),
  coopShade: hex("#d6cdb9"),
  coopTrim: hex("#2f7d4a"),
  coopTrimDark: hex("#23613a"),
  coopDoor: hex("#6b3e26"),
  coopDoorDark: hex("#4e2b19"),
  roofTop: hex("#b7492f"),
  roofSide: hex("#8e3523"),
  wedge: hex("#f0bd2e"),
  wedgeDark: hex("#b98a14"),
  phone: hex("#1e2226"),
  phoneScreen: hex("#8fe0ff"),
  belt: hex("#3b4046"),
  beltLit: hex("#5a616b"),
  dust: hex("#d9c3a0"),
};

/** Ruido fijo por celda: la textura del suelo sale igual en cada cuadro. */
function h2(a: number, b: number) {
  let n = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Ondas con período PERIOD: el borde del talud se repite sin costura. */
const wave = (jw: number, k: number, phase = 0) => Math.sin((wrap(jw) / PERIOD) * Math.PI * 2 * k + phase);

/** Hasta dónde llega el talud (en i, negativo), según el punto de la vía. */
export function ridgeI(jw: number) {
  return -60 - 7 * wave(jw, 3, 0.6) - 4 * wave(jw, 7, 2.1);
}

function cliffDepth(jw: number) {
  return 26 + 4 * wave(jw, 5, 1.3) + (h2(Math.floor(wrap(jw) / 3), 7) > 0.7 ? 2 : 0);
}

// --- Fondo y suelo ---------------------------------------------------------------

/** Cielo, cordillera y lomas de la finca: lo que se ve más allá del barranco. */
export function drawBackground(buf: PixelBuffer) {
  finca.drawSky(buf);
  finca.drawLandscape(buf);
}

function roadColor(i: number, jw: number): Color {
  const jp = wrap(jw);
  const ci = Math.floor(i / 2);
  const cj = Math.floor(jp / 2);
  const n = h2(ci, cj);
  // Borde irregular con el pasto de la orilla.
  const grassEdge = ROAD_EDGE + 1.5 * wave(jw, 11, 0.4) + (h2(cj, 3) > 0.8 ? 1.5 : 0);
  if (i > grassEdge) {
    if (i > CLIFF_EDGE - 1.2) return C.lip;
    return n > 0.82 ? C.grassDark : n < 0.12 ? C.grassLight : (ci + cj) % 2 ? C.grass : C.grassAlt;
  }
  if (i > grassEdge - 1.2) return C.grassDark;
  // Huellas de las llantas: dos surcos a lo largo de la vía.
  const inRut = (i > 6 && i < 12) || (i > 47 && i < 53);
  if (inRut) return n > 0.75 ? C.rutDark : C.rut;
  // Piedritas con su sombra.
  if (n > 0.965) return C.pebble;
  if (h2(ci, cj - 1) > 0.965) return C.pebbleShade;
  if (n < 0.18) return C.dirtDark;
  if (n > 0.86) return C.dirtLight;
  return C.dirt;
}

function taludColor(i: number, jw: number, ridge: number): Color {
  const jp = wrap(jw);
  const ci = Math.floor(i / 2);
  const cj = Math.floor(jp / 2);
  const n = h2(ci + 91, cj);
  // Corte de la vía: tierra expuesta con vetas y raíces.
  const cut = -8 - 2 * wave(jw, 9, 1);
  if (i > cut) {
    if (n > 0.93) return C.root;
    return Math.floor(-i * TALUD) % 3 === 0 ? C.cutDark : C.cut;
  }
  if (i > cut - 1.3) return C.lip;
  if (i < ridge + 1.2) return C.nearDark;
  if (n > 0.9) return C.nearDots;
  if (n < 0.1) return C.grassDark;
  return (ci + cj) % 2 ? C.near : mix(C.near, C.grassAlt, 0.4);
}

function cliffColor(jw: number, z: number): Color {
  const d = -z;
  if (d < 1.5) return C.lip;
  const strata = Math.floor(d / 5) % 2 === 0;
  const n = h2(Math.floor(wrap(jw) / 2), Math.floor(d / 2) + 40);
  if (n > 0.9) return C.stone;
  return d > 16 ? C.cliffDeep : strata ? C.cliff : C.cliffDark;
}

/**
 * Pinta vía, talud y barranco sobre el fondo. Resuelve para cada píxel en qué punto del
 * mundo cae (plano de la vía, plano del talud o pared del barranco) y lo colorea con la
 * textura de ese punto, desplazada por `scroll`.
 */
export function drawGround(out: PixelBuffer, scroll: number) {
  const S = SLOPE;
  const T = TALUD;
  const data = out.data;
  for (let y = 0; y < H; y++) {
    const py = y + 0.5;
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - X0;
      let j = (py - Y0 - dx / 2) / (1 + S);
      let i = dx + j;
      let c: Color = CLEAR;
      if (i >= 0 && i <= CLIFF_EDGE) {
        c = roadColor(i, j + scroll);
      } else if (i < 0) {
        j = (py - Y0 - dx * (0.5 + T)) / (1 + S + T);
        i = dx + j;
        const ridge = ridgeI(j + scroll);
        if (i < 0 && i > ridge) c = taludColor(i, j + scroll, ridge);
      } else {
        const jf = X0 + CLIFF_EDGE - (x + 0.5);
        const zf = Y0 + (CLIFF_EDGE + jf) / 2 + S * jf - py;
        if (zf <= 0 && zf > -cliffDepth(jf + scroll)) c = cliffColor(jf + scroll, zf);
      }
      if (c) data[y * W + x] = c;
    }
  }
}

// --- Primitivas isométricas --------------------------------------------------------

type P3 = [number, number, number];

export function quad(buf: PixelBuffer, pts: P3[], c: Color | ((x: number, y: number) => Color)) {
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

/** Caja isométrica con sus tres caras visibles y el contorno de la silueta. */
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

/** Forma sobre el plano i = constante (la cara del lado del conductor), en coordenadas (j, z). */
function onSidePlane(buf: PixelBuffer, ip: number, bounds: [number, number, number, number], fn: (j: number, z: number) => Color, outline: Color = CLEAR) {
  const [j0, j1, z0, z1] = bounds;
  const a = P(ip, j0, z1);
  const b = P(ip, j1, z0);
  const c = P(ip, j0, z0);
  const d = P(ip, j1, z1);
  buf.implicit(
    Math.min(a.x, b.x, c.x, d.x),
    Math.min(a.y, b.y, c.y, d.y),
    Math.max(a.x, b.x, c.x, d.x),
    Math.max(a.y, b.y, c.y, d.y),
    (x, y) => {
      const j = X0 + ip - x;
      const z = Y0 + (ip + j) / 2 + SLOPE * j - y;
      return fn(j, z);
    },
    outline,
  );
}

/** Forma sobre el plano j = constante (la cara del frente), en coordenadas (i, z). */
function onFrontPlane(buf: PixelBuffer, jp: number, bounds: [number, number, number, number], fn: (i: number, z: number) => Color, outline: Color = CLEAR) {
  const [i0, i1, z0, z1] = bounds;
  const pts = [P(i0, jp, z0), P(i1, jp, z0), P(i0, jp, z1), P(i1, jp, z1)];
  buf.implicit(
    Math.min(...pts.map((p) => p.x)),
    Math.min(...pts.map((p) => p.y)),
    Math.max(...pts.map((p) => p.x)),
    Math.max(...pts.map((p) => p.y)),
    (x, y) => {
      const i = x - X0 + jp;
      const z = Y0 + (i + jp) / 2 + SLOPE * jp - y;
      return fn(i, z);
    },
    outline,
  );
}

/** Sombra de un rectángulo en el piso. */
export function groundShadow(buf: PixelBuffer, i: number, j: number, di: number, dj: number, alpha = 0.3) {
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

// --- El yipao ----------------------------------------------------------------------

export interface CarState {
  /** Esquina trasera del lado del copiloto, en el mundo (i) y en pantalla (j). */
  i0: number;
  j0: number;
  /** Rebote de la carrocería (z). */
  bump: number;
  /** Giro de las ruedas, en radianes. */
  spin: number;
  /** Llanta delantera lisa y bajita de aire. */
  badTire: boolean;
  /** Tacos de madera bajo las llantas. */
  chocks: boolean;
}

/** Medidas del yipao (en unidades del mundo, relativas a su esquina). */
export const CAR = {
  width: 42,
  length: 86,
  floor: 12,
  wall: 30,
  cabFrom: 34,
  hoodFrom: 56,
  wheelR: 11,
  rearWheel: 17,
  frontWheel: 70,
  seatTop: 25,
  driverI: 31,
  driverJ: 43,
  wheelJ: 52,
  wheelZ: 38,
};

const BODY: BoxColors = { top: C.bodyLit, front: C.body, side: C.bodyShade, line: C.bodyLine };
const INSIDE: BoxColors = { top: C.bodyLit, front: C.bodyInside, side: C.bodyInside, line: C.bodyLine };
const SEAT: BoxColors = { top: C.seat, front: C.seat, side: C.seatDark, line: hex("#1e1712") };
const DARK: BoxColors = { top: C.chassisLit, front: C.chassis, side: C.chassis, line: hex("#141314") };

export function drawWheel(
  buf: PixelBuffer,
  ip: number,
  jc: number,
  r: number,
  spin: number,
  opts: { bald?: boolean; flat?: boolean; far?: boolean } = {},
) {
  // Una llanta desinflada se aplasta contra el piso y se ensancha abajo.
  const zc = opts.flat ? r - 2.5 : r;
  const hubR = r * 0.5;
  onSidePlane(
    buf,
    ip,
    [jc - r - 3, jc + r + 3, -1, zc + r + 1],
    (j, z) => {
      if (z < 0) return CLEAR;
      let dj = j - jc;
      const dz = z - zc;
      if (opts.flat && dz < 0) dj *= 1 - 0.28 * (-dz / r);
      const d = Math.hypot(dj, dz);
      if (d > r) return CLEAR;
      if (opts.far) return d > hubR ? C.tread : C.hub;
      const a = Math.atan2(dz, dj);
      if (d > r - 2.6) {
        if (opts.bald) {
          // Lisa: sin labrado, con brillo de caucho gastado.
          return dz > 0 && dj < -2 && d > r - 1.4 ? C.tireLit : C.tire;
        }
        const k = (((a + spin) / (Math.PI * 2)) * 14) % 1;
        return (k + 1) % 1 < 0.42 ? C.tread : C.tire;
      }
      if (d > hubR + 0.8) return d > r - 3.6 ? C.tread : C.tire;
      if (d > hubR - 0.6) return dz > 0 && dj < 0 ? C.rim : C.rimShade;
      // Tuercas que giran con la rueda.
      for (let k = 0; k < 4; k++) {
        const b = spin + (k * Math.PI) / 2;
        if (Math.hypot(dj - Math.cos(b) * hubR * 0.55, dz - Math.sin(b) * hubR * 0.55) < 1.1) return C.hub;
      }
      return C.rimShade;
    },
    C.outline,
  );
}

export interface CarLayers {
  /** La carga y lo que va encima (se dibuja dentro del platón). */
  cargo?: () => void;
  /** El conductor (entre las sillas y el costado del conductor). */
  driver?: () => void;
  /** Lo que queda delante del conductor y detrás del parabrisas (el timón). */
  dash?: () => void;
}

/**
 * Yipao (campero Willys) visto desde el lado del conductor, de frente hacia abajo de la
 * vía. Se dibuja por capas de atrás hacia adelante para que la carga, el conductor y el
 * timón queden en su sitio.
 */
export function drawWillys(buf: PixelBuffer, s: CarState, layers: CarLayers = {}) {
  const I = (ci: number) => s.i0 + ci;
  const J = (cj: number) => s.j0 + cj;
  const b = s.bump;
  const { width, length, floor, wall, cabFrom, hoodFrom, wheelR } = CAR;

  groundShadow(buf, I(-3), J(-2), width + 8, length + 6, 0.34);

  // Ruedas del lado del copiloto: casi tapadas, se asoman por debajo.
  drawWheel(buf, I(-1), J(CAR.rearWheel), wheelR, s.spin, { far: true });
  drawWheel(buf, I(-1), J(CAR.frontWheel), wheelR, s.spin, { far: true });

  // Chasis.
  isoBox(buf, I(4), J(4), 5 + b, width - 8, length - 6, 6, DARK);

  // Platón y cabina: paredes del fondo por dentro, piso.
  isoBox(buf, I(0), J(0), floor - 2 + b, 2, hoodFrom, wall - floor + 2, INSIDE);
  isoBox(buf, I(0), J(0), floor - 2 + b, width, 2, wall - floor + 2, INSIDE);
  quad(
    buf,
    [
      [I(2), J(2), floor + b],
      [I(width), J(2), floor + b],
      [I(width), J(hoodFrom), floor + b],
      [I(2), J(hoodFrom), floor + b],
    ],
    hex("#5b1f18"),
  );

  // Sillas: la del copiloto y la del conductor.
  for (const si of [4, 24]) {
    isoBox(buf, I(si), J(cabFrom + 4), floor + b, 15, 12, CAR.seatTop - floor, SEAT);
    isoBox(buf, I(si), J(cabFrom), floor + b, 15, 4, 42 - floor, SEAT);
  }

  layers.cargo?.();
  layers.driver?.();
  // Tablero: tapa las piernas del conductor bajo el parabrisas.
  isoBox(buf, I(3), J(hoodFrom - 5), floor + b, width - 6, 5, 34 - floor, INSIDE);
  layers.dash?.();

  // Costado del conductor con el recorte de la puerta (el yipao no tiene puertas).
  const side = I(width);
  onSidePlane(
    buf,
    side,
    [J(0), J(hoodFrom + 1), floor - 3 + b, wall + 1 + b],
    (j, z) => {
      const cj = j - s.j0;
      const zz = z - b;
      if (cj < 0 || cj > hoodFrom || zz < floor - 2) return CLEAR;
      // Recorte curvo de la entrada a la cabina.
      const inDoor = cj > cabFrom + 1 && cj < hoodFrom - 2;
      const doorTop = inDoor ? 20 + 6 * Math.cos(((cj - cabFrom - 1) / (hoodFrom - 3 - cabFrom)) * Math.PI) ** 8 : wall;
      if (zz > doorTop) return CLEAR;
      if (zz > doorTop - 1.4) return C.bodyLit;
      // Tapa de la gasolina y el remache de la esquina.
      if (Math.hypot(cj - 8, zz - 23) < 2.2) return C.chassisLit;
      return C.bodyShade;
    },
    C.bodyLine,
  );

  // Capó alto, parrilla de siete ranuras y farolas redondas.
  isoBox(buf, I(3), J(hoodFrom), floor - 2 + b, width - 6, length - hoodFrom, 35 - floor, BODY);
  onFrontPlane(buf, J(length), [I(5), I(width - 5), floor + 1 + b, 32 + b], (i, z) => {
    const ci = i - s.i0;
    const zz = z - b;
    for (const lx of [8, 34]) {
      const d = Math.hypot(ci - lx, zz - 27);
      if (d < 3.4) return d < 2 ? C.lamp : C.chrome;
    }
    if (zz > 14 && zz < 24 && ci > 11 && ci < 31) {
      return Math.floor((ci - 11) / 2.86) % 2 === 0 ? C.chassis : C.body;
    }
    return CLEAR;
  });
  // Parachoques.
  isoBox(buf, I(-2), J(length), 6 + b, width + 4, 4, 5, DARK);

  // Ruedas del lado del conductor, con el guardabarros plano encima.
  drawWheel(buf, I(width + 1), J(CAR.rearWheel), wheelR, s.spin);
  drawWheel(buf, I(width + 1), J(CAR.frontWheel), wheelR, s.spin, { bald: s.badTire, flat: s.badTire });
  isoBox(buf, I(width - 3), J(hoodFrom + 1), 21 + b, 7, length - hoodFrom - 2, 2, BODY);
  isoBox(buf, I(width - 1), J(4), 22 + b, 3, 26, 2, BODY);

  // Parabrisas: marco oscuro y vidrio con su brillo.
  const wz0 = 35 + b;
  const wz1 = 56 + b;
  const wj = J(hoodFrom);
  quad(
    buf,
    [
      [I(3), wj, wz0],
      [I(width - 3), wj, wz0],
      [I(width - 3), wj, wz1],
      [I(3), wj, wz1],
    ],
    (x, y) => {
      const under = buf.get(x, y);
      if (!under) return CLEAR;
      const shine = (x + y) % 9 === 0 || (x + y + 1) % 9 === 0;
      return mix(under, shine ? C.glassShine : C.glass, shine ? 0.55 : 0.32);
    },
  );
  isoBox(buf, I(1), wj - 1, wz0 - 1, 3, 2, wz1 - wz0 + 2, DARK);
  isoBox(buf, I(width - 4), wj - 1, wz0 - 1, 3, 2, wz1 - wz0 + 2, DARK);
  isoBox(buf, I(1), wj - 1, wz1, width - 2, 2, 2, DARK);

  if (s.chocks) {
    // Tacos de madera delante de las llantas (el yipao mira hacia abajo).
    drawChock(buf, I(width + 1), J(CAR.frontWheel + wheelR - 1));
    drawChock(buf, I(width + 1), J(CAR.rearWheel + wheelR - 1));
  }
}

function drawChock(buf: PixelBuffer, i: number, j: number) {
  quad(
    buf,
    [
      [i - 3, j, 0],
      [i + 3, j, 0],
      [i + 3, j + 6, 0],
      [i - 3, j + 6, 0],
    ],
    C.wedgeDark,
  );
  quad(
    buf,
    [
      [i + 3, j, 0],
      [i + 3, j + 6, 0],
      [i + 3, j, 5],
    ],
    C.wedgeDark,
  );
  quad(
    buf,
    [
      [i - 3, j, 5],
      [i + 3, j, 5],
      [i + 3, j + 6, 0],
      [i - 3, j + 6, 0],
    ],
    C.wedge,
  );
}

/**
 * Bulto de café pergamino acostado, ocupando la caja (i, j, z) de di x dj x dz. Se dibuja
 * como el costal de la finca: redondo, de fique, con el contorno oscuro.
 */
export function drawBag(buf: PixelBuffer, i: number, j: number, z: number, di = 18, dj = 14, dz = 8) {
  const c = P(i + di / 2, j + dj / 2, z);
  // El costal de la finca acostado mide unos 20x12 px: se ajusta al tamaño de la caja.
  const size = Math.min(1.15, (di + dj) / 32);
  finca.drawSack(buf, c.x, c.y + 1, 0.95 * size, true);
  // Costura de la boca, del lado del conductor.
  buf.px(c.x + 5 * size, c.y - dz * 0.6, C.rope);
}

/** Timón visto de lado, con la barra hacia el tablero. */
export function drawSteering(buf: PixelBuffer, i: number, j: number, z: number) {
  const c = P(i, j, z);
  const base = P(i, j + 6, z - 8);
  buf.line(c.x, c.y, base.x, base.y, C.chassis);
  buf.line(c.x + 1, c.y, base.x + 1, base.y, C.chassisLit);
  buf.implicit(c.x - 4, c.y - 7, c.x + 4, c.y + 7, (x, y) => {
    const dx = (x - c.x) / 2.2;
    const dy = (y - c.y) / 6;
    const d = dx * dx + dy * dy;
    return d <= 1 && d > 0.45 ? C.chassis : CLEAR;
  });
}

// --- Cosas del camino ---------------------------------------------------------------

/** Delineador de orilla: poste blanco con franja roja, marca el borde del barranco. */
export function drawDelineator(buf: PixelBuffer, i: number, j: number) {
  groundShadow(buf, i - 1, j - 1, 4, 4, 0.25);
  isoBox(buf, i, j, 0, 3, 3, 14, { top: C.white, front: C.white, side: hex("#cfcac0"), line: C.outline });
  isoBox(buf, i, j, 8, 3, 3, 3, { top: C.red, front: C.red, side: hex("#a52a24") });
}

/** Señal preventiva de curva peligrosa (rombo amarillo con la flecha). */
export function drawCurveSign(buf: PixelBuffer, i: number, j: number) {
  const z0 = groundZ(i);
  const foot = P(i, j, z0);
  const top = P(i, j, z0 + 30);
  buf.shadow(foot.x + 2, foot.y, 4, 1.5, C.shadow, 0.3);
  buf.rect(top.x - 1, top.y, 2, foot.y - top.y, C.signPost);
  buf.px(top.x, top.y + 2, hex("#5d6266"));
  const cx = top.x;
  const cy = top.y - 2;
  const R = 9;
  buf.implicit(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, (x, y) => {
    const d = Math.abs(x - cx) + Math.abs(y - cy);
    if (d > R) return CLEAR;
    if (d > R - 1.4) return C.outline;
    // Flecha de curva: baja, dobla a la derecha y sube.
    const ax = x - cx;
    const ay = y - cy;
    if (ax > -3 && ax < -1 && ay > -1 && ay < 5) return C.outline;
    if (ay > -2 && ay < 0 && ax > -3 && ax < 3) return C.outline;
    if (ax > 1 && ax < 3 && ay > -5 && ay < 0) return C.outline;
    if (ay > -6 && ay < -4 && Math.abs(ax - 2) < 2.2 - (ay + 6)) return C.outline;
    return C.signYellow;
  });
}

/** Portón de guadua de la finca a la orilla de la vía. */
export function drawGate(buf: PixelBuffer, i: number, j0: number, j1: number) {
  const post = (j: number) => {
    isoBox(buf, i, j, groundZ(i), 3, 3, 22, { top: C.guaduaNode, front: C.guadua, side: C.guaduaDark, line: C.leafOutline });
  };
  for (const [a, b] of [
    [j0, j0 + 26],
    [j1 - 26, j1],
  ]) {
    post(a);
    post(b);
    for (const h of [8, 16]) {
      const p = P(i + 1.5, a + 1.5, h);
      const q = P(i + 1.5, b + 1.5, h);
      buf.line(p.x, p.y, q.x, q.y, C.guaduaDark);
      buf.line(p.x, p.y - 1, q.x, q.y - 1, C.guadua);
    }
  }
}

/**
 * Cooperativa: bodega de dos aguas cortada en el talud, con el portón de cargue hacia la
 * vía, zócalo verde y un aviso con el grano de café.
 */
export function drawCoop(buf: PixelBuffer, i: number, j: number) {
  const di = 34;
  const dj = 110;
  const h = 40;
  groundShadow(buf, i - 2, j - 2, di + 4, dj + 4, 0.25);
  isoBox(buf, i, j, 0, di, dj, h, { top: C.coopShade, front: C.coopWall, side: C.coopShade, line: C.outline });
  // Zócalo verde en las dos caras visibles.
  isoBox(buf, i + di - 0.01, j, 0, 0.01, dj, 7, { top: C.coopTrim, front: C.coopTrim, side: C.coopTrimDark });
  isoBox(buf, i, j + dj - 0.01, 0, di, 0.01, 7, { top: C.coopTrim, front: C.coopTrim, side: C.coopTrim });
  // Portón de cargue (en la cara que mira a la vía) y dos ventanas.
  onSidePlane(buf, i + di, [j + 44, j + 76, 0, 30], (jj, z) => {
    const u = jj - (j + 44);
    if (u < 0 || u > 32 || z > 28) return CLEAR;
    if (u < 1.4 || u > 30.6 || z > 26.6) return C.coopTrimDark;
    return Math.floor(u / 4) % 2 === 0 ? C.coopDoor : C.coopDoorDark;
  });
  for (const wj of [j + 16, j + 88]) {
    onSidePlane(buf, i + di, [wj, wj + 12, 16, 30], (jj, z) => {
      const u = jj - wj;
      if (u < 0 || u > 12 || z < 17 || z > 29) return CLEAR;
      if (u < 1.2 || u > 10.8 || z < 18.2 || z > 27.8) return C.coopTrim;
      return Math.abs(u - 6) < 0.7 ? C.coopTrim : hex("#3d5963");
    });
  }
  // Techo de teja: un faldón hacia la vía y el borde del frente.
  const ov = 4;
  quad(
    buf,
    [
      [i - ov, j - ov, h + 12],
      [i + di + ov, j - ov, h - 2],
      [i + di + ov, j + dj + ov, h - 2],
      [i - ov, j + dj + ov, h + 12],
    ],
    C.roofTop,
  );
  for (let k = 0; k < dj + 2 * ov; k += 6) {
    edge(buf, [i - ov, j - ov + k, h + 12], [i + di + ov, j - ov + k, h - 2], C.roofSide);
  }
  quad(
    buf,
    [
      [i - ov, j + dj + ov, h + 12],
      [i + di + ov, j + dj + ov, h - 2],
      [i + di + ov, j + dj + ov, h - 4],
      [i - ov, j + dj + ov, h + 10],
    ],
    C.roofSide,
  );
  edge(buf, [i + di + ov, j - ov, h - 2], [i + di + ov, j + dj + ov, h - 2], hex("#7a2b1c"));
  // Aviso con el grano de café sobre el portón.
  onSidePlane(
    buf,
    i + di + 0.5,
    [j + 42, j + 78, 30, 40],
    (jj, z) => {
      const u = jj - (j + 42);
      if (u < 0 || u > 36 || z < 31 || z > 39) return CLEAR;
      const g = Math.hypot((u - 18) / 4.2, (z - 35) / 3);
      if (g < 1) return Math.abs(u - 18 + (z - 35) * 0.5) < 0.7 ? C.burlapLight : C.coopDoor;
      return C.white;
    },
    C.outline,
  );
}

/** Letra Z pixelada del sueño (3x3 o 5x5). */
export function drawZ(buf: PixelBuffer, x: number, y: number, size: number, c: Color) {
  x = Math.round(x);
  y = Math.round(y);
  for (let k = 0; k < size; k++) {
    buf.px(x + k, y, c);
    buf.px(x + k, y + size - 1, c);
    buf.px(x + size - 1 - k, y + k, c);
  }
}
