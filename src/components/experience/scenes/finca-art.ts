// Arte de la estación 1 de la Ruta del café: una finca de ladera del Eje Cafetero en el
// lenguaje de Habbo (isométrica 2:1, contorno oscuro, luz desde la izquierda). Todo se
// dibuja por código: cordillera, cafetales en surcos, palmas de cera, guadua, la casa de
// bahareque con puertas de colores, la terraza de pasto, los cafetos, la mula y los costales.

import { CLEAR, PixelBuffer, hex, mix, seeded, type Color } from "../pixel/buffer.ts";

export const W = 400;
export const H = 250;

// Terraza isométrica: baldosas de 40x20 (la relación avatar/baldosa de Habbo).
export const TILE_W = 40;
export const TILE_H = 20;
export const GRID_I = 7;
export const GRID_J = 6;
const X0 = 200;
const Y0 = 100;
const THICK = 12;

export function iso(i: number, j: number, h = 0) {
  return { x: X0 + (i - j) * (TILE_W / 2), y: Y0 + (i + j) * (TILE_H / 2) - h };
}

export const C = {
  outline: hex("#2a1e17"),
  leafOutline: hex("#1f3a1c"),
  sky: ["#86cdef", "#98d5f1", "#aadcf2", "#bde4f2", "#cfeaf0", "#dff0ea"].map((c) => hex(c)),
  sun: hex("#fff7d6"),
  sunCore: hex("#fffdf0"),
  cloud: hex("#ffffff"),
  cloudShade: hex("#d7e9f2"),
  far: hex("#94b8c8"),
  farLight: hex("#a9c8d5"),
  mid: hex("#7faf5b"),
  midDark: hex("#6a9a4b"),
  rows: hex("#557f3b"),
  near: hex("#5f9944"),
  nearDark: hex("#4d833a"),
  nearDots: hex("#3f6f30"),
  grass: hex("#7cba4c"),
  grassAlt: hex("#76b347"),
  grassDark: hex("#5f9b3a"),
  grassLight: hex("#9ccf68"),
  lip: hex("#4f8a31"),
  soil: hex("#8b5d3b"),
  soilDark: hex("#6d472c"),
  stone: hex("#a58c70"),
  mud: hex("#86583a"),
  mudDark: hex("#6a4329"),
  mudWet: hex("#5a3822"),
  puddle: hex("#8fb2bd"),
  puddleLight: hex("#c9e2ea"),
  leaf: hex("#3f7a34"),
  leafDark: hex("#2f5f28"),
  leafLight: hex("#5f9b45"),
  cherry: hex("#d1352b"),
  cherryDark: hex("#9c2019"),
  cherryYellow: hex("#f1c232"),
  cherryGreen: hex("#8ab545"),
  palmTrunk: hex("#e4ddd0"),
  palmShade: hex("#b8b0a2"),
  palmLeaf: hex("#3d6a36"),
  guadua: hex("#7db04a"),
  guaduaDark: hex("#5b8a30"),
  guaduaNode: hex("#c9d98a"),
  wallLit: hex("#f6f1e6"),
  wallShade: hex("#d8cebd"),
  beam: hex("#6b3e26"),
  zocalo: hex("#2f7d4a"),
  zocaloDark: hex("#23613a"),
  roof: hex("#b7492f"),
  roofDark: hex("#8e3523"),
  roofLine: hex("#7a2b1c"),
  door: hex("#2d6db5"),
  doorDark: hex("#1f4f86"),
  shutterRed: hex("#c8323c"),
  shutterYellow: hex("#f0bd2e"),
  flower: hex("#e0457b"),
  burlap: hex("#bb9b69"),
  burlapDark: hex("#957549"),
  burlapLight: hex("#d4b886"),
  rope: hex("#6b4a2a"),
  wood: hex("#86552f"),
  woodDark: hex("#5f3a1f"),
  wicker: hex("#c89b55"),
  wickerDark: hex("#9b7134"),
  mule: hex("#7a5034"),
  muleDark: hex("#5c3a24"),
  muleLight: hex("#a88263"),
  mane: hex("#35231a"),
  blanket: hex("#c8323c"),
  blanketStripe: hex("#f2c230"),
  plantain: hex("#7fbf4a"),
  plantainDark: hex("#5e9a36"),
  plantainRib: hex("#c3dd7a"),
  plantainTrunk: hex("#8aa150"),
  shadow: hex("#1b2a14"),
};

// --- Fondo -----------------------------------------------------------------

/** Cielo de mañana en franjas con tramado, el degradé "pixel" de Habbo. */
export function drawSky(buf: PixelBuffer) {
  const steps = C.sky.length - 1;
  for (let y = 0; y < H; y++) {
    const t = Math.min(1, y / 120) * steps;
    const k = Math.floor(t);
    const frac = t - k;
    for (let x = 0; x < W; x++) {
      const dither = frac > 0.75 || (frac > 0.4 && (x + y) % 2 === 0);
      buf.px(x, y, C.sky[Math.min(steps, k + (dither ? 1 : 0))]);
    }
  }
  // Sol de la mañana, a la izquierda: de ahí viene la luz de toda la escena.
  for (let r = 16; r > 11; r -= 2) {
    for (let a = 0; a < 360; a += 3) {
      const x = 62 + Math.cos((a * Math.PI) / 180) * r;
      const y = 30 + Math.sin((a * Math.PI) / 180) * r;
      if ((Math.round(x) + Math.round(y)) % 2 === 0) buf.px(x, y, mix(buf.get(x, y), C.sun, 0.5));
    }
  }
  buf.disc(62, 30, 10, C.sun);
  buf.disc(61, 29, 7, C.sunCore);
}

export function cloudSprite(seed: number, size: number): PixelBuffer {
  const rnd = seeded(seed);
  const w = Math.round(46 * size);
  const h = Math.round(20 * size);
  const b = new PixelBuffer(w, h);
  const puffs = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < puffs; i++) {
    const cx = w * (0.18 + (0.64 * i) / (puffs - 1)) + (rnd() - 0.5) * 4;
    const r = h * (0.28 + rnd() * 0.22) * (i === 0 || i === puffs - 1 ? 0.75 : 1);
    b.disc(cx, h - r - 2, r, C.cloud);
  }
  b.rect(w * 0.12, h - 6, w * 0.76, 4, C.cloud);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (b.get(x, y) && y > h - 6 && (x + y) % 2 === 0) b.px(x, y, C.cloudShade);
      if (b.get(x, y) && y > h - 4) b.px(x, y, C.cloudShade);
    }
  }
  return b;
}

const ridge = (x: number, base: number, parts: [number, number, number][]) =>
  base - parts.reduce((acc, [amp, freq, phase]) => acc + amp * Math.sin(x * freq + phase), 0);

export const farRidge = (x: number) =>
  ridge(x, 50, [
    [9, 0.014, 1],
    [6, 0.033, 2.4],
    [2, 0.09, 0.3],
  ]);
export const midRidge = (x: number) =>
  ridge(x, 70, [
    [8, 0.019, 0.4],
    [4, 0.047, 1.6],
    [1.5, 0.11, 2],
  ]);
// La loma cercana sube detrás de la terraza: ahí se asienta la casa.
export const nearRidge = (x: number) =>
  ridge(x, 92, [
    [5, 0.021, 2.6],
    [3, 0.052, 0.8],
  ]) -
  18 * Math.exp(-(((x - 290) / 55) ** 2));

/** Surcos de café sobre una loma: matas en filas que siguen la curva del terreno. */
function coffeeRows(buf: PixelBuffer, top: (x: number) => number, gap: number, size: number, seed: number, from = 0) {
  const rnd = seeded(seed);
  for (let row = from; row < 40; row++) {
    const offset = 3 + row * gap;
    const step = size * 2.4;
    for (let x0 = (row % 2) * step * 0.5 - 4; x0 < W + 4; x0 += step) {
      const x = x0 + (rnd() - 0.5) * 1.5;
      const y = top(x) + offset + (rnd() - 0.5);
      if (y > H + 4) continue;
      const lit = (row + Math.floor(x0 / step)) % 7 !== 0;
      buf.ellipse(x, y, size, size * 0.7, lit ? C.leaf : C.leafDark);
      if (size > 1.6) {
        buf.px(x - 1, y - 1, C.leafLight);
        buf.px(x + size - 1, y + 1, C.leafDark);
        if (rnd() > 0.6) buf.px(x + (rnd() - 0.5) * size, y, rnd() > 0.3 ? C.cherry : C.cherryYellow);
      }
    }
  }
}

/** Cordillera, lomas con cafetales en surcos, palmas de cera y la loma cercana. */
export function drawLandscape(buf: PixelBuffer) {
  const rnd = seeded(7);
  for (let x = 0; x < W; x++) {
    const top = Math.round(farRidge(x));
    for (let y = top; y < H; y++) buf.px(x, y, y < top + 2 ? C.farLight : C.far);
    if (x > 300 && x < 330 && top < 44) buf.px(x, top, hex("#dbe9ef"));
  }

  for (const px of [18, 44, 118, 150, 356, 382]) drawWaxPalm(buf, px, Math.round(midRidge(px)) + 2, 24 + ((px * 7) % 14));

  for (let x = 0; x < W; x++) {
    const top = Math.round(midRidge(x));
    for (let y = top; y < H; y++) buf.px(x, y, y < top + 2 ? mix(C.mid, C.farLight, 0.35) : C.mid);
  }
  // Surcos lejanos: puntitos en filas.
  for (let row = 0; row < 8; row++) {
    for (let x = row % 2; x < W; x += 3) {
      const y = Math.round(midRidge(x) + 4 + row * 3.2);
      if (buf.get(x, y)) buf.px(x, y, C.rows);
    }
  }
  // Manchas de plátano y guamo (sombrío) entre los surcos.
  for (let i = 0; i < 22; i++) {
    const x = rnd() * W;
    const y = midRidge(x) + 5 + rnd() * 18;
    buf.ellipse(x, y, 2 + rnd() * 2, 1.6, rnd() > 0.5 ? hex("#a3c95e") : hex("#4f7f36"));
  }

  for (let x = 0; x < W; x++) {
    const top = Math.round(nearRidge(x));
    for (let y = top; y < H; y++) buf.px(x, y, y < top + 2 ? C.midDark : C.near);
  }
  coffeeRows(buf, nearRidge, 7, 2.6, 11, 0);

  drawGuadua(buf, 16, nearRidge(16) + 34, 7);
  drawGuadua(buf, 380, nearRidge(380) + 30, 11);
}

function drawWaxPalm(buf: PixelBuffer, x: number, base: number, height: number) {
  const top = base - height;
  for (let y = top; y <= base; y++) {
    buf.px(x, y, C.palmTrunk);
    buf.px(x + 1, y, C.palmShade);
  }
  const fronds: [number, number][] = [
    [-4, 2],
    [-3, -2],
    [0, -3],
    [3, -2],
    [4, 2],
  ];
  for (const [dx, dy] of fronds) buf.line(x, top, x + dx, top + dy, C.palmLeaf);
  buf.px(x, top - 1, C.palmLeaf);
  buf.px(x + 1, top, C.palmLeaf);
}

function drawGuadua(buf: PixelBuffer, x: number, base: number, seed: number) {
  const rnd = seeded(seed);
  for (let k = 0; k < 9; k++) {
    const sx = x + (k - 4) * 3.2 + rnd() * 2;
    const height = 44 + rnd() * 24;
    const lean = (k - 4) * 0.1 + (rnd() - 0.5) * 0.08;
    let px = sx;
    for (let d = 0; d < height; d++) {
      px = sx + lean * d + (d * d * lean) / 80;
      const y = base - d;
      const node = d % 8 === 0;
      buf.px(px - 1, y, node ? C.guaduaNode : C.guaduaDark);
      buf.px(px, y, node ? C.guaduaNode : C.guadua);
      buf.px(px + 1, y, node ? C.guaduaNode : C.guaduaDark);
      // Ramitas con hojas finas en la mitad de arriba.
      if (d > height * 0.4 && d % 5 === 2) {
        const side = rnd() > 0.5 ? 1 : -1;
        buf.line(px, y, px + side * (4 + rnd() * 3), y + 1 + rnd() * 2, rnd() > 0.5 ? C.leafLight : C.plantainDark);
      }
    }
    buf.ellipse(px + lean * 8, base - height, 4, 2, C.leafLight);
    buf.ellipse(px + lean * 8 + 2, base - height + 2, 3, 1.5, C.plantainDark);
  }
}

// --- Casa de bahareque -------------------------------------------------------

/**
 * Casa campesina en isométrica: paredes blancas, zócalo verde, puerta azul, postigos de
 * colores, flores y techo de teja. (fx, fy) es la esquina del frente a ras de piso.
 */
export function drawHouse(buf: PixelBuffer, fx: number, fy: number) {
  const L = 2.3; // largo, hacia la derecha
  const Wd = 1.5; // fondo, hacia la izquierda
  const wall = 24;
  const rise = 15;
  const eave = 0.22;
  const P = (u: number, v: number, h = 0) => ({
    x: fx + (u - L - (v - Wd)) * 20,
    y: fy + (u - L + (v - Wd)) * 10 - h,
  });
  const quad = (a: { x: number; y: number }[], c: Color) =>
    buf.poly(
      a.flatMap((p) => [p.x, p.y]),
      c,
    );

  // Sombra de la casa en la loma.
  buf.shadow(fx - 4, fy + 2, 46, 7, C.shadow, 0.3);

  // Cara izquierda (frente largo, iluminada): de (0,Wd) a (L,Wd).
  quad([P(0, Wd), P(L, Wd), P(L, Wd, wall), P(0, Wd, wall)], C.wallLit);
  // Cara derecha (hastial, en sombra): de (L,Wd) a (L,0).
  quad([P(L, Wd), P(L, 0), P(L, 0, wall), P(L, Wd, wall)], C.wallShade);
  // Zócalo pintado.
  quad([P(0, Wd), P(L, Wd), P(L, Wd, 5), P(0, Wd, 5)], C.zocalo);
  quad([P(L, Wd), P(L, 0), P(L, 0, 5), P(L, Wd, 5)], C.zocaloDark);

  // Vigas de madera en las esquinas y bajo el alero.
  buf.line(P(L, Wd).x, P(L, Wd).y, P(L, Wd, wall).x, P(L, Wd, wall).y, C.beam);
  buf.line(P(0, Wd).x, P(0, Wd).y, P(0, Wd, wall).x, P(0, Wd, wall).y, C.beam);
  buf.line(P(0, Wd, wall).x, P(0, Wd, wall).y, P(L, Wd, wall).x, P(L, Wd, wall).y, C.beam);
  buf.line(P(L, Wd, wall).x, P(L, Wd, wall).y, P(L, 0, wall).x, P(L, 0, wall).y, C.beam);

  // Puerta azul y ventanas con postigos de colores en el frente.
  const door = (u: number, w: number, h: number, frame: Color, fill: Color) => {
    quad([P(u, Wd, 1), P(u + w, Wd, 1), P(u + w, Wd, h), P(u, Wd, h)], frame);
    quad([P(u + 0.05, Wd, 2), P(u + w - 0.05, Wd, 2), P(u + w - 0.05, Wd, h - 2), P(u + 0.05, Wd, h - 2)], fill);
  };
  door(1.0, 0.42, 18, C.doorDark, C.door);
  const win = (u: number, color: Color) => {
    quad([P(u, Wd, 10), P(u + 0.3, Wd, 10), P(u + 0.3, Wd, 18), P(u, Wd, 18)], hex("#3a2a20"));
    quad([P(u - 0.14, Wd, 10), P(u, Wd, 10), P(u, Wd, 18), P(u - 0.14, Wd, 18)], color);
    quad([P(u + 0.3, Wd, 10), P(u + 0.44, Wd, 10), P(u + 0.44, Wd, 18), P(u + 0.3, Wd, 18)], color);
  };
  win(0.36, C.shutterRed);
  win(1.72, C.shutterYellow);
  // Ventana del hastial.
  quad([P(L, 0.55, 11), P(L, 0.95, 11), P(L, 0.95, 18), P(L, 0.55, 18)], C.shutterRed);
  // Materas con flores bajo las ventanas.
  for (const u of [0.3, 0.55, 1.62, 1.9]) {
    const p = P(u, Wd, 7);
    buf.rect(p.x - 1, p.y, 4, 2, hex("#a4532e"));
    buf.px(p.x, p.y - 1, C.flower);
    buf.px(p.x + 2, p.y - 2, C.flower);
    buf.px(p.x + 1, p.y - 1, C.leafLight);
  }

  // Techo de teja a dos aguas: la cumbrera corre a lo largo.
  const ridgeA = P(-eave, Wd / 2, wall + rise);
  const ridgeB = P(L + eave, Wd / 2, wall + rise);
  const eaveFront0 = P(-eave, Wd + eave, wall - 2);
  const eaveFront1 = P(L + eave, Wd + eave, wall - 2);
  const eaveBack1 = P(L + eave, -eave, wall - 2);
  // Agua del frente (iluminada) con filas de teja.
  quad([eaveFront0, eaveFront1, ridgeB, ridgeA], C.roof);
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    const a = { x: eaveFront0.x + (ridgeA.x - eaveFront0.x) * t, y: eaveFront0.y + (ridgeA.y - eaveFront0.y) * t };
    const b = { x: eaveFront1.x + (ridgeB.x - eaveFront1.x) * t, y: eaveFront1.y + (ridgeB.y - eaveFront1.y) * t };
    buf.line(a.x, a.y, b.x, b.y, C.roofLine);
  }
  for (let k = 1; k < 14; k++) {
    const t = k / 14;
    const a = { x: eaveFront0.x + (eaveFront1.x - eaveFront0.x) * t, y: eaveFront0.y + (eaveFront1.y - eaveFront0.y) * t };
    const b = { x: ridgeA.x + (ridgeB.x - ridgeA.x) * t, y: ridgeA.y + (ridgeB.y - ridgeA.y) * t };
    if (k % 2 === 0) buf.line(a.x, a.y, a.x + (b.x - a.x) * 0.2, a.y + (b.y - a.y) * 0.2, C.roofLine);
  }
  // Hastial: triángulo de pared bajo el techo y el agua de atrás que asoma.
  quad([P(L, Wd, wall), P(L, 0, wall), P(L, Wd / 2, wall + rise - 1)], C.wallShade);
  buf.line(P(L, Wd, wall).x, P(L, Wd, wall).y, P(L, Wd / 2, wall + rise - 1).x, P(L, Wd / 2, wall + rise - 1).y, C.beam);
  quad([ridgeB, eaveBack1, P(L + eave, -eave, wall - 4), P(L + eave, Wd / 2, wall + rise - 2)], C.roofDark);
  buf.line(ridgeA.x, ridgeA.y, ridgeB.x, ridgeB.y, C.roofLine);
  buf.line(eaveFront0.x, eaveFront0.y + 1, eaveFront1.x, eaveFront1.y + 1, C.roofLine);
  buf.line(ridgeB.x, ridgeB.y, eaveFront1.x, eaveFront1.y, C.roofLine);
  buf.line(ridgeB.x, ridgeB.y, eaveBack1.x, eaveBack1.y, C.roofLine);
}

// --- Terraza isométrica --------------------------------------------------------

/** Baldosas del camino de barro, en coordenadas de la grilla. */
export const PATH_TILES = new Set(["0,4", "1,4", "2,4", "3,4", "3,3", "3,2", "3,1", "3,0"]);
/** Charcos: centro en coordenadas de grilla. */
export const PUDDLES: [number, number, number][] = [
  [3.45, 2.2, 1],
  [3.3, 0.8, 0.8],
  [1.2, 4.55, 0.9],
];

export function drawPlatform(buf: PixelBuffer) {
  const rnd = seeded(21);
  const top = (i: number, j: number) => iso(i, j);
  // Grosor de la terraza: la cara izquierda iluminada y la derecha en sombra.
  const L = top(0, GRID_J);
  const B = top(GRID_I, GRID_J);
  const R = top(GRID_I, 0);
  buf.poly([L.x, L.y, B.x, B.y, B.x, B.y + THICK, L.x, L.y + THICK], C.soil);
  buf.poly([B.x, B.y, R.x, R.y, R.x, R.y + THICK, B.x, B.y + THICK], C.soilDark);
  for (let k = 0; k < 60; k++) {
    const t = rnd();
    const side = rnd() > 0.5;
    const a = side ? L : B;
    const b = side ? B : R;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t + 3 + rnd() * (THICK - 4);
    buf.px(x, y, rnd() > 0.6 ? C.stone : side ? C.soilDark : hex("#583820"));
  }
  // Raíces colgando del borde.
  for (let k = 0; k < 8; k++) {
    const t = rnd();
    const x = L.x + (B.x - L.x) * t;
    const y = L.y + (B.y - L.y) * t;
    buf.line(x, y + 2, x + (rnd() - 0.5) * 3, y + 5 + rnd() * 4, hex("#4f3520"));
  }

  // Baldosas: pasto en damero suave (como el piso de Habbo) y el camino de barro.
  for (let j = 0; j < GRID_J; j++) {
    for (let i = 0; i < GRID_I; i++) {
      const a = top(i, j);
      const b = top(i + 1, j);
      const c = top(i + 1, j + 1);
      const d = top(i, j + 1);
      const path = PATH_TILES.has(`${i},${j}`);
      const base = path ? C.mud : (i + j) % 2 === 0 ? C.grass : C.grassAlt;
      buf.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y], base);
    }
  }
  // Textura: briznas de pasto y tierra mojada.
  for (let y = Y0; y < Y0 + (GRID_I + GRID_J) * 10; y++) {
    for (let x = 60; x < 350; x++) {
      const c = buf.get(x, y);
      const r = rnd();
      if (c === C.grass || c === C.grassAlt) {
        if (r < 0.06) buf.px(x, y, C.grassDark);
        else if (r < 0.1) buf.px(x, y, C.grassLight);
      } else if (c === C.mud) {
        if (r < 0.12) buf.px(x, y, C.mudDark);
        else if (r < 0.15) buf.px(x, y, hex("#9a6a45"));
      }
    }
  }
  // Borde del camino: se funde con el pasto.
  for (let y = Y0; y < Y0 + 140; y++) {
    for (let x = 60; x < 350; x++) {
      const c = buf.get(x, y);
      if (c !== C.mud && c !== C.mudDark) continue;
      const n = [buf.get(x - 1, y), buf.get(x + 1, y), buf.get(x, y - 1), buf.get(x, y + 1)];
      if (n.some((v) => v === C.grass || v === C.grassAlt) && (x + y) % 2 === 0) buf.px(x, y, C.grassDark);
    }
  }
  for (const [pi, pj, s] of PUDDLES) {
    const p = iso(pi, pj);
    buf.ellipse(p.x, p.y, 7 * s, 2.6 * s, C.mudWet);
    buf.ellipse(p.x, p.y, 5.5 * s, 1.8 * s, C.puddle);
    buf.span(p.y - 1, p.x - 2 * s, p.x + s, C.puddleLight);
  }
  // Labio de pasto sobre el borde de tierra.
  buf.isoLine(L.x, L.y, B.x - L.x, 1, C.lip);
  for (let x = B.x; x < R.x; x++) buf.px(x, B.y - Math.floor((x - B.x) / 2), C.lip);
  buf.isoLine(L.x, L.y + 1, B.x - L.x, 1, C.lip);
}

/** Camino de tierra que sube por la loma desde la terraza hasta la casa. */
export function drawHillPath(buf: PixelBuffer, from: { x: number; y: number }, to: { x: number; y: number }) {
  for (let t = 0; t <= 1; t += 0.01) {
    const x = from.x + (to.x - from.x) * t + Math.sin(t * Math.PI * 2) * 8;
    const y = from.y + (to.y - from.y) * t;
    const w = 9 - t * 6;
    buf.span(y, x - w, x + w, t > 0.5 ? mix(C.mud, C.near, 0.2) : C.mud);
  }
}

// --- Objetos (furni) -------------------------------------------------------------

/** Cafeto con cerezas maduras (rojas y amarillas) y alguna verde. Base en (w/2, h-2). */
export function coffeeBush(seed: number, scale = 1): PixelBuffer {
  const rnd = seeded(seed);
  const w = Math.round(34 * scale);
  const h = Math.round(40 * scale);
  const b = new PixelBuffer(w, h);
  const cx = w / 2;
  // Tronquito.
  b.rect(cx - 1, h - 7, 2, 5, C.woodDark);
  // Follaje en capas: del fondo oscuro al frente claro (luz desde la izquierda).
  for (let layer = 0; layer < 3; layer++) {
    const color = [C.leafDark, C.leaf, C.leafLight][layer];
    for (let k = 0; k < 16; k++) {
      const t = rnd();
      const y = h - 8 - t * (h - 12);
      const spread = (w / 2 - 3) * (0.45 + 0.55 * (1 - Math.abs(t - 0.45) * 1.4));
      const x = cx + (rnd() - 0.5 - (layer === 2 ? 0.25 : 0)) * spread * 1.6;
      b.ellipse(x, y, 3.2 * scale, 2.2 * scale, color);
    }
  }
  b.outline(C.leafOutline);
  // Cerezas en racimos pegados a las ramas.
  for (let k = 0; k < 16; k++) {
    const x = cx + (rnd() - 0.5) * (w - 12);
    const y = h - 10 - rnd() * (h - 18);
    if (!b.get(x, y) || b.get(x, y) === C.leafOutline) continue;
    const r = rnd();
    const col = r < 0.62 ? C.cherry : r < 0.8 ? C.cherryYellow : C.cherryGreen;
    b.px(x, y, col);
    b.px(x + 1, y, col);
    b.px(x, y + 1, r < 0.62 ? C.cherryDark : col);
  }
  return b;
}

/** Mata de plátano (el sombrío del cafetal). */
export function plantain(): PixelBuffer {
  const b = new PixelBuffer(64, 74);
  const baseX = 32;
  const baseY = 72;
  b.capsule(baseX, baseY, baseX + 1, baseY - 34, 3.5, 2.5, C.plantainTrunk, C.outline);
  const leaves: [number, number, number][] = [
    [-28, -46, 1],
    [-18, -66, 1],
    [6, -72, 0],
    [26, -58, 0],
    [30, -40, 0],
  ];
  for (const [dx, dy, lit] of leaves) {
    const sx = baseX + 1;
    const sy = baseY - 34;
    const ex = sx + dx;
    const ey = sy + dy * 0.55;
    const mx = (sx + ex) / 2;
    const my = Math.min(sy, ey) - 6;
    // Hoja larga: una cápsula por tramos siguiendo una curva.
    let px = sx;
    let py = sy;
    for (let t = 0.1; t <= 1.001; t += 0.1) {
      const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex;
      const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey;
      const r = 1 + Math.sin(t * Math.PI) * 4.2;
      b.capsule(px, py, x, y, r, r, lit ? C.plantain : C.plantainDark, C.leafOutline);
      px = x;
      py = y;
    }
    px = sx;
    py = sy;
    for (let t = 0.1; t <= 1.001; t += 0.1) {
      const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex;
      const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey;
      b.line(px, py, x, y, C.plantainRib);
      px = x;
      py = y;
    }
  }
  // Racimo de plátanos verdes.
  b.ellipse(baseX + 4, baseY - 30, 3, 4, hex("#9bc152"));
  b.px(baseX + 4, baseY - 25, hex("#6b3a4a"));
  return b;
}

/** Costal de fique. `fill` 1 = lleno a tope (con cerezas asomando); 0.5 = medio bulto amarrado. */
export function drawSack(buf: PixelBuffer, x: number, y: number, fill: number, lying = false) {
  const full = fill > 0.8;
  const rx = (lying ? 10 : 7.2) * (0.72 + fill * 0.3);
  const ry = (lying ? 5.8 : 8.6) * (0.7 + fill * 0.3);
  const cy = y - ry;
  buf.implicit(
    x - rx - 3,
    cy - ry - 5,
    x + rx + 3,
    y + 1,
    (px, py) => {
      const dx = (px - x) / rx;
      const dy = (py - cy) / ry;
      // Más ancho abajo: un costal lleno se asienta.
      const squash = lying ? 1 : 1 + Math.max(0, dy) * 0.12;
      if ((dx / squash) ** 2 + dy * dy <= 1) {
        if (dx < -0.45) return C.burlapLight;
        if (dx > 0.5 || dy > 0.6) return C.burlapDark;
        return (Math.floor(px) + Math.floor(py) * 2) % 5 === 0 ? C.burlapDark : C.burlap;
      }
      // Medio bulto: el cuello amarrado con cabuya.
      if (!lying && !full && Math.abs(px - x) < 2.2 && py < cy - ry + 3 && py > cy - ry - 3) return C.rope;
      return CLEAR;
    },
    C.outline,
  );
  if (full && !lying) {
    // Lleno a tope: la boca abierta con un montón de cereza que se desborda.
    const topY = cy - ry + 1.5;
    buf.implicit(
      x - 7,
      topY - 5,
      x + 7,
      topY + 2,
      (px, py) => {
        const dx = (px - x) / 6;
        const dy = (py - topY) / 4;
        if (dy > 0.4 || dx * dx + dy * dy > 1) return CLEAR;
        const k = (Math.floor(px) * 3 + Math.floor(py) * 5) % 7;
        return k === 0 ? C.cherryYellow : k === 1 ? C.cherryGreen : k < 4 ? C.cherryDark : C.cherry;
      },
      C.outline,
    );
    // Cerezas que ya se cayeron al piso.
    buf.px(x + 9, y - 1, C.cherry);
    buf.px(x + 11, y, C.cherryDark);
    buf.px(x - 10, y, C.cherry);
  }
  if (!full && !lying) {
    buf.px(x - 1, cy - ry - 2, C.rope);
    buf.px(x + 1, cy - ry - 3, C.rope);
  }
}

/** Canasto de recolección lleno de cereza. Base en (x, y). */
export function drawBasket(buf: PixelBuffer, x: number, y: number) {
  buf.shadow(x, y, 9, 2.5, C.shadow, 0.3);
  buf.implicit(
    x - 9,
    y - 14,
    x + 9,
    y + 1,
    (px, py) => {
      const t = (py - (y - 12)) / 12;
      if (t < 0 || t > 1) return CLEAR;
      const half = 7.5 - t * 1.8;
      if (Math.abs(px - x) > half) return CLEAR;
      if (py < y - 10.5) return C.wickerDark;
      const weave = (Math.floor(px) + Math.floor(py / 2)) % 2 === 0;
      return px - x > 3 ? C.wickerDark : weave ? C.wicker : hex("#b48644");
    },
    C.outline,
  );
  for (let k = -5; k <= 5; k += 2) {
    buf.px(x + k, y - 13, C.cherry);
    buf.px(x + k + 1, y - 12, k % 4 === 1 ? C.cherryYellow : C.cherryDark);
  }
}

/** Estaca de madera donde se amarra la mula. */
export function drawPost(buf: PixelBuffer, x: number, y: number) {
  buf.capsule(x, y, x, y - 20, 1.8, 1.6, C.wood, C.outline);
  buf.px(x - 1, y - 12, C.rope);
  buf.px(x, y - 12, C.rope);
  buf.px(x + 1, y - 11, C.rope);
}

export interface MuleState {
  /** Balanceo de la cola, en grados. */
  tail: number;
  /** 0..1, las orejas se mueven. */
  ear: number;
  /** px, la cabeza sube y baja. */
  nod: number;
  blink: boolean;
  /** El bulto que ya lleva encima (en la escena final). */
  loaded: boolean;
}

/**
 * Mula con enjalma, mirando hacia `f`. (x, y) es el piso bajo el centro del cuerpo.
 * Devuelve el punto sobre la enjalma donde se apoya un bulto.
 */
export function drawMule(buf: PixelBuffer, x: number, y: number, f: 1 | -1, s: MuleState) {
  const P = (dx: number, dy: number) => ({ x: x + dx * f, y: y + dy });
  const cap = (a: [number, number], b: [number, number], ra: number, rb: number, c: Color) => {
    const pa = P(a[0], a[1]);
    const pb = P(b[0], b[1]);
    buf.capsule(pa.x, pa.y, pb.x, pb.y, ra, rb, c, C.outline);
  };
  buf.shadow(x, y + 1, 20, 4, C.shadow, 0.3);

  // Patas del lado lejano, más oscuras.
  cap([-9, -13], [-10, -2], 2, 1.7, C.muleDark);
  cap([10, -13], [11, -2], 2, 1.7, C.muleDark);
  // Cola.
  const ta = (s.tail * Math.PI) / 180;
  const tailEnd: [number, number] = [-13 - Math.sin(ta) * 5, -8 + Math.abs(Math.sin(ta)) * 1.5];
  cap([-13, -20], tailEnd, 1.4, 1.1, C.mane);
  cap(tailEnd, [tailEnd[0] - Math.sin(ta) * 2, tailEnd[1] + 3], 2, 1.4, C.mane);
  // Cuerpo.
  cap([-10, -18], [9, -18], 6.6, 6.4, C.mule);
  // Patas del lado cercano.
  cap([-7, -13], [-7, -2], 2.2, 1.9, C.mule);
  cap([8, -13], [9, -2], 2.2, 1.9, C.mule);
  for (const hx of [-10, 11, -7, 9]) {
    const p = P(hx, -1);
    buf.rect(p.x - 1.5, p.y - 1, 3, 2, hex("#2d2019"));
  }
  // Panza en sombra.
  for (let dx = -8; dx <= 7; dx++) {
    const p = P(dx, -12.5);
    buf.px(p.x, p.y, C.muleDark);
  }
  // Cuello y cabeza.
  const nod = s.nod;
  cap([8, -20], [14, -28 + nod * 0.5], 4.2, 3.2, C.mule);
  cap([14, -30 + nod], [20, -24 + nod], 3.4, 2.4, C.mule);
  const muzzle = P(20, -24 + nod);
  buf.capsule(muzzle.x, muzzle.y, muzzle.x, muzzle.y, 2.4, 2.4, C.muleLight, C.outline);
  buf.px(muzzle.x + f, muzzle.y, hex("#2d2019"));
  const eye = P(15.5, -30 + nod);
  buf.px(eye.x, eye.y, s.blink ? C.muleDark : hex("#1a120d"));
  // Orejas largas de mula.
  const earA = P(13 - s.ear * 1.5, -38 + nod);
  const earB = P(15.5 + s.ear, -38.5 + nod);
  const earBase = P(14, -32 + nod);
  buf.capsule(earBase.x, earBase.y, earA.x, earA.y, 1.4, 0.9, C.muleDark, C.outline);
  buf.capsule(earBase.x + f, earBase.y, earB.x, earB.y, 1.4, 0.9, C.mule, C.outline);
  // Crin.
  for (let k = 0; k < 6; k++) {
    const p = P(9.5 + k, -24.5 - k * 1.2 + nod * (k / 6));
    buf.px(p.x, p.y, C.mane);
    buf.px(p.x - f, p.y, C.mane);
  }
  // Enjalma: manta roja con franjas amarillas, jáquima y cincha.
  const e0 = P(-7, -25);
  const e1 = P(7, -25);
  buf.implicit(
    Math.min(e0.x, e1.x) - 1,
    e0.y - 1,
    Math.max(e0.x, e1.x) + 1,
    y - 11,
    (px, py) => {
      const dx = (px - x) * f;
      const dy = py - y;
      if (dx < -7.5 || dx > 7.5 || dy < -25 || dy > -12) return CLEAR;
      if (dy < -22.5) return C.wood;
      if (Math.floor(dy) % 4 === 0) return C.blanketStripe;
      return dx > 3 ? hex("#a1252e") : C.blanket;
    },
    C.outline,
  );
  const girth = P(1, -12);
  buf.line(girth.x, girth.y, girth.x, girth.y - 11, C.rope);
  const halter = P(19, -26 + nod);
  buf.px(halter.x, halter.y, C.rope);
  buf.px(halter.x - f, halter.y - 1, C.rope);
  return { load: P(0, -25), halter: P(20, -23 + nod) };
}

/** Hoja de plátano grande en primer plano (encuadre de la esquina). */
export function foregroundLeaf(buf: PixelBuffer, x: number, y: number, dx: number, dy: number, color: Color) {
  let px = x;
  let py = y;
  for (let t = 0.1; t <= 1.001; t += 0.1) {
    const nx = x + dx * t;
    const ny = y + dy * t - Math.sin(t * Math.PI) * 10;
    const r = 1 + Math.sin(t * Math.PI) * 7;
    buf.capsule(px, py, nx, ny, r, r, color, C.leafOutline);
    px = nx;
    py = ny;
  }
  px = x;
  py = y;
  for (let t = 0.1; t <= 1.001; t += 0.1) {
    const nx = x + dx * t;
    const ny = y + dy * t - Math.sin(t * Math.PI) * 10;
    buf.line(px, py, nx, ny, C.plantainRib);
    px = nx;
    py = ny;
  }
}
