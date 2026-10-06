// Convierte un modelo de ladrillos en pocos objetos de three: un BatchedMesh de cuerpos y un
// InstancedMesh de studs por acabado (ABS, metal, cristal). Así el modelo entero cuesta un
// puñado de draw calls sin importar cuántas piezas tenga. Los studs tapados por otra pieza no
// se instancian: en un modelo compacto eso elimina la mayoría.

import * as THREE from "three";
import type { LabModel } from "@/lib/bricks/lab-model";
import { BRICK_COLORS, type BrickFinish } from "@/lib/bricks/palette";
import { PLATE_H } from "@/lib/bricks/units";
import { bodyGeometry, studGeometry } from "../geometry";
import { absMaterial, metalMaterial, transMaterial, type Tier } from "../material";

// Los studs son la mayoría de los triángulos: su resolución es la palanca principal por nivel.
export const TIER_DETAIL: Record<Tier, { bevelSegments: number; studSegments: number; studArc: number }> = {
  bajo: { bevelSegments: 1, studSegments: 8, studArc: 1 },
  medio: { bevelSegments: 1, studSegments: 10, studArc: 1 },
  alto: { bevelSegments: 2, studSegments: 12, studArc: 2 },
  ultra: { bevelSegments: 2, studSegments: 20, studArc: 3 },
};

const BASE_COLOR = "#9AA3A8";

export interface BuiltModel {
  group: THREE.Group;
  /** Studs que se dibujan de verdad, después de descartar los tapados. */
  studs: number;
  dispose(): void;
}

const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

export function buildModel(model: LabModel, tier: Tier): BuiltModel {
  const { bevelSegments, studSegments, studArc } = TIER_DETAIL[tier];
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];

  const occupied = new Set<string>();
  for (const b of model.bricks)
    for (let i = 0; i < b.w; i++)
      for (let k = 0; k < b.d; k++) for (let j = 0; j < b.h; j++) occupied.add(cellKey(b.x + i, b.y + j, b.z + k));

  const geoCache = new Map<string, THREE.BufferGeometry>();
  const body = (w: number, d: number, h: number) => {
    const k = `${w}x${d}x${h}`;
    let g = geoCache.get(k);
    if (!g) {
      g = bodyGeometry(w, d, h, bevelSegments);
      geoCache.set(k, g);
      disposables.push(g);
    }
    return g;
  };
  const stud = studGeometry(studSegments, studArc);
  disposables.push(stud);

  // Variación de ±1,5 % de luminosidad por pieza: dos ladrillos iguales no son clones.
  let seed = 1;
  const jitter = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.03;

  const materials: Record<BrickFinish, THREE.Material> = {
    abs: absMaterial(tier),
    metal: metalMaterial(tier),
    trans: transMaterial(tier),
  };
  disposables.push(...Object.values(materials));

  type Stud = { x: number; y: number; z: number; color: THREE.Color };
  let studCount = 0;

  for (const finish of ["abs", "metal", "trans"] as const) {
    const bricks = model.bricks.filter((b) => BRICK_COLORS[b.color].finish === finish);
    const studs: Stud[] = [];
    if (finish === "abs") {
      // Los studs de la base van con el ABS.
      const c = new THREE.Color(BASE_COLOR);
      for (let x = 0; x < model.base; x++)
        for (let z = 0; z < model.base; z++) if (!occupied.has(cellKey(x, 0, z))) studs.push({ x, y: 0, z, color: c });
    }
    if (!bricks.length && !studs.length) continue;

    if (bricks.length) {
      const used = new Map<string, THREE.BufferGeometry>();
      for (const b of bricks) used.set(`${b.w}x${b.d}x${b.h}`, body(b.w, b.d, b.h));
      let verts = 0;
      let indices = 0;
      for (const g of used.values()) {
        verts += g.attributes.position.count;
        indices += g.index ? g.index.count : 0;
      }
      const batched = new THREE.BatchedMesh(bricks.length, verts, indices, materials[finish]);
      const ids = new Map<string, number>();
      for (const [k, g] of used) ids.set(k, batched.addGeometry(g));
      const m = new THREE.Matrix4();
      const color = new THREE.Color();
      for (const b of bricks) {
        const id = batched.addInstance(ids.get(`${b.w}x${b.d}x${b.h}`)!);
        batched.setMatrixAt(id, m.makeTranslation(b.x, b.y * PLATE_H, b.z));
        color.set(BRICK_COLORS[b.color].hex).offsetHSL(0, 0, jitter());
        batched.setColorAt(id, color);
        const top = b.y + b.h;
        for (let i = 0; i < b.w; i++)
          for (let k = 0; k < b.d; k++)
            if (!occupied.has(cellKey(b.x + i, top, b.z + k))) studs.push({ x: b.x + i, y: top, z: b.z + k, color: color.clone() });
      }
      batched.castShadow = finish !== "trans";
      batched.receiveShadow = true;
      if (finish === "trans") batched.sortObjects = true;
      group.add(batched);
      disposables.push(batched);
    }

    if (studs.length) {
      const inst = new THREE.InstancedMesh(stud, materials[finish], studs.length);
      const m = new THREE.Matrix4();
      studs.forEach((s, i) => {
        inst.setMatrixAt(i, m.makeTranslation(s.x, s.y * PLATE_H, s.z));
        inst.setColorAt(i, s.color);
      });
      inst.castShadow = finish !== "trans";
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      group.add(inst);
      disposables.push(inst);
      studCount += studs.length;
    }
  }

  // La base: una placa grande con la cara superior en y = 0.
  const baseGeo = bodyGeometry(model.base, model.base, 1, 1);
  const baseMat = absMaterial(tier === "bajo" ? "bajo" : "medio");
  (baseMat as THREE.MeshStandardMaterial).color.set(BASE_COLOR);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -PLATE_H;
  base.receiveShadow = true;
  group.add(base);
  disposables.push(baseGeo, baseMat);

  return {
    group,
    studs: studCount,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
