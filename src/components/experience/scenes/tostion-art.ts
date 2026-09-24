// Arte de la estación 4 de la Ruta del café: la planta de tostión, en la misma sala de
// Habbo de la trilladora (sin puerta de cargue y con paredes cálidas). Adentro: la
// tostadora de tambor con su quemador, chimenea y extractor; el cilindro de gas; el
// colector de cascarilla; la bandeja de enfriamiento con aspas; el molino y su cable; un
// estante con café empacado. Todo por código.

import { CLEAR, PixelBuffer, hex, mix, type Color } from "../pixel/buffer.ts";
import * as finca from "./finca-art.ts";
import { C as T, P, drawRoom as drawShell, floorShadow, isoBox, onFront, onSide, type BoxColors, type Pt } from "./trilladora-art.ts";

export { P };
export const W = finca.W;
export const H = finca.H;

export const C = {
  ...T,
  wallWarm: hex("#efe2cf"),
  wallWarmShade: hex("#d9c7ad"),
  brick: hex("#a9553a"),
  brickDark: hex("#86412b"),
  roaster: hex("#2f3437"),
  roasterLit: hex("#474e52"),
  roasterDark: hex("#1f2326"),
  copper: hex("#c07a3c"),
  copperLit: hex("#e0a060"),
  copperDark: hex("#8e5424"),
  flame: hex("#ffb13b"),
  flameCore: hex("#fff1a8"),
  flameBlue: hex("#5fb2ff"),
  bean: hex("#5a3421"),
  beanDark: hex("#3b2014"),
  beanLit: hex("#7d4b2f"),
  chaff: hex("#d6b56c"),
  chaffDark: hex("#b08f48"),
  aluminum: hex("#c9ced2"),
  aluminumDark: hex("#9aa1a6"),
  hose: hex("#2a2c2e"),
  tape: hex("#9aa0a4"),
  cage: hex("#6d7479"),
  canaleta: hex("#f4f4f0"),
  smoke: hex("#8f9396"),
  kraft: hex("#b98a55"),
  kraftDark: hex("#946a3c"),
  soap: hex("#d9f3ff"),
};

type P3 = [number, number, number];

function edge(buf: PixelBuffer, a: P3, b: P3, c: Color) {
  const pa = P(...a);
  const pb = P(...b);
  buf.line(pa.x, pa.y, pb.x, pb.y, c);
}

// --- Sala ----------------------------------------------------------------------------

/** Sala cálida, sin puerta de cargue; el estante con café empacado en la pared izquierda. */
export function drawRoom(buf: PixelBuffer) {
  drawShell(buf, {
    door: false,
    wallLit: C.wallWarm,
    wallShade: C.wallWarmShade,
    zocalo: C.brick,
    zocaloDark: C.brickDark,
    extinguisherI: 7.55,
  });
  // Estante de madera con bolsas de café tostado.
  const j0 = 3.3;
  const j1 = 5.9;
  for (const z of [22, 40, 58]) {
    onSide(buf, 0.04, [j0, j1, z - 2, z], (j, zz) => (j >= j0 && j <= j1 && zz >= z - 2 && zz <= z ? C.woodDark : CLEAR));
    for (let k = 0; k < 5; k++) {
      const jj = j0 + 0.25 + k * 0.5;
      onSide(buf, 0.08, [jj, jj + 0.34, z, z + 12], (j, zz) => {
        if (j < jj || j > jj + 0.34 || zz < z || zz > z + 11) return CLEAR;
        if (zz > z + 9) return C.kraftDark;
        if (Math.abs(zz - z - 5) < 1.4 && Math.abs(j - jj - 0.17) < 0.07) return C.bean;
        return j > jj + 0.26 ? C.kraftDark : C.kraft;
      }, C.outline);
    }
  }
  for (const jj of [j0, j1]) edge(buf, [0.05, jj, 16], [0.05, jj, 62], C.woodDark);
}

/** Canaleta blanca al pie de las paredes (versión correcta): por ahí va el cable. */
export function drawCanaleta(buf: PixelBuffer) {
  onFront(buf, 0.03, [1.2, 7.3, 11, 14], (i, z) => (i >= 1.2 && i <= 7.3 && z >= 11 && z <= 14 ? C.canaleta : CLEAR), C.aluminumDark);
  onSide(buf, 0.03, [0.1, 5.2, 11, 14], (j, z) => (j >= 0.1 && j <= 5.2 && z >= 11 && z <= 14 ? C.canaleta : CLEAR), C.aluminumDark);
}

// --- Molino y cable ---------------------------------------------------------------

export const GRINDER = { i0: 0.35, i1: 1.35, j0: 4.9, j1: 6.0, h: 24 };
export const OUTLET = { i: 7.2, z: 12 };

export function drawGrinder(buf: PixelBuffer) {
  const g = GRINDER;
  floorShadow(buf, g.i0, g.j0, g.i1 - g.i0, g.j1 - g.j0, 0.25);
  for (const [li, lj] of [
    [g.i1 - 0.1, g.j1 - 0.1],
    [g.i1 - 0.1, g.j0 + 0.05],
    [g.i0 + 0.05, g.j1 - 0.1],
  ] as [number, number][]) {
    const a = P(li, lj, 0);
    const b = P(li, lj, g.h);
    buf.rect(a.x - 1, b.y, 2, a.y - b.y, C.woodDark);
  }
  isoBox(buf, g.i0, g.j0, g.h - 3, g.i1 - g.i0, g.j1 - g.j0, 3, { top: C.wood, front: C.woodDark, side: C.woodDark, line: C.outline });
  // Molino: cuerpo rojo y tolva de vidrio con grano.
  isoBox(buf, g.i0 + 0.3, g.j0 + 0.35, g.h, 0.45, 0.45, 16, { top: C.red, front: C.red, side: C.redDark, line: C.outline });
  isoBox(buf, g.i0 + 0.33, g.j0 + 0.38, g.h + 16, 0.4, 0.4, 9, { top: C.bean, front: mix(C.glass, C.bean, 0.4), side: mix(C.glass, C.beanDark, 0.4), line: C.outline });
}

/** Punto medio del cable regado (para las zonas). */
export function cableMid(): Pt {
  return P(4.4, 3.9, 0);
}

/**
 * Extensión eléctrica: del tomacorriente de la pared derecha, cruzando el piso por donde se
 * camina, hasta el molino, con un empalme de cinta. En la versión correcta va por la canaleta.
 */
export function drawCable(buf: PixelBuffer, good: boolean) {
  const outlet = P(OUTLET.i, 0.02, OUTLET.z);
  buf.rect(outlet.x - 2, outlet.y - 3, 5, 6, C.canaleta);
  buf.rect(outlet.x - 1, outlet.y - 1, 1, 2, C.outline);
  buf.rect(outlet.x + 1, outlet.y - 1, 1, 2, C.outline);
  if (good) return;
  const pts: P3[] = [
    [OUTLET.i, 0.05, OUTLET.z],
    [OUTLET.i, 0.3, 0.3],
    [6.4, 2.6, 0.3],
    [4.4, 3.9, 0.3],
    [2.6, 4.3, 0.3],
    [GRINDER.i1, GRINDER.j0 + 0.4, 0.3],
    [GRINDER.i1 - 0.1, GRINDER.j0 + 0.4, GRINDER.h - 2],
  ];
  for (let k = 0; k + 1 < pts.length; k++) {
    edge(buf, pts[k], pts[k + 1], C.hose);
    const a = P(...pts[k]);
    const b = P(...pts[k + 1]);
    buf.line(a.x, a.y + 1, b.x, b.y + 1, mix(C.hose, C.floor, 0.5));
  }
  // Empalme con cinta, en plena zona de paso.
  const m = cableMid();
  buf.rect(m.x - 3, m.y - 2, 7, 3, C.tape);
  buf.px(m.x - 1, m.y - 2, hex("#ffffff"));
  buf.px(m.x + 4, m.y - 3, C.red);
}

// --- Tostadora -------------------------------------------------------------------

export const ROASTER = { i0: 3.9, i1: 5.9, j0: 0.25, j1: 1.5, h: 46 };
export const DRUM = { i: 4.8, z: 28, r: 12 };
export const TRIER = { i: 5.55, z: 30 };
export const FAN = { i: 6.9, z: 66, r: 8 };
export const CYLINDER = { i: 6.55, j: 1.0 };
export const CYCLONE = { i: 2.85, j: 0.6 };
export const TRAY = { i: 4.85, j: 3.15, r: 1.0, z: 16 };

const BODY: BoxColors = { top: C.roasterLit, front: C.roaster, side: C.roasterDark, line: hex("#0f1113") };
const COPPER: BoxColors = { top: C.copperLit, front: C.copper, side: C.copperDark, line: C.outline };

export interface RoasterState {
  on: boolean;
  t: number;
  /** Extractor andando (versión correcta). */
  fanOn: boolean;
}

export function drawRoaster(buf: PixelBuffer, s: RoasterState) {
  const R = ROASTER;
  floorShadow(buf, R.i0 - 0.1, R.j0, R.i1 - R.i0 + 0.2, R.j1 - R.j0 + 0.3, 0.3);
  // Base con el quemador (se ve la llama por la ranura cuando está prendida).
  isoBox(buf, R.i0, R.j0, 0, R.i1 - R.i0, R.j1 - R.j0, 12, BODY);
  onFront(buf, R.j1, [R.i0 + 0.4, R.i1 - 0.4, 3, 9], (i, z) => {
    if (i < R.i0 + 0.4 || i > R.i1 - 0.4 || z < 3 || z > 9) return CLEAR;
    if (!s.on) return hex("#141618");
    const flick = Math.sin(i * 9 + s.t * 18) * 1.2;
    if (z < 5 + flick * 0.3) return C.flameBlue;
    return z < 7 + flick ? C.flame : C.flameCore;
  });
  // Cuerpo del tambor.
  isoBox(buf, R.i0 + 0.1, R.j0, 12, R.i1 - R.i0 - 0.2, R.j1 - R.j0, R.h - 12, BODY);
  // Frente redondo de cobre, con mirilla y la puerta de descargue.
  onFront(buf, R.j1 + 0.02, [DRUM.i - 0.8, DRUM.i + 0.8, DRUM.z - DRUM.r - 1, DRUM.z + DRUM.r + 1], (i, z) => {
    const dx = (i - DRUM.i) * 20;
    const dz = z - DRUM.z;
    const d = Math.hypot(dx, dz);
    if (d > DRUM.r) return CLEAR;
    if (d > DRUM.r - 2) return dz > 0 && dx < 0 ? C.copperLit : C.copper;
    if (Math.hypot(dx + 3, dz - 3) < 3.2) {
      // Mirilla: se ve el grano girando.
      const a = Math.atan2(dz - 3, dx + 3) + (s.on ? s.t * 5 : 0);
      return Math.sin(a * 3) > 0 ? C.bean : C.beanLit;
    }
    if (Math.abs(dz + 5) < 1.2 && Math.abs(dx) < 6) return C.copperDark;
    return C.roasterLit;
  }, C.outline);
  // Cuchara de muestreo asomada al lado del tambor.
  isoBox(buf, TRIER.i - 0.05, R.j1, TRIER.z, 0.1, 0.35, 2, { top: C.steelLit, front: C.steel, side: C.steelDark });
  isoBox(buf, TRIER.i - 0.07, R.j1 + 0.35, TRIER.z - 1, 0.14, 0.12, 4, { top: C.woodDark, front: C.wood, side: C.woodDark });
  // Tolva de carga arriba: embudo de cobre con el café verde adentro.
  isoBox(buf, 4.6, 0.65, R.h, 0.45, 0.45, 5, COPPER);
  const hop = P(4.82, 0.88, R.h + 5);
  buf.implicit(hop.x - 14, hop.y - 14, hop.x + 14, hop.y + 2, (x, y) => {
    const u = (x - hop.x) / 13;
    const top = hop.y - 11;
    const half = 0.45 + ((hop.y - y) / 11) * 0.55;
    if (y > hop.y || y < top - 4 || Math.abs(u) > half) return CLEAR;
    const e = ((x - hop.x) / 13) ** 2 + ((y - top) / 4) ** 2;
    if (e <= 1) return e < 0.62 ? ((Math.floor(x) + Math.floor(y) * 2) % 3 === 0 ? C.green : mix(C.green, C.outline, 0.3)) : C.copperLit;
    if (y < top) return CLEAR;
    return u < -0.2 ? C.copperLit : u > 0.25 ? C.copperDark : C.copper;
  }, C.outline);
  // Ducto de humos: sube por atrás y va por la pared hasta el extractor.
  isoBox(buf, 5.5, 0.3, R.h, 0.3, 0.3, 14, { top: C.steelLit, front: C.steel, side: C.steelDark, line: C.outline });
  isoBox(buf, 5.5, 0.05, R.h + 12, FAN.i - 5.5 - 0.3, 0.3, 5, { top: C.steelLit, front: C.steel, side: C.steelDark, line: C.outline });
  // Ducto al ciclón (colector de cascarilla), por el lado izquierdo.
  isoBox(buf, CYCLONE.i + 0.2, 0.45, R.h - 8, R.i0 - CYCLONE.i - 0.2, 0.25, 4, { top: C.steelLit, front: C.steel, side: C.steelDark, line: C.outline });
  drawFan(buf, s.fanOn, s.t);
}

/** Extractor en la pared derecha: aspas que giran si está prendido. */
function drawFan(buf: PixelBuffer, on: boolean, t: number) {
  const spin = on ? t * 12 : 0.4;
  onFront(buf, 0.03, [FAN.i - 0.6, FAN.i + 0.6, FAN.z - FAN.r - 2, FAN.z + FAN.r + 2], (i, z) => {
    const dx = (i - FAN.i) * 20;
    const dz = z - FAN.z;
    const d = Math.hypot(dx, dz);
    if (d > FAN.r + 1.5) return CLEAR;
    if (d > FAN.r) return C.steelDark;
    if (d < 1.6) return C.steelLit;
    const a = Math.atan2(dz, dx) + spin;
    const blade = Math.sin(a * 2) > 0.35;
    if (on && !blade) return mix(C.steelDark, C.wallWarmShade, 0.4);
    return blade ? C.steel : hex("#22272a");
  }, C.outline);
}

/** Punto del extractor (para las zonas). */
export function fanCenter(): Pt {
  return P(FAN.i, 0.03, FAN.z);
}

// --- Gas ---------------------------------------------------------------------------

/** Cilindro de propano (color aluminio, art. 203) con su manguera al quemador. */
export function drawCylinder(buf: PixelBuffer, good: boolean) {
  const base = P(CYLINDER.i, CYLINDER.j, 0);
  const r = 6;
  const h = 30;
  buf.shadow(base.x, base.y, r + 2, 3, C.shadow, 0.3);
  // Manguera hasta el quemador.
  const burner = P(ROASTER.i1, 1.25, 6);
  buf.line(base.x - 1, base.y - h - 4, base.x - 6, base.y - h + 2, C.hose);
  buf.line(base.x - 6, base.y - h + 2, burner.x + 4, burner.y - 2, C.hose);
  buf.line(burner.x + 4, burner.y - 2, burner.x, burner.y, C.hose);
  buf.implicit(base.x - r - 1, base.y - h - r, base.x + r + 1, base.y + r, (x, y) => {
    const dx = (x - base.x) / r;
    if (Math.abs(dx) > 1) return CLEAR;
    const top = base.y - h;
    const ey = Math.sqrt(1 - dx * dx) * r * 0.5;
    if (y < top - ey || y > base.y + ey) return CLEAR;
    if (y < top + ey) return (y - (top - ey)) < ey ? C.aluminum : C.aluminumDark;
    if (dx < -0.4) return C.aluminum;
    return dx > 0.5 ? C.aluminumDark : mix(C.aluminum, C.aluminumDark, 0.4);
  }, C.outline);
  // Válvula.
  buf.rect(base.x - 1, base.y - h - 6, 3, 4, C.steelDark);
  buf.rect(base.x - 2, base.y - h - 7, 5, 2, C.red);
  if (good) {
    // Jaula metálica con cadena, contra la pared.
    const g = (i: number, j: number, z: number) => P(i, j, z);
    for (let k = 0; k <= 4; k++) {
      const i = CYLINDER.i - 0.4 + k * 0.2;
      const a = g(i, CYLINDER.j + 0.4, 0);
      const b = g(i, CYLINDER.j + 0.4, 40);
      buf.line(a.x, a.y, b.x, b.y, C.cage);
    }
    for (const z of [2, 20, 40]) {
      const a = g(CYLINDER.i - 0.4, CYLINDER.j + 0.4, z);
      const b = g(CYLINDER.i + 0.4, CYLINDER.j + 0.4, z);
      buf.line(a.x, a.y, b.x, b.y, C.cage);
    }
    const c1 = g(CYLINDER.i - 0.35, CYLINDER.j + 0.1, 22);
    const c2 = g(CYLINDER.i + 0.35, CYLINDER.j + 0.1, 22);
    for (let x = 0; x <= 1; x += 0.1) buf.px(c1.x + (c2.x - c1.x) * x, c1.y + (c2.y - c1.y) * x + (x * 10 % 2 < 1 ? 0 : 1), C.steelDark);
  }
}

export function valvePoint(): Pt {
  const base = P(CYLINDER.i, CYLINDER.j, 0);
  return { x: base.x, y: base.y - 34 };
}

// --- Colector de cascarilla ---------------------------------------------------------

export function drawCyclone(buf: PixelBuffer, overflowing: boolean) {
  const base = P(CYCLONE.i, CYCLONE.j, 0);
  const r = 8;
  buf.shadow(base.x, base.y, r + 4, 4, C.shadow, 0.3);
  // Caneca de la cascarilla, debajo.
  buf.implicit(base.x - r, base.y - 14, base.x + r, base.y + 4, (x, y) => {
    const dx = (x - base.x) / (r - 1);
    if (Math.abs(dx) > 1) return CLEAR;
    const ey = Math.sqrt(1 - dx * dx) * (r - 1) * 0.5;
    if (y < base.y - 12 - ey || y > base.y + ey) return CLEAR;
    if (y < base.y - 12 + ey) return overflowing ? C.chaff : hex("#1c1f21");
    return dx > 0.4 ? C.steelDark : C.steel;
  }, C.outline);
  // Ciclón: cilindro con cono, sobre patas.
  const top = base.y - 58;
  buf.implicit(base.x - r - 1, top - r, base.x + r + 1, base.y - 16, (x, y) => {
    const dx = (x - base.x) / r;
    const cone = y > top + 26 ? 1 - (y - top - 26) / 20 : 1;
    if (Math.abs(dx) > cone || cone <= 0.15) return CLEAR;
    const ey = Math.sqrt(Math.max(0, 1 - dx * dx)) * r * 0.5;
    if (y < top - ey) return CLEAR;
    if (y < top + ey) return C.steelLit;
    return dx < -0.3 * cone ? C.steelLit : dx > 0.4 * cone ? C.steelDark : C.steel;
  }, C.outline);
  buf.line(base.x - 5, base.y - 16, base.x - 6, base.y - 2, C.steelDark);
  buf.line(base.x + 5, base.y - 16, base.x + 6, base.y - 2, C.steelDark);
  if (overflowing) {
    // Montones de cascarilla regados hacia el quemador.
    const pile = [
      [3.0, 1.1, 5],
      [3.4, 1.35, 4],
      [3.75, 1.65, 3.2],
      [2.7, 1.25, 3],
    ];
    for (const [pi, pj, pr] of pile) {
      const c = P(pi, pj, 0);
      buf.implicit(c.x - pr * 2, c.y - pr, c.x + pr * 2, c.y + 2, (x, y) => {
        const d = ((x - c.x) / (pr * 1.8)) ** 2 + ((y - c.y) / pr) ** 2;
        if (d > 1 || y > c.y + 1) return CLEAR;
        return (Math.floor(x) * 3 + Math.floor(y) * 5) % 4 === 0 ? C.chaffDark : C.chaff;
      });
    }
  }
}

export function cycloneCenter(): Pt {
  const b = P(CYCLONE.i, CYCLONE.j, 0);
  return { x: b.x, y: b.y - 30 };
}

export function chaffPile(): Pt {
  return P(3.35, 1.3, 2);
}

// --- Bandeja de enfriamiento ------------------------------------------------------

export interface TrayState {
  t: number;
  /** Granos en la bandeja. */
  beans: boolean;
  /** Aspas girando. */
  spinning: boolean;
}

export function trayCenter(): Pt {
  return P(TRAY.i, TRAY.j, TRAY.z + 3);
}

export function drawTray(buf: PixelBuffer, s: TrayState) {
  const c = P(TRAY.i, TRAY.j, TRAY.z);
  const rx = TRAY.r * 28.3;
  const ry = TRAY.r * 14.1;
  const floor = P(TRAY.i, TRAY.j, 0);
  buf.shadow(floor.x, floor.y, rx * 0.9, ry * 0.9, C.shadow, 0.3);
  // Patas.
  for (const [dx, dy] of [
    [-rx * 0.6, 3],
    [rx * 0.6, 3],
    [0, ry * 0.7],
  ]) {
    buf.rect(c.x + dx - 1, c.y + dy, 2, floor.y - c.y - dy + ry * 0.3, C.steelDark);
  }
  // Cuerpo: borde de acero con el grano adentro.
  buf.implicit(c.x - rx - 1, c.y - ry - 6, c.x + rx + 1, c.y + ry + 6, (x, y) => {
    const u = (x - c.x) / rx;
    const vTop = (y - (c.y - 4)) / ry;
    const vBot = (y - c.y) / ry;
    const inTop = u * u + vTop * vTop <= 1;
    const inBot = u * u + vBot * vBot <= 1;
    if (inTop) {
      if (u * u + vTop * vTop > 0.84) return C.steelLit;
      if (!s.beans) return hex("#3a3f42");
      const n = (Math.floor(x) * 7 + Math.floor(y) * 13) % 5;
      return n === 0 ? C.beanDark : n === 1 ? C.beanLit : C.bean;
    }
    if (inBot || (Math.abs(u) <= 1 && y > c.y - 4 && y < c.y)) return u < -0.4 ? C.steel : C.steelDark;
    return CLEAR;
  }, C.outline);
  // Aspas: dos brazos que giran sobre el eje.
  const a0 = s.spinning ? s.t * 1.6 : 0.5;
  const hub = P(TRAY.i, TRAY.j, TRAY.z + 6);
  for (let k = 0; k < 4; k++) {
    const a = a0 + (k * Math.PI) / 2;
    const tip = P(TRAY.i + Math.cos(a) * TRAY.r * 0.85, TRAY.j + Math.sin(a) * TRAY.r * 0.85, TRAY.z + 6);
    buf.line(hub.x, hub.y, tip.x, tip.y, C.steelLit);
    buf.line(hub.x, hub.y + 1, tip.x, tip.y + 1, C.outline);
  }
  buf.rect(hub.x - 2, hub.y - 6, 4, 6, C.steel);
  buf.rect(hub.x - 2, hub.y - 7, 4, 1, C.steelLit);
}

/** Granos regados por el piso alrededor de la bandeja (versión con error). */
export function drawSpilled(buf: PixelBuffer) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 46; k++) {
    const a = rnd() * Math.PI * 2;
    const d = TRAY.r * (1.05 + rnd() * 0.9);
    const p = P(TRAY.i + Math.cos(a) * d, TRAY.j + Math.sin(a) * d * 0.9 + 0.3, 0);
    buf.px(p.x, p.y, C.bean);
    buf.px(p.x + 1, p.y, C.beanDark);
    if (rnd() > 0.6) buf.px(p.x, p.y - 1, C.beanLit);
  }
}

export function spillPoint(): Pt {
  return P(TRAY.i + 0.2, TRAY.j + 1.35, 0);
}

/** Chorro de granos de la puerta del tambor a la bandeja (al descargar). */
export function drawPour(buf: PixelBuffer, t: number) {
  const a = P(DRUM.i, ROASTER.j1 + 0.1, DRUM.z - 6);
  const b = P(TRAY.i, TRAY.j - 0.4, TRAY.z + 4);
  for (let k = 0; k < 14; k++) {
    const u = ((k / 14 + t * 2) % 1 + 1) % 1;
    const x = a.x + (b.x - a.x) * u + Math.sin(k * 3.1) * 1.5;
    const y = a.y + (b.y - a.y) * u + u * u * 4;
    buf.px(x, y, k % 3 === 0 ? C.beanLit : C.bean);
  }
}
