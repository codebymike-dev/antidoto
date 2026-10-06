// Geometría procedural de las piezas: cuerpo biselado y stud liso. Nada de modelos externos
// (ver docs/investigacion-construccion-3d.md, secciones 4.4 y 7.5). Sin bisel, el ladrillo
// parece de CAD; el radio va algo exagerado frente al real para que se lea en un celular.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { GAP, MM, PLATE_H, STUD_H, STUD_R } from "@/lib/bricks/units";

const BEVEL = 0.3 * MM;

/** Cuerpo de w x d studs y h placas, con el origen en la esquina mínima de su primera celda. */
export function bodyGeometry(w: number, d: number, h: number, segments = 2): THREE.BufferGeometry {
  const sx = w - 2 * GAP;
  const sy = h * PLATE_H;
  const sz = d - 2 * GAP;
  const geo = new RoundedBoxGeometry(sx, sy, sz, segments, BEVEL);
  geo.translate(sx / 2 + GAP, sy / 2, sz / 2 + GAP);
  return geo;
}

/**
 * Stud liso con canto redondeado, centrado en su celda (0,5 ; 0,5) y apoyado en y = 0.
 * Sin tapa inferior: siempre está sobre una cara superior.
 */
export function studGeometry(radialSegments = 16, arc = 3): THREE.BufferGeometry {
  const r = STUD_R;
  const b = 0.35 * MM;
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, STUD_H)];
  // Tapa plana hasta donde empieza el redondeo, luego un cuarto de círculo y la pared.
  for (let i = 0; i <= arc; i++) {
    const a = (i / arc) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - b + Math.sin(a) * b, STUD_H - b + Math.cos(a) * b));
  }
  pts.push(new THREE.Vector2(r, 0));
  const geo = new THREE.LatheGeometry(pts, radialSegments);
  geo.translate(0.5, 0, 0.5);
  return geo;
}
