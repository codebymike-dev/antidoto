// Geometría de cada pieza del catálogo, sin rotar y con el origen en la esquina mínima de su
// caja (fase 4 de docs/plan-construccion-3d.md). Ladrillos, placas y tejas son cajas biseladas;
// las inclinadas, un perfil extruido; las redondas, un torneado; ventanas y puerta, un marco con
// el vidrio aparte para dibujarlo siempre translúcido. Todo indexado y con los mismos atributos
// (posición, normal, uv), que es lo que exige el BatchedMesh para mezclarlas.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { PartDef } from "@/lib/bricks/parts";
import { GAP, MM, PLATE_H } from "@/lib/bricks/units";
import { bodyGeometry } from "./geometry";

export interface PartMesh {
  body: THREE.BufferGeometry;
  /** Vidrio de ventanas y puertas: va en la capa translúcida. */
  glass?: THREE.BufferGeometry;
}

export interface GeometryDetail {
  bevel: number;
  radial: number;
}

const BEVEL = 0.3 * MM;

/** Caja biselada exacta (sin la holgura entre piezas) con su esquina mínima en (x, y, z). */
function boxAt(x: number, y: number, z: number, sx: number, sy: number, sz: number, segments: number) {
  const g = new RoundedBoxGeometry(sx, sy, sz, segments, Math.min(BEVEL, Math.min(sx, sy, sz) / 2.5));
  g.translate(x + sx / 2, y + sy / 2, z + sz / 2);
  return g;
}

/**
 * Inclinada de 45°: la fila del fondo (z de 0 a 1) es plana y lleva los studs; desde ahí la
 * rampa baja hasta un labio de una placa en el frente.
 */
function slope(p: PartDef, d: GeometryDetail): THREE.BufferGeometry {
  const H = p.h * PLATE_H;
  const lip = PLATE_H * 0.8;
  const b = BEVEL;
  const z0 = GAP + b;
  const z1 = p.d - GAP - b;
  const zTop = 1 - GAP;
  // La forma va en el plano (−z, y): al girarla 90° en y, su eje de extrusión queda en x.
  const shape = new THREE.Shape([
    new THREE.Vector2(-z0, b),
    new THREE.Vector2(-z1, b),
    new THREE.Vector2(-z1, lip - b),
    new THREE.Vector2(-zTop, H - b),
    new THREE.Vector2(-z0, H - b),
  ]);
  const depth = p.w - 2 * GAP - 2 * b;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: Math.max(1, d.bevel),
    curveSegments: 1,
    steps: 1,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(GAP + b, 0, 0);
  const indexed = mergeVertices(geo, 1e-5);
  geo.dispose();
  indexed.computeVertexNormals();
  return indexed;
}

/** Torneado con los cantos de arriba y abajo redondeados, centrado en su huella. */
function round(p: PartDef, d: GeometryDetail): THREE.BufferGeometry {
  const H = p.h * PLATE_H;
  const r = Math.min(p.w, p.d) / 2 - GAP;
  const b = BEVEL * 1.4;
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  const arc = 3;
  for (let i = 0; i <= arc; i++) {
    const a = (i / arc) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - b + Math.sin(a) * b, b - Math.cos(a) * b));
  }
  for (let i = 0; i <= arc; i++) {
    const a = (i / arc) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - b + Math.cos(a) * b, H - b + Math.sin(a) * b));
  }
  pts.push(new THREE.Vector2(0, H));
  const geo = new THREE.LatheGeometry(pts, Math.max(16, d.radial * 2));
  geo.translate(p.w / 2, 0, p.d / 2);
  return geo;
}

/**
 * Marco de ventana o puerta: dintel con studs arriba, alféizar abajo y dos jambas; el vidrio
 * llena el hueco. La puerta tiene además una hoja maciza abajo con su manija.
 */
function frame(p: PartDef, d: GeometryDetail, door: boolean): PartMesh {
  const W = p.w - 2 * GAP;
  const D = p.d - 2 * GAP;
  const H = p.h * PLATE_H;
  const post = door ? 0.3 : 0.2;
  const beam = door ? 0.45 : 0.32;
  const sill = door ? 0.12 : 0.32;
  const seg = Math.max(1, d.bevel);
  const x0 = GAP;
  const z0 = GAP;
  const parts: THREE.BufferGeometry[] = [
    boxAt(x0, H - beam, z0, W, beam, D, seg),
    boxAt(x0, 0, z0, W, sill, D, seg),
    boxAt(x0, sill, z0, post, H - beam - sill, D, seg),
    boxAt(x0 + W - post, sill, z0, post, H - beam - sill, D, seg),
  ];
  const openX = x0 + post;
  const openW = W - 2 * post;
  let glassBottom = sill;
  if (door) {
    // Hoja de la puerta: maciza hasta el 58 % del hueco, un poco hundida, con manija.
    const leafH = (H - beam - sill) * 0.58;
    const leafD = D * 0.45;
    parts.push(boxAt(openX + 0.02, sill, z0 + (D - leafD) / 2, openW - 0.04, leafH, leafD, seg));
    parts.push(boxAt(openX + openW - 0.45, sill + leafH * 0.48, z0 + (D - leafD) / 2 - 0.08, 0.16, 0.1, leafD + 0.16, seg));
    // Travesaño entre la hoja y el vidrio.
    parts.push(boxAt(openX, sill + leafH, z0, openW, 0.1, D, seg));
    glassBottom = sill + leafH + 0.1;
  }
  const body = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  const paneD = 0.06;
  const glass = new THREE.BoxGeometry(openW, H - beam - glassBottom, paneD);
  glass.translate(openX + openW / 2, glassBottom + (H - beam - glassBottom) / 2, z0 + D / 2);
  return { body, glass };
}

/**
 * El BatchedMesh exige que todas las geometrías tengan índice o que ninguna lo tenga; las cajas
 * biseladas de three vienen sin índice y las torneadas con él. Se indexa todo (menos vértices).
 */
function indexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (g.index) return g;
  const out = mergeVertices(g, 1e-5);
  g.dispose();
  return out;
}

const cache = new Map<string, PartMesh>();

/**
 * Geometría compartida de una pieza para un nivel de detalle. Es la misma para todas sus
 * instancias, así que se guarda; `disposePartGeometries` la libera al desmontar.
 */
export function partGeometry(p: PartDef, d: GeometryDetail): PartMesh {
  const key = `${p.id}:${d.bevel}:${d.radial}`;
  let m = cache.get(key);
  if (m) return m;
  switch (p.kind) {
    case "inclinada":
      m = { body: slope(p, d) };
      break;
    case "redonda":
      m = { body: round(p, d) };
      break;
    case "ventana":
      m = frame(p, d, p.name.startsWith("Puerta"));
      break;
    default:
      m = { body: bodyGeometry(p.w, p.d, p.h, d.bevel) };
  }
  m = { body: indexed(m.body), glass: m.glass ? indexed(m.glass) : undefined };
  cache.set(key, m);
  return m;
}

export function disposePartGeometries() {
  for (const m of cache.values()) {
    m.body.dispose();
    m.glass?.dispose();
  }
  cache.clear();
}

/** Matriz de dibujo de una pieza girada, con el mismo giro que usa el motor (rotation.ts). */
export function partMatrix(t: { angle: number; dx: number; dz: number }, x: number, y: number, z: number, out = new THREE.Matrix4()): THREE.Matrix4 {
  out.makeRotationY(t.angle);
  out.setPosition(x + t.dx, y, z + t.dz);
  return out;
}
