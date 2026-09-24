// Piezas compartidas por las escenas: el avatar con capas, la señal de peligro sobre un
// riesgo encontrado, el destello de la pista, la onda del toque, la disolución entre
// momentos y la búsqueda de la zona tocada.

import { hex, type PixelBuffer } from "../pixel/buffer.ts";
import { drawAvatar, poseRig, type Look, type Pose, type Rig } from "../pixel/avatar.ts";
import type { Actor } from "../pixel/actor.ts";
import type { Zone } from "./types.ts";

/** drawAvatar con capas que reciben el rig (calculado antes, para saber dónde están las manos). */
export function drawAvatarLayers(
  out: PixelBuffer,
  pose: Pose,
  look: Look,
  a: Actor,
  layers: { back?: (r: Rig) => void; afterTorso?: (r: Rig) => void; held?: (r: Rig) => void; front?: (r: Rig) => void },
): Rig {
  const rig = poseRig(pose, a.x, a.y, a.facing);
  const withRig = (fn?: (r: Rig) => void) => (fn ? () => fn(rig) : undefined);
  drawAvatar(out, pose, look, a.x, a.y, a.facing, a.expr, {
    back: withRig(layers.back),
    afterTorso: withRig(layers.afterTorso),
    held: withRig(layers.held),
    front: withRig(layers.front),
  });
  return rig;
}

/** Señal de peligro amarilla sobre un riesgo ya encontrado. */
export function drawWarning(out: PixelBuffer, x: number, y: number) {
  const ink = hex("#2a1e17");
  const yellow = hex("#ffd23f");
  x = Math.round(x);
  y = Math.round(y);
  for (let row = 0; row < 8; row++) {
    const half = Math.floor(row * 0.6);
    out.span(y - 8 + row, x - half - 1, x + half + 1, ink);
    if (row > 0 && row < 7) out.span(y - 8 + row, x - half, x + half, yellow);
  }
  out.span(y - 1, x - 5, x + 5, ink);
  out.px(x, y - 6, ink);
  out.px(x, y - 5, ink);
  out.px(x, y - 4, ink);
  out.px(x, y - 2, ink);
}

export function drawSparkle(out: PixelBuffer, x: number, y: number, t: number) {
  const size = 2 + Math.round((Math.sin(t * 8) + 1) * 1.5);
  const c = hex("#fff6b0");
  for (let k = -size; k <= size; k++) {
    out.px(x + k, y, c);
    out.px(x, y + k, c);
  }
  out.px(x, y, hex("#ffffff"));
}

/** Tramado de Bayer 4x4: la escena se "apaga" en píxeles y vuelve a aparecer. */
export function drawDissolve(out: PixelBuffer, t: number) {
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const level = (t < 0.5 ? t * 2 : (1 - t) * 2) * 16;
  const ink = hex("#0f181d");
  for (let y = 0; y < out.h; y++) {
    for (let x = 0; x < out.w; x++) {
      if (bayer[(y % 4) * 4 + (x % 4)] < level) out.data[y * out.w + x] = ink;
    }
  }
}

/** Onda que sale donde se tocó la escena. */
export function drawRipples(out: PixelBuffer, ripples: { x: number; y: number; t: number }[]) {
  for (const r of ripples) {
    const rad = 2 + r.t * 8;
    for (let a = 0; a < 360; a += 20) {
      const x = r.x + Math.cos((a * Math.PI) / 180) * rad;
      const y = r.y + Math.sin((a * Math.PI) / 180) * rad * 0.7;
      out.px(x, y, r.t < 0.5 ? hex("#ffffff") : hex("#fff3a8"));
    }
  }
}

/** La zona más cercana al punto, con tolerancia extra para dedos en pantallas táctiles. */
export function nearestZone(zones: Zone[], x: number, y: number, tolerance = 2): Zone | null {
  let best: Zone | null = null;
  let bestScore = Infinity;
  for (const z of zones) {
    const d = Math.hypot(z.x - x, z.y - y);
    if (d > z.r + tolerance) continue;
    const score = d / z.r;
    if (score < bestScore) {
      bestScore = score;
      best = z;
    }
  }
  return best;
}
